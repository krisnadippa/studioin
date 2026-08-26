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
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  // 2. Check if gallery is expired
  const now = Date.now();
  const expTime = new Date(gallery.expires_at).getTime();
  const isExpired = gallery.status === "expired" || now > expTime;
  if (isExpired) {
    return NextResponse.json({ error: "This gallery has expired." }, { status: 403 });
  }

  // 3. Check if downloads are allowed
  if (!gallery.allow_download) {
    return NextResponse.json({ error: "Downloads are disabled for this gallery." }, { status: 403 });
  }

  // 4. Retrieve the photo
  const photos = await db.getPhotosByGalleryId(gallery.id);
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  // 5. Perform the secure download from Google Drive or Fallback Mock url
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const isMock =
    photo.drive_file_id.startsWith("drive-") ||
    photo.drive_file_id.startsWith("drive_file_") ||
    !apiKey ||
    apiKey.includes("PASTE_API_KEY_ANDA_DI_SINI") ||
    apiKey.trim() === "";

  if (!isMock && apiKey) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${photo.drive_file_id}?alt=media&key=${apiKey.trim()}`;
      const driveRes = await fetch(url);
      if (driveRes.ok && driveRes.body) {
        return new Response(driveRes.body, {
          headers: {
            "Content-Type": driveRes.headers.get("Content-Type") || photo.mime_type || "image/jpeg",
            "Content-Disposition": `attachment; filename="${photo.filename}"`,
          },
        });
      } else {
        console.warn(`[GoogleDrive API Download Failed] Status ${driveRes.status}, falling back to preview URL.`);
      }
    } catch (err) {
      console.error("[GoogleDrive API Download Exception]", err);
    }
  }

  // Fallback / Mock Mode: download from preview_url (e.g. Unsplash URL)
  try {
    const mockRes = await fetch(photo.preview_url);
    if (mockRes.ok && mockRes.body) {
      return new Response(mockRes.body, {
        headers: {
          "Content-Type": mockRes.headers.get("Content-Type") || "image/jpeg",
          "Content-Disposition": `attachment; filename="${photo.filename}"`,
        },
      });
    }
  } catch (err) {
    console.error("[Mock Download Fallback Exception]", err);
  }

  return NextResponse.json({ error: "Failed to download file." }, { status: 500 });
}
