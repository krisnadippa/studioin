import { Gallery, Photo, Selection, AdminUser } from "./types";
import bcrypt from "bcryptjs";

// Sample Photos Pool for realistic mock galleries
const samplePhotoBank = [
  {
    filename: "IMG_0012.JPG",
    thumb: "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0015.JPG",
    thumb: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0028.JPG",
    thumb: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0045.JPG",
    thumb: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0078.JPG",
    thumb: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0102.JPG",
    thumb: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0144.JPG",
    thumb: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0182.JPG",
    thumb: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0209.JPG",
    thumb: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0255.JPG",
    thumb: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0312.JPG",
    thumb: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1600&auto=format&fit=crop&q=85",
  },
  {
    filename: "IMG_0389.JPG",
    thumb: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&auto=format&fit=crop&q=80",
    preview: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1600&auto=format&fit=crop&q=85",
  },
];

class MemoryDatabase {
  private galleries: Map<string, Gallery> = new Map();
  private photos: Map<string, Photo[]> = new Map();
  private selections: Map<string, Selection[]> = new Map();
  private adminUser: AdminUser | null = null;

  constructor() {
    this.initDefaultData();
  }

  private async initDefaultData() {
    // Default admin: admin@studioin.com / admin123
    const passwordHash = bcrypt.hashSync("admin123", 10);
    this.adminUser = {
      id: "admin-01",
      email: "admin@studioin.com",
      name: "Studioin Photographer",
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    // 1. Gallery 1: Andi & Sinta (Wedding - Active, Ready)
    const now = new Date();
    const expires1 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const g1: Gallery = {
      id: "gal-andi-sinta",
      client_name: "Andi & Sinta",
      event_name: "Wedding Celebration",
      event_date: "2026-08-20",
      drive_folder_id: "1A2B3C4D5E6F7G8H9I0J",
      drive_folder_url: "https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J",
      access_token: "andi-sinta-w7k9",
      pin_hash: bcrypt.hashSync("8291", 10),
      pin_code: "8291",
      has_pin: true,
      status: "ready",
      total_photos: 3521,
      processed_photos: 3521,
      expires_at: expires1,
      preview_delete_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_selections: 15,
      allow_download: true,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generate photos for Andi & Sinta
    const photosG1: Photo[] = [];
    for (let i = 0; i < 48; i++) {
      const sample = samplePhotoBank[i % samplePhotoBank.length];
      const photoNum = String(i + 1).padStart(4, "0");
      photosG1.push({
        id: `p1-${i + 1}`,
        gallery_id: g1.id,
        drive_file_id: `drive-f1-${i + 1}`,
        filename: `IMG_${photoNum}.JPG`,
        mime_type: "image/jpeg",
        thumbnail_url: sample.thumb,
        preview_url: sample.preview,
        width: 6000,
        height: 4000,
        sort_order: i + 1,
        created_at: new Date().toISOString(),
      });
    }

    // 2. Gallery 2: Budi & Ayu (Prewedding - Active, Processing)
    const expires2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const g2: Gallery = {
      id: "gal-budi-ayu",
      client_name: "Budi & Ayu",
      event_name: "Prewedding Shoot",
      event_date: "2026-08-22",
      drive_folder_id: "2B3C4D5E6F7G8H9I0J1K",
      drive_folder_url: "https://drive.google.com/drive/folders/2B3C4D5E6F7G8H9I0J1K",
      access_token: "budi-ayu-p2m8",
      pin_hash: null,
      has_pin: false,
      status: "ready",
      total_photos: 2104,
      processed_photos: 2104,
      expires_at: expires2,
      preview_delete_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_selections: 0,
      allow_download: false,
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const photosG2: Photo[] = [];
    for (let i = 0; i < 36; i++) {
      const sample = samplePhotoBank[(i + 3) % samplePhotoBank.length];
      const photoNum = String(i + 1).padStart(4, "0");
      photosG2.push({
        id: `p2-${i + 1}`,
        gallery_id: g2.id,
        drive_file_id: `drive-f2-${i + 1}`,
        filename: `PRE_${photoNum}.JPG`,
        mime_type: "image/jpeg",
        thumbnail_url: sample.thumb,
        preview_url: sample.preview,
        width: 6000,
        height: 4000,
        sort_order: i + 1,
        created_at: new Date().toISOString(),
      });
    }

    // 3. Gallery 3: Komang & Putri (Graduation - Expired)
    const expiredDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const g3: Gallery = {
      id: "gal-komang-putri",
      client_name: "Komang & Putri",
      event_name: "Graduation Session",
      event_date: "2026-08-15",
      drive_folder_id: "3C4D5E6F7G8H9I0J1K2L",
      drive_folder_url: "https://drive.google.com/drive/folders/3C4D5E6F7G8H9I0J1K2L",
      access_token: "komang-putri-g9x1",
      pin_hash: null,
      has_pin: false,
      status: "expired",
      total_photos: 1822,
      processed_photos: 1822,
      expires_at: expiredDate,
      preview_delete_at: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      max_selections: 10,
      allow_download: true,
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const photosG3: Photo[] = [];
    for (let i = 0; i < 24; i++) {
      const sample = samplePhotoBank[(i + 5) % samplePhotoBank.length];
      const photoNum = String(i + 1).padStart(4, "0");
      photosG3.push({
        id: `p3-${i + 1}`,
        gallery_id: g3.id,
        drive_file_id: `drive-f3-${i + 1}`,
        filename: `GRAD_${photoNum}.JPG`,
        mime_type: "image/jpeg",
        thumbnail_url: sample.thumb,
        preview_url: sample.preview,
        width: 6000,
        height: 4000,
        sort_order: i + 1,
        created_at: new Date().toISOString(),
      });
    }

    // Sample selection for Andi & Sinta
    const s1: Selection = {
      id: "sel-andi-01",
      gallery_id: g1.id,
      client_name: "Andi & Sinta",
      client_email: "andi.sinta@example.com",
      client_notes: "Mohon diedit tone warm untuk album cetak utama.",
      submitted_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      status: "submitted",
      selected_photo_ids: ["p1-1", "p1-3", "p1-4", "p1-7", "p1-8", "p1-12", "p1-15", "p1-18", "p1-22", "p1-25"],
      created_at: new Date().toISOString(),
    };

    this.galleries.set(g1.id, g1);
    this.galleries.set(g2.id, g2);
    this.galleries.set(g3.id, g3);

    this.photos.set(g1.id, photosG1);
    this.photos.set(g2.id, photosG2);
    this.photos.set(g3.id, photosG3);

    this.selections.set(g1.id, [s1]);
  }

  // --- Admin User Methods ---
  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    if (this.adminUser && this.adminUser.email.toLowerCase() === email.toLowerCase()) {
      return this.adminUser;
    }
    return null;
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    if (this.adminUser && this.adminUser.id === id) {
      return this.adminUser;
    }
    return null;
  }

  // --- Gallery Methods ---
  async listGalleries(): Promise<Gallery[]> {
    // Check automatic status expiration
    const now = new Date().getTime();
    const list = Array.from(this.galleries.values());
    for (const g of list) {
      const expTime = new Date(g.expires_at).getTime();
      if (now > expTime && g.status === "ready") {
        g.status = "expired";
        g.updated_at = new Date().toISOString();
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getGalleryById(id: string): Promise<Gallery | null> {
    const gallery = this.galleries.get(id);
    if (!gallery) return null;

    const now = new Date().getTime();
    const expTime = new Date(gallery.expires_at).getTime();
    if (now > expTime && gallery.status === "ready") {
      gallery.status = "expired";
      gallery.updated_at = new Date().toISOString();
    }
    return gallery;
  }

  async getGalleryByToken(token: string): Promise<Gallery | null> {
    for (const g of this.galleries.values()) {
      if (g.access_token === token) {
        const now = new Date().getTime();
        const expTime = new Date(g.expires_at).getTime();
        if (now > expTime && g.status === "ready") {
          g.status = "expired";
          g.updated_at = new Date().toISOString();
        }
        return g;
      }
    }
    return null;
  }

  async createGallery(gallery: Gallery): Promise<Gallery> {
    this.galleries.set(gallery.id, gallery);
    if (!this.photos.has(gallery.id)) {
      this.photos.set(gallery.id, []);
    }
    return gallery;
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    const gallery = this.galleries.get(id);
    if (!gallery) return null;

    const updated: Gallery = {
      ...gallery,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.galleries.set(id, updated);
    return updated;
  }

  async deleteGallery(id: string): Promise<boolean> {
    const deleted = this.galleries.delete(id);
    this.photos.delete(id);
    this.selections.delete(id);
    return deleted;
  }

  // --- Photo Methods ---
  async getPhotosByGalleryId(galleryId: string): Promise<Photo[]> {
    return this.photos.get(galleryId) || [];
  }

  async addPhotos(galleryId: string, newPhotos: Photo[]): Promise<Photo[]> {
    const existing = this.photos.get(galleryId) || [];
    const combined = [...existing, ...newPhotos];
    this.photos.set(galleryId, combined);
    return combined;
  }

  // --- Selection Methods ---
  async getSelectionsByGalleryId(galleryId: string): Promise<Selection[]> {
    return this.selections.get(galleryId) || [];
  }

  async createSelection(selection: Selection): Promise<Selection> {
    const existing = this.selections.get(selection.gallery_id) || [];
    existing.push(selection);
    this.selections.set(selection.gallery_id, existing);
    return selection;
  }
}

// Global persistent instance for Next.js hot-reloading in dev
const globalForDb = globalThis as unknown as { dbInstance?: MemoryDatabase };
export const db = globalForDb.dbInstance ?? new MemoryDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = db;
