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
        console.warn(`[Admin GoogleDrive API Download Failed] Status ${driveRes.status}, falling back to preview.`);
      }
    } catch (err) {
      console.error("[Admin GoogleDrive API Download Exception]", err);
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
    console.error("[Admin Mock Download Fallback Exception]", err);
  }

  return NextResponse.json({ error: "Failed to download file." }, { status: 500 });
}
