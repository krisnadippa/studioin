import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { GalleryService } from "@/lib/services/gallery-service";
import { googleDriveService } from "@/lib/services/google-drive";
import { db } from "@/lib/db/store";
import { Gallery } from "@/lib/db/types";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const gallery = await db.getGalleryById(id, user.userId);
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found or unauthorized" }, { status: 404 });
  }

  let photos = await db.getPhotosByGalleryId(id);
  let galleryData = gallery;

  // Auto-sync safeguard:
  if (photos.length === 0 && gallery.drive_folder_id && gallery.status !== "failed" && gallery.status !== "processing") {
    try {
      await GalleryService.processGalleryInBackground(id, gallery.drive_folder_id);
      photos = await db.getPhotosByGalleryId(id);
      const updatedGallery = await db.getGalleryById(id, user.userId);
      if (updatedGallery) {
        galleryData = updatedGallery;
      }
    } catch (syncErr) {
      console.warn(`[Admin AutoSync] Failed to sync gallery ${id}:`, syncErr);
    }
  }

  const selections = await db.getSelectionsByGalleryId(id);

  return NextResponse.json({
    gallery: galleryData,
    photos,
    selections,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const gallery = await db.getGalleryById(id, user.userId);
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found or unauthorized" }, { status: 404 });
  }
  
  const body = await request.json().catch(() => ({}));

  let updated;
  if (body.additional_days !== undefined) {
    const additionalDays = Number(body.additional_days) || 3;
    updated = await GalleryService.extendGallery(id, additionalDays);
  } else {
    const updates: Partial<Gallery> = {};

    if (body.client_name !== undefined && body.client_name.trim() !== "") {
      updates.client_name = body.client_name.trim();
    }
    if (body.event_name !== undefined && body.event_name.trim() !== "") {
      updates.event_name = body.event_name.trim();
    }
    if (body.event_date !== undefined && body.event_date.trim() !== "") {
      updates.event_date = body.event_date.trim();
    }

    let shouldResyncDrive = !!body.resync_drive;
    let targetFolderId = gallery.drive_folder_id;

    if (body.drive_folder_url !== undefined && body.drive_folder_url.trim() !== "") {
      const extractedId = googleDriveService.parseFolderId(body.drive_folder_url.trim());
      if (extractedId) {
        updates.drive_folder_id = extractedId;
        updates.drive_folder_url = body.drive_folder_url.trim();
        targetFolderId = extractedId;
        shouldResyncDrive = true;
      }
    }

    if (body.pin !== undefined) {
      if (body.pin.trim() !== "") {
        updates.pin_hash = await bcrypt.hash(body.pin.trim(), 10);
      } else if (body.remove_pin === true) {
        updates.pin_hash = null;
      }
    }

    if (body.max_selections !== undefined) {
      updates.max_selections = Number(body.max_selections) || 0;
    }
    if (body.allow_download !== undefined) {
      updates.allow_download = !!body.allow_download;
    }
    
    if (Object.keys(updates).length > 0) {
      updated = await db.updateGallery(id, updates);
    } else {
      updated = await db.getGalleryById(id, user.userId);
    }

    // If Google Drive link changed or resync explicitly requested, process photos
    if (shouldResyncDrive && targetFolderId) {
      try {
        await GalleryService.processGalleryInBackground(id, targetFolderId);
        updated = await db.getGalleryById(id, user.userId);
      } catch (err) {
        console.error("[Gallery Resync Error]", err);
      }
    }
  }

  if (!updated) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const freshPhotos = await db.getPhotosByGalleryId(id);

  return NextResponse.json({ success: true, gallery: updated, photos: freshPhotos });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const gallery = await db.getGalleryById(id, user.userId);
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found or unauthorized" }, { status: 404 });
  }
  
  const deleted = await GalleryService.deleteGallery(id);
  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete gallery" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
