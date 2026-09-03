import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const photo = await db.getPhotoById(photoId);

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const isMock =
    !photo.drive_file_id ||
    photo.drive_file_id.startsWith("drive-") ||
    photo.drive_file_id.startsWith("drive_file_") ||
    !apiKey ||
    apiKey.includes("PASTE_API_KEY_ANDA_DI_SINI") ||
    apiKey.trim() === "";

  if (!isMock && apiKey && photo.drive_file_id) {
    try {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${photo.drive_file_id}?alt=media&key=${apiKey.trim()}`;
      const driveRes = await fetch(driveUrl);
      if (driveRes.ok && driveRes.body) {
        return new Response(driveRes.body, {
          headers: {
            "Content-Type": driveRes.headers.get("Content-Type") || photo.mime_type || "image/jpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    } catch (err) {
      console.error("[Photo Proxy Error]", err);
    }
  }

  // Fallback if Unsplash or external URL
  if (photo.thumbnail_url && (photo.thumbnail_url.startsWith("http://") || photo.thumbnail_url.startsWith("https://"))) {
    return NextResponse.redirect(photo.thumbnail_url);
  }

  return NextResponse.json({ error: "Image not available" }, { status: 500 });
}
