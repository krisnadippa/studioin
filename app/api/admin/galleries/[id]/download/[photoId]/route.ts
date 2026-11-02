import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { AuthService } from "@/lib/services/auth-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, photoId } = await params;
  const gallery = await db.getGalleryById(id, user.userId);
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found or unauthorized." }, { status: 404 });
  }

  const photos = await db.getPhotosByGalleryId(id);
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  const isMock =
    !photo.drive_file_id ||
    photo.drive_file_id.startsWith("drive-") ||
    photo.drive_file_id.startsWith("drive_file_");

  // Direct CDN redirect (default): 0 KB Vercel Bandwidth
  if (!isMock && photo.drive_file_id && mode !== "stream") {
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${photo.drive_file_id}`;
    return NextResponse.redirect(driveDownloadUrl, 307);
  }

  // Fallback streaming mode (only when explicitly requested with mode=stream)
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!isMock && apiKey && apiKey.trim() !== "" && !apiKey.includes("PASTE_API_KEY_ANDA_DI_SINI")) {
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
      }
    } catch (err) {
      console.error("[Admin GoogleDrive API Download Exception]", err);
    }
  }

  // Fallback to preview_url
  if (photo.preview_url && (photo.preview_url.startsWith("http://") || photo.preview_url.startsWith("https://"))) {
    return NextResponse.redirect(photo.preview_url, 307);
  }

  return NextResponse.json({ error: "Failed to download file." }, { status: 500 });
}
