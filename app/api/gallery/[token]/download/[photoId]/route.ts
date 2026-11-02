import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  const { token, photoId } = await params;

  // 1. Get and validate the gallery
  const gallery = await db.getGalleryByToken(token);
  if (!gallery) {
    return NextResponse.json({ error: "Galeri foto tidak ditemukan." }, { status: 404 });
  }

  // 2. Check if gallery is expired
  const now = Date.now();
  const expTime = new Date(gallery.expires_at).getTime();
  const isExpired = gallery.status === "expired" || now > expTime;
  if (isExpired) {
    return NextResponse.json({ error: "Masa aktif galeri foto ini telah berakhir." }, { status: 403 });
  }

  // 3. Check if downloads are allowed
  if (!gallery.allow_download) {
    return NextResponse.json({ error: "Fitur unduh foto dinonaktifkan oleh fotografer untuk galeri ini." }, { status: 403 });
  }

  // 4. Retrieve the photo
  const photos = await db.getPhotosByGalleryId(gallery.id);
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) {
    return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
  }

  // 5. Zero-Bandwidth Direct Download via Google Drive CDN
  const isMock =
    !photo.drive_file_id ||
    photo.drive_file_id.startsWith("drive-") ||
    photo.drive_file_id.startsWith("drive_file_");

  if (!isMock && photo.drive_file_id) {
    // Redirect directly to Google Drive high-speed direct download link
    // Vercel only sends ~150 bytes of HTTP 307 redirect instead of 25MB image file
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${photo.drive_file_id}`;
    return NextResponse.redirect(driveDownloadUrl, 307);
  }

  // Fallback / Mock Mode: redirect to preview_url (e.g. Unsplash URL)
  if (photo.preview_url && (photo.preview_url.startsWith("http://") || photo.preview_url.startsWith("https://"))) {
    return NextResponse.redirect(photo.preview_url, 307);
  }

  return NextResponse.json({ error: "Gagal mengunduh foto dari Google Drive." }, { status: 500 });
}
