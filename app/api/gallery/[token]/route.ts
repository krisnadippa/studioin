import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { GalleryService } from "@/lib/services/gallery-service";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const gallery = await db.getGalleryByToken(token);

  if (!gallery) {
    return NextResponse.json({ error: "Galeri foto tidak ditemukan. Silakan periksa kembali tautan link Anda atau hubungi fotografer." }, { status: 404 });
  }

  // Check if gallery is expired
  const now = Date.now();
  const expTime = new Date(gallery.expires_at).getTime();
  const isExpired = gallery.status === "expired" || now > expTime;

  if (isExpired) {
    return NextResponse.json({
      expired: true,
      gallery: {
        client_name: gallery.client_name,
        event_name: gallery.event_name,
        event_date: gallery.event_date,
        expires_at: gallery.expires_at,
        status: "expired",
      },
    });
  }

  // If PIN is required, verify client PIN cookie
  if (gallery.has_pin) {
    const cookieStore = await cookies();
    const pinAuth = cookieStore.get(`pin_auth_${gallery.id}`)?.value;
    if (pinAuth !== "verified") {
      return NextResponse.json({
        requires_pin: true,
        gallery: {
          client_name: gallery.client_name,
          event_name: gallery.event_name,
          event_date: gallery.event_date,
          has_pin: true,
        },
      });
    }
  }

  // Fetch photos & selections
  let photos = await db.getPhotosByGalleryId(gallery.id);

  // Auto-sync safeguard:
  // If gallery has 0 photos in DB, but has drive_folder_id, automatically sync once so customer never sees empty gallery!
  if (photos.length === 0 && gallery.drive_folder_id && gallery.status !== "failed" && gallery.status !== "processing") {
    try {
      await GalleryService.processGalleryInBackground(gallery.id, gallery.drive_folder_id);
      photos = await db.getPhotosByGalleryId(gallery.id);
    } catch (syncErr) {
      console.warn(`[AutoSync] Failed to sync gallery ${gallery.id}:`, syncErr);
    }
  }

  const selections = await db.getSelectionsByGalleryId(gallery.id);
  const latestSelection = selections.length > 0 ? selections[0] : null;

  // Return public safe gallery data (no internal folder IDs, no secret hashes)
  return NextResponse.json({
    gallery: {
      id: gallery.id,
      client_name: gallery.client_name,
      event_name: gallery.event_name,
      event_date: gallery.event_date,
      status: gallery.status,
      error_message: gallery.error_message,
      total_photos: gallery.total_photos || photos.length,
      expires_at: gallery.expires_at,
      has_pin: gallery.has_pin,
      max_selections: gallery.max_selections,
      allow_download: gallery.allow_download,
    },
    latest_selection: latestSelection
      ? {
          id: latestSelection.id,
          selected_photo_ids: latestSelection.selected_photo_ids,
          submitted_at: latestSelection.submitted_at,
          client_notes: latestSelection.client_notes,
          client_email: latestSelection.client_email,
        }
      : null,
    photos: photos.map((p) => ({
      id: p.id,
      filename: p.filename,
      thumbnail_url: p.thumbnail_url,
      preview_url: p.preview_url,
      width: p.width,
      height: p.height,
      sort_order: p.sort_order,
    })),
  });
}
