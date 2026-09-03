import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const { searchParams } = new URL(request.url);
  const size = searchParams.get("sz"); // 'hd' | 'thumb' | null

  const photo = await db.getPhotoById(photoId);

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // 1. STRATEGY 1: Direct CDN Redirect (Consumes ~0 KB Vercel Bandwidth)
  // Check if we have a direct storage/CDN link (Google Drive CDN, Cloudflare R2, AWS S3, Supabase, Unsplash)
  const targetCdnUrl = size === "hd" 
    ? (photo.preview_url || photo.thumbnail_url) 
    : (photo.thumbnail_url || photo.preview_url);

  if (
    targetCdnUrl &&
    (targetCdnUrl.startsWith("https://") || targetCdnUrl.startsWith("http://")) &&
    !targetCdnUrl.includes("/api/photo/")
  ) {
    // Return HTTP 307 Redirect with Edge & Browser Caching headers
    // Vercel serverless function only sends ~150 bytes of headers instead of 5-30MB image files
    return new Response(null, {
      status: 307,
      headers: {
        Location: targetCdnUrl,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "CDN-Cache-Control": "public, max-age=604800",
        "Vercel-CDN-Cache-Control": "public, max-age=604800",
      },
    });
  }

  // 2. STRATEGY 2: Fallback Streaming with Aggressive Vercel Edge Caching
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
            // Edge caching prevents Vercel Serverless Function from re-invoking on repeated views
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
            "CDN-Cache-Control": "public, max-age=31536000, immutable",
            "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (err) {
      console.error("[Photo Proxy Error]", err);
    }
  }

  // 3. Fallback to external preview/thumbnail if available
  if (photo.thumbnail_url && (photo.thumbnail_url.startsWith("http://") || photo.thumbnail_url.startsWith("https://"))) {
    return NextResponse.redirect(photo.thumbnail_url, {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  }

  return NextResponse.json({ error: "Image not available" }, { status: 500 });
}
