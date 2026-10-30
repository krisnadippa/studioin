import { Gallery, Photo, Selection, AdminUser, UserActivityStats } from "./types";
import bcrypt from "bcryptjs";
import { sql } from "./neon";

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

class NeonDatabase {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        if (!process.env.DATABASE_URL) {
          console.warn("DATABASE_URL env variable not set. Skipping DB initialization check.");
          return;
        }

        // 0. Ensure admin_users & photos tables have new columns (safe migration)
        try {
          await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'`;
          await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS gallery_limit INTEGER DEFAULT NULL`;
          await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE`;
          await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255) DEFAULT NULL`;
          await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image'`;
          await sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_stream_url TEXT DEFAULT NULL`;
        } catch (e) {
          console.warn("[NeonDatabase] Column migration warning (safe to ignore):", e);
        }

        // 1. Check/Insert Admin Users
        const admins = await sql`SELECT id FROM admin_users WHERE id = 'superadmin-01' LIMIT 1`;
        if (admins.length === 0) {
          const passwordHash0 = bcrypt.hashSync("superadmin123", 10);
          await sql`
            INSERT INTO admin_users (id, email, name, password_hash, role, gallery_limit, is_restricted, created_at)
            VALUES ('superadmin-01', 'superadmin@studioin.com', 'Super Admin', ${passwordHash0}, 'superadmin', NULL, FALSE, ${new Date().toISOString()})
            ON CONFLICT (id) DO NOTHING
          `;
          console.log("[NeonDatabase] Super admin user initialized.");
        }

        const admin1check = await sql`SELECT id FROM admin_users WHERE id = 'admin-01' LIMIT 1`;
        if (admin1check.length === 0) {
          const passwordHash1 = bcrypt.hashSync("admin123", 10);
          await sql`
            INSERT INTO admin_users (id, email, name, password_hash, role, gallery_limit, is_restricted, created_at)
            VALUES ('admin-01', 'admin@studioin.com', 'Studioin Photographer', ${passwordHash1}, 'admin', NULL, FALSE, ${new Date().toISOString()})
            ON CONFLICT (id) DO NOTHING
          `;
          console.log("[NeonDatabase] Default admin user initialized.");
        }

        const admin2 = await sql`SELECT id FROM admin_users WHERE id = 'admin-02' LIMIT 1`;
        if (admin2.length === 0) {
          const passwordHash2 = bcrypt.hashSync("admin123", 10);
          await sql`
            INSERT INTO admin_users (id, email, name, password_hash, role, gallery_limit, is_restricted, created_at)
            VALUES ('admin-02', 'admin2@studioin.com', 'Admin Studioin 2', ${passwordHash2}, 'admin', NULL, FALSE, ${new Date().toISOString()})
            ON CONFLICT (id) DO NOTHING
          `;
          console.log("[NeonDatabase] Admin user 2 initialized.");
        }

        const admin3 = await sql`SELECT id FROM admin_users WHERE id = 'admin-03' LIMIT 1`;
        if (admin3.length === 0) {
          const passwordHash3 = bcrypt.hashSync("admin123", 10);
          await sql`
            INSERT INTO admin_users (id, email, name, password_hash, role, gallery_limit, is_restricted, created_at)
            VALUES ('admin-03', 'admin3@studioin.com', 'Admin Studioin 3', ${passwordHash3}, 'admin', NULL, FALSE, ${new Date().toISOString()})
            ON CONFLICT (id) DO NOTHING
          `;
          console.log("[NeonDatabase] Admin user 3 initialized.");
        }

        // 2. Check/Insert Sample Galleries
        const galleries = await sql`SELECT id FROM galleries LIMIT 1`;
        if (galleries.length === 0) {
          console.log("[NeonDatabase] Galleries table empty. Inserting sample data...");
          
          // Set initialized to true during seeding to prevent recursive calls
          this.initialized = true;

          // Initialize default sample data
          const now = new Date();
          const expires1 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
          const previewDelete1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          const g1: Gallery = {
            id: "gal-andi-sinta",
            admin_id: "admin-01",
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
            total_photos: 48,
            processed_photos: 48,
            expires_at: expires1,
            preview_delete_at: previewDelete1,
            max_selections: 15,
            allow_download: true,
            created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };

          const expires2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
          const previewDelete2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const g2: Gallery = {
            id: "gal-budi-ayu",
            admin_id: "admin-01",
            client_name: "Budi & Ayu",
            event_name: "Prewedding Shoot",
            event_date: "2026-08-22",
            drive_folder_id: "2B3C4D5E6F7G8H9I0J1K",
            drive_folder_url: "https://drive.google.com/drive/folders/2B3C4D5E6F7G8H9I0J1K",
            access_token: "budi-ayu-p2m8",
            pin_hash: null,
            pin_code: null,
            has_pin: false,
            status: "ready",
            total_photos: 36,
            processed_photos: 36,
            expires_at: expires2,
            preview_delete_at: previewDelete2,
            max_selections: 0,
            allow_download: false,
            created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };

          const expiredDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
          const previewDelete3 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
          const g3: Gallery = {
            id: "gal-komang-putri",
            admin_id: "admin-01",
            client_name: "Komang & Putri",
            event_name: "Graduation Session",
            event_date: "2026-08-15",
            drive_folder_id: "3C4D5E6F7G8H9I0J1K2L",
            drive_folder_url: "https://drive.google.com/drive/folders/3C4D5E6F7G8H9I0J1K2L",
            access_token: "komang-putri-g9x1",
            pin_hash: null,
            pin_code: null,
            has_pin: false,
            status: "expired",
            total_photos: 24,
            processed_photos: 24,
            expires_at: expiredDate,
            preview_delete_at: previewDelete3,
            max_selections: 10,
            allow_download: true,
            created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Insert galleries
          await this.createGallery(g1);
          await this.createGallery(g2);
          await this.createGallery(g3);

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
          await this.addPhotos(g1.id, photosG1);

          // Generate photos for Budi & Ayu
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
          await this.addPhotos(g2.id, photosG2);

          // Generate photos for Komang & Putri
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
          await this.addPhotos(g3.id, photosG3);

          // Insert sample selection for Andi & Sinta
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
          await this.createSelection(s1);
          console.log("[NeonDatabase] Sample data initialized successfully.");
        }

        this.initialized = true;
      } catch (err) {
        this.initialized = false;
        console.error("[NeonDatabase] Database initialization error:", err);
      } finally {
        this.initPromise = null;
      }
    })();

    await this.initPromise;
  }

  // --- Admin User Methods ---
  private normalizeAdminUser(row: Record<string, unknown>): AdminUser {
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      password_hash: row.password_hash as string,
      role: (row.role as string) === "superadmin" ? "superadmin" : "admin",
      gallery_limit: row.gallery_limit != null ? Number(row.gallery_limit) : null,
      is_restricted: Boolean(row.is_restricted),
      created_at: row.created_at as string,
    };
  }

  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT * FROM admin_users 
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return this.normalizeAdminUser(rows[0] as Record<string, unknown>);
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT * FROM admin_users 
      WHERE id = ${id}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return this.normalizeAdminUser(rows[0] as Record<string, unknown>);
  }

  async adminEmailExists(email: string): Promise<boolean> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT id FROM admin_users
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async createAdminUser(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: "superadmin" | "admin";
    gallery_limit?: number | null;
  }): Promise<AdminUser> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const role = data.role ?? "admin";
    const galleryLimit = data.gallery_limit !== undefined ? data.gallery_limit : null;
    await sql`
      INSERT INTO admin_users (id, email, name, password_hash, role, gallery_limit, is_restricted, created_at)
      VALUES (${data.id}, ${data.email.trim().toLowerCase()}, ${data.name.trim()}, ${data.passwordHash}, ${role}, ${galleryLimit}, FALSE, ${now})
    `;
    return {
      id: data.id,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      password_hash: data.passwordHash,
      role,
      gallery_limit: galleryLimit,
      is_restricted: false,
      created_at: now,
    };
  }

  // --- SuperAdmin Methods ---
  async listAllAdminUsers(): Promise<AdminUser[]> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT * FROM admin_users
      ORDER BY created_at ASC
    `;
    return (rows as Record<string, unknown>[]).map((r) => this.normalizeAdminUser(r));
  }

  async updateAdminRestriction(id: string, data: {
    is_restricted?: boolean;
    gallery_limit?: number | null;
    role?: "superadmin" | "admin";
  }): Promise<AdminUser | null> {
    await this.ensureInitialized();
    const current = await this.getAdminById(id);
    if (!current) return null;

    const isRestricted = data.is_restricted !== undefined ? data.is_restricted : current.is_restricted;
    const galleryLimit = data.gallery_limit !== undefined ? data.gallery_limit : current.gallery_limit;
    const role = data.role ?? current.role;

    await sql`
      UPDATE admin_users
      SET is_restricted = ${isRestricted}, gallery_limit = ${galleryLimit}, role = ${role}
      WHERE id = ${id}
    `;

    return { ...current, is_restricted: isRestricted, gallery_limit: galleryLimit, role };
  }

  async getAllUsersActivity(): Promise<UserActivityStats[]> {
    await this.ensureInitialized();
    const users = await this.listAllAdminUsers();
    const results: UserActivityStats[] = [];

    for (const user of users) {
      const galleries = await sql`
        SELECT id, status, created_at FROM galleries WHERE admin_id = ${user.id} ORDER BY created_at DESC
      `;
      const activeGalleries = (galleries as { status: string }[]).filter(
        (g) => g.status === "ready" || g.status === "processing" || g.status === "preparing"
      );
      const expiredGalleries = (galleries as { status: string }[]).filter(
        (g) => g.status === "expired"
      );

      let totalSelections = 0;
      for (const g of galleries as { id: string }[]) {
        const sels = await sql`SELECT COUNT(*) as count FROM selections WHERE gallery_id = ${g.id}`;
        totalSelections += Number((sels[0] as { count: number }).count) || 0;
      }

      const lastActivity = galleries.length > 0
        ? (galleries[0] as { created_at: string }).created_at
        : null;

      results.push({
        user,
        total_galleries: galleries.length,
        active_galleries: activeGalleries.length,
        expired_galleries: expiredGalleries.length,
        total_selections: totalSelections,
        last_activity: lastActivity,
      });
    }

    return results;
  }

  // --- Gallery Methods ---
  async listGalleries(adminId?: string): Promise<Gallery[]> {
    await this.ensureInitialized();
    const nowStr = new Date().toISOString();
    
    // Auto expire ready galleries where expires_at has passed
    if (adminId) {
      await sql`
        UPDATE galleries 
        SET status = 'expired', updated_at = ${nowStr}
        WHERE status = 'ready' AND expires_at < ${nowStr} AND admin_id = ${adminId}
      `;
    } else {
      await sql`
        UPDATE galleries 
        SET status = 'expired', updated_at = ${nowStr}
        WHERE status = 'ready' AND expires_at < ${nowStr}
      `;
    }

    const rows = adminId
      ? await sql`
          SELECT * FROM galleries 
          WHERE admin_id = ${adminId}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT * FROM galleries 
          ORDER BY created_at DESC
        `;
    return rows as Gallery[];
  }

  async getGalleryById(id: string, adminId?: string): Promise<Gallery | null> {
    await this.ensureInitialized();
    const nowStr = new Date().toISOString();

    // Auto expire if ready and expires_at has passed
    if (adminId) {
      await sql`
        UPDATE galleries 
        SET status = 'expired', updated_at = ${nowStr}
        WHERE id = ${id} AND status = 'ready' AND expires_at < ${nowStr} AND admin_id = ${adminId}
      `;
    } else {
      await sql`
        UPDATE galleries 
        SET status = 'expired', updated_at = ${nowStr}
        WHERE id = ${id} AND status = 'ready' AND expires_at < ${nowStr}
      `;
    }

    const rows = adminId
      ? await sql`
          SELECT * FROM galleries 
          WHERE id = ${id} AND admin_id = ${adminId}
          LIMIT 1
        `
      : await sql`
          SELECT * FROM galleries 
          WHERE id = ${id}
          LIMIT 1
        `;
    if (rows.length === 0) return null;
    return rows[0] as Gallery;
  }

  async getGalleryByToken(token: string): Promise<Gallery | null> {
    await this.ensureInitialized();
    const nowStr = new Date().toISOString();

    // Auto expire if ready and expires_at has passed
    await sql`
      UPDATE galleries 
      SET status = 'expired', updated_at = ${nowStr}
      WHERE access_token = ${token} AND status = 'ready' AND expires_at < ${nowStr}
    `;

    const rows = await sql`
      SELECT * FROM galleries 
      WHERE access_token = ${token}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return rows[0] as Gallery;
  }

  async createGallery(gallery: Gallery): Promise<Gallery> {
    await this.ensureInitialized();
    await sql`
      INSERT INTO galleries (
        id, admin_id, client_name, event_name, event_date, drive_folder_id, drive_folder_url,
        access_token, pin_hash, pin_code, has_pin, status, total_photos,
        processed_photos, error_message, expires_at, preview_delete_at,
        max_selections, allow_download, created_at, updated_at
      ) VALUES (
        ${gallery.id}, ${gallery.admin_id || null}, ${gallery.client_name}, ${gallery.event_name}, ${gallery.event_date},
        ${gallery.drive_folder_id}, ${gallery.drive_folder_url}, ${gallery.access_token},
        ${gallery.pin_hash}, ${gallery.pin_code || null}, ${gallery.has_pin}, ${gallery.status},
        ${gallery.total_photos}, ${gallery.processed_photos}, ${gallery.error_message || null},
        ${gallery.expires_at}, ${gallery.preview_delete_at}, ${gallery.max_selections},
        ${gallery.allow_download}, ${gallery.created_at}, ${gallery.updated_at}
      )
    `;
    return gallery;
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    await this.ensureInitialized();
    const gallery = await this.getGalleryById(id);
    if (!gallery) return null;

    const updated = {
      ...gallery,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await sql`
      UPDATE galleries
      SET 
        client_name = ${updated.client_name},
        event_name = ${updated.event_name},
        event_date = ${updated.event_date},
        drive_folder_id = ${updated.drive_folder_id},
        drive_folder_url = ${updated.drive_folder_url},
        access_token = ${updated.access_token},
        pin_hash = ${updated.pin_hash},
        pin_code = ${updated.pin_code || null},
        has_pin = ${updated.has_pin},
        status = ${updated.status},
        total_photos = ${updated.total_photos},
        processed_photos = ${updated.processed_photos},
        error_message = ${updated.error_message || null},
        expires_at = ${updated.expires_at},
        preview_delete_at = ${updated.preview_delete_at},
        max_selections = ${updated.max_selections},
        allow_download = ${updated.allow_download},
        admin_id = ${updated.admin_id || null},
        updated_at = ${updated.updated_at}
      WHERE id = ${id}
    `;

    return updated;
  }

  async deleteGallery(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await sql`
      DELETE FROM galleries
      WHERE id = ${id}
    `;
    return true;
  }

  async getPhotosByGalleryId(galleryId: string): Promise<Photo[]> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT * FROM photos
      WHERE gallery_id = ${galleryId}
      ORDER BY sort_order ASC
    `;
    return (rows as Photo[]).map((p) => {
      const thumb = p.drive_file_id
        ? `https://drive.google.com/thumbnail?id=${p.drive_file_id}&sz=w800`
        : (p.thumbnail_url || `/api/photo/${p.id}`);
      const prev = p.drive_file_id
        ? `https://drive.google.com/thumbnail?id=${p.drive_file_id}&sz=w2048`
        : (p.preview_url || thumb || `/api/photo/${p.id}`);

      return {
        ...p,
        folder_name: p.folder_name || null,
        media_type: (p.media_type as "image" | "video") || "image",
        video_stream_url: p.video_stream_url || (p.media_type === "video" && p.drive_file_id ? `https://drive.google.com/file/d/${p.drive_file_id}/preview` : null),
        thumbnail_url: thumb,
        preview_url: prev,
      };
    });
  }

  async getPhotoById(photoId: string): Promise<Photo | null> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT * FROM photos
      WHERE id = ${photoId}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return rows[0] as Photo;
  }

  async addPhotos(galleryId: string, newPhotos: Photo[]): Promise<Photo[]> {
    await this.ensureInitialized();
    if (newPhotos.length === 0) return this.getPhotosByGalleryId(galleryId);

    const chunkSize = 100;
    for (let i = 0; i < newPhotos.length; i += chunkSize) {
      const chunk = newPhotos.slice(i, i + chunkSize);
      
      const valPlaceholders: string[] = [];
      const queryParams: any[] = [];
      
      let paramIdx = 1;
      for (const photo of chunk) {
        valPlaceholders.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7}, $${paramIdx+8}, $${paramIdx+9}, $${paramIdx+10}, $${paramIdx+11}, $${paramIdx+12}, $${paramIdx+13})`);
        queryParams.push(
          photo.id,
          photo.gallery_id,
          photo.drive_file_id,
          photo.filename,
          photo.mime_type,
          photo.thumbnail_url,
          photo.preview_url,
          photo.width || null,
          photo.height || null,
          photo.sort_order,
          photo.created_at,
          photo.folder_name || null,
          photo.media_type || "image",
          photo.video_stream_url || null
        );
        paramIdx += 14;
      }
      
      const queryStr = `
        INSERT INTO photos (
          id, gallery_id, drive_file_id, filename, mime_type, 
          thumbnail_url, preview_url, width, height, sort_order, created_at,
          folder_name, media_type, video_stream_url
        ) VALUES ${valPlaceholders.join(', ')}
        ON CONFLICT (id) DO NOTHING
      `;
      
      await sql.query(queryStr, queryParams);
    }

    return this.getPhotosByGalleryId(galleryId);
  }

  async replacePhotos(galleryId: string, newPhotos: Photo[]): Promise<Photo[]> {
    await this.ensureInitialized();
    await sql`
      DELETE FROM photos
      WHERE gallery_id = ${galleryId}
    `;
    return this.addPhotos(galleryId, newPhotos);
  }

  // --- Selection Methods ---
  async getSelectionsByGalleryId(galleryId: string): Promise<Selection[]> {
    await this.ensureInitialized();
    const rows = await sql`
      SELECT * FROM selections
      WHERE gallery_id = ${galleryId}
      ORDER BY created_at DESC
    `;
    return rows.map((row: any) => ({
      id: row.id,
      gallery_id: row.gallery_id,
      client_name: row.client_name,
      client_email: row.client_email || undefined,
      client_notes: row.client_notes || undefined,
      submitted_at: row.submitted_at,
      status: row.status,
      selected_photo_ids: typeof row.selected_photo_ids === 'string' 
        ? JSON.parse(row.selected_photo_ids) 
        : row.selected_photo_ids,
      created_at: row.created_at,
    })) as Selection[];
  }

  async createSelection(selection: Selection): Promise<Selection> {
    await this.ensureInitialized();
    const selectedPhotoIdsJson = JSON.stringify(selection.selected_photo_ids);
    
    try {
      await sql`
        INSERT INTO selections (
          id, gallery_id, client_name, client_email, client_notes,
          submitted_at, status, selected_photo_ids, created_at
        ) VALUES (
          ${selection.id}, ${selection.gallery_id}, ${selection.client_name},
          ${selection.client_email || null}, ${selection.client_notes || null},
          ${selection.submitted_at}, ${selection.status}, ${selectedPhotoIdsJson}::jsonb,
          ${selection.created_at}
        )
      `;
    } catch {
      await sql`
        INSERT INTO selections (
          id, gallery_id, client_name, client_email, client_notes,
          submitted_at, status, selected_photo_ids, created_at
        ) VALUES (
          ${selection.id}, ${selection.gallery_id}, ${selection.client_name},
          ${selection.client_email || null}, ${selection.client_notes || null},
          ${selection.submitted_at}, ${selection.status}, ${selectedPhotoIdsJson},
          ${selection.created_at}
        )
      `;
    }
    return selection;
  }

  async updateSelectionsByGalleryId(
    galleryId: string,
    selectedPhotoIds: string[],
    clientInfo?: { client_name?: string; client_email?: string; client_notes?: string }
  ): Promise<Selection> {
    await this.ensureInitialized();
    const existing = await this.getSelectionsByGalleryId(galleryId);
    const selectedPhotoIdsJson = JSON.stringify(selectedPhotoIds);
    const nowStr = new Date().toISOString();

    if (existing.length > 0) {
      const target = existing[0];
      const updatedClientName = clientInfo?.client_name || target.client_name;
      const updatedEmail = clientInfo?.client_email !== undefined ? clientInfo.client_email : target.client_email;
      const updatedNotes = clientInfo?.client_notes !== undefined ? clientInfo.client_notes : target.client_notes;

      try {
        await sql`
          UPDATE selections
          SET
            client_name = ${updatedClientName},
            client_email = ${updatedEmail || null},
            client_notes = ${updatedNotes || null},
            submitted_at = ${nowStr},
            selected_photo_ids = ${selectedPhotoIdsJson}::jsonb
          WHERE id = ${target.id}
        `;
      } catch {
        await sql`
          UPDATE selections
          SET
            client_name = ${updatedClientName},
            client_email = ${updatedEmail || null},
            client_notes = ${updatedNotes || null},
            submitted_at = ${nowStr},
            selected_photo_ids = ${selectedPhotoIdsJson}
          WHERE id = ${target.id}
        `;
      }

      return {
        ...target,
        client_name: updatedClientName,
        client_email: updatedEmail,
        client_notes: updatedNotes,
        submitted_at: nowStr,
        selected_photo_ids: selectedPhotoIds,
      };
    } else {
      const gallery = await this.getGalleryById(galleryId);
      const newSelection: Selection = {
        id: `sel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gallery_id: galleryId,
        client_name: clientInfo?.client_name || gallery?.client_name || "Client",
        client_email: clientInfo?.client_email,
        client_notes: clientInfo?.client_notes,
        submitted_at: nowStr,
        status: "submitted",
        selected_photo_ids: selectedPhotoIds,
        created_at: nowStr,
      };
      return this.createSelection(newSelection);
    }
  }
}

// Global persistent instance for Next.js hot-reloading in dev
const globalForDb = globalThis as unknown as { dbInstance?: NeonDatabase };
export const db = globalForDb.dbInstance ?? new NeonDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = db;
