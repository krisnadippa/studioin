import { db } from "../db/store";
import { Gallery, Photo } from "../db/types";
import { googleDriveService } from "./google-drive";
import { storageService } from "./storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface CreateGalleryInput {
  admin_id: string;
  client_name: string;
  event_name: string;
  event_date: string;
  drive_folder_url: string;
  expiration_days?: number; // default 3
  pin?: string; // optional 4-6 digit PIN
  max_selections?: number; // default 0 (unlimited)
  allow_download?: boolean; // default false
}

export class GalleryService {
  /**
   * Generates a cryptographically secure random alphanumeric token (e.g., 'a8F3kLm92X')
   */
  static generateSecureToken(length: number = 10): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = crypto.randomBytes(length);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  static async createGallery(input: CreateGalleryInput): Promise<Gallery> {
    const folderId = googleDriveService.parseFolderId(input.drive_folder_url);
    if (!folderId) {
      throw new Error("Link folder Google Drive tidak valid. Pastikan link berformat URL folder Google Drive yang benar (contoh: https://drive.google.com/drive/folders/xxxxx).");
    }

    const now = new Date();
    const expirationDays = input.expiration_days && input.expiration_days > 0 ? input.expiration_days : 3;
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString();
    const previewDeleteAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const pinHash = input.pin && input.pin.trim() ? await bcrypt.hash(input.pin.trim(), 10) : null;
    const clientSlug = input.client_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    const randomSuffix = this.generateSecureToken(4).toLowerCase();
    const accessToken = clientSlug ? `${clientSlug}-${randomSuffix}` : this.generateSecureToken(10);
    const galleryId = `gal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newGallery: Gallery = {
      id: galleryId,
      admin_id: input.admin_id,
      client_name: input.client_name.trim(),
      event_name: input.event_name.trim(),
      event_date: input.event_date || now.toISOString().split("T")[0],
      drive_folder_id: folderId,
      drive_folder_url: input.drive_folder_url.trim(),
      access_token: accessToken,
      pin_hash: pinHash,
      pin_code: input.pin ? input.pin.trim() : null,
      has_pin: !!pinHash,
      status: "preparing",
      total_photos: 0,
      processed_photos: 0,
      expires_at: expiresAt,
      preview_delete_at: previewDeleteAt,
      max_selections: input.max_selections !== undefined ? input.max_selections : 0,
      allow_download: !!input.allow_download,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    await db.createGallery(newGallery);

    // Automatically synchronize photos from Google Drive directly before returning
    try {
      await this.processGalleryInBackground(newGallery.id, folderId);
    } catch (err) {
      console.error(`[GalleryService] Initial Drive sync failed for ${newGallery.id}:`, err);
      // Clean up failed gallery record so user can fix Google Drive settings and retry
      await db.deleteGallery(newGallery.id);
      throw err;
    }

    const readyGallery = await db.getGalleryById(newGallery.id);
    return readyGallery || newGallery;
  }

  /**
   * Reads Google Drive metadata directly, generates photo records with high-speed CDN URLs,
   * and transitions gallery status to ready.
   */
  static async processGalleryInBackground(galleryId: string, driveFolderId: string): Promise<Photo[]> {
    try {
      await db.updateGallery(galleryId, { status: "processing", processed_photos: 0 });

      // Fetch files metadata from Drive
      const driveFiles = await googleDriveService.listFiles(driveFolderId, 1000);
      if (driveFiles.length === 0) {
        throw new Error(
          "Folder Google Drive berhasil diakses, namun tidak ditemukan file foto/gambar di dalamnya. Pastikan folder berisi foto berformat JPG, PNG, atau WEBP."
        );
      }
      const total = driveFiles.length;

      const photos: Photo[] = [];
      for (let i = 0; i < driveFiles.length; i++) {
        const file = driveFiles[i];
        const photoId = `photo-${galleryId}-${i + 1}`;

        // Direct high-quality Google Drive CDN thumbnail (~800px) and preview (~2048px)
        const thumbUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`;
        const previewUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w2048`;

        photos.push({
          id: photoId,
          gallery_id: galleryId,
          drive_file_id: file.id,
          filename: file.name,
          mime_type: file.mimeType,
          thumbnail_url: thumbUrl,
          preview_url: previewUrl,
          width: file.width || 6000,
          height: file.height || 4000,
          sort_order: i + 1,
          created_at: new Date().toISOString(),
        });
      }

      await db.replacePhotos(galleryId, photos);

      await db.updateGallery(galleryId, {
        status: "ready",
        total_photos: total,
        processed_photos: total,
        error_message: undefined,
      });

      return photos;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memproses folder Google Drive";
      await db.updateGallery(galleryId, {
        status: "failed",
        error_message: errorMessage,
      });
      throw err;
    }
  }

  static async verifyPin(gallery: Gallery, pin: string): Promise<boolean> {
    if (!gallery.pin_hash) return true; // No PIN required
    if (!pin) return false;
    return bcrypt.compare(pin.trim(), gallery.pin_hash);
  }

  static async extendGallery(id: string, additionalDays: number = 3): Promise<Gallery | null> {
    const gallery = await db.getGalleryById(id);
    if (!gallery) return null;

    const currentExp = new Date(gallery.expires_at).getTime();
    const now = Date.now();
    const baseTime = currentExp > now ? currentExp : now;
    const newExpiresAt = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000).toISOString();
    const newPreviewDeleteAt = new Date(baseTime + (additionalDays + 7) * 24 * 60 * 60 * 1000).toISOString();

    return db.updateGallery(id, {
      expires_at: newExpiresAt,
      preview_delete_at: newPreviewDeleteAt,
      status: gallery.status === "expired" ? "ready" : gallery.status,
    });
  }

  static async deleteGallery(id: string): Promise<boolean> {
    await storageService.deleteGalleryAssets(id);
    return db.deleteGallery(id);
  }
}
