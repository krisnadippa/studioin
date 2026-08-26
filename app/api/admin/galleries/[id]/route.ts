import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { GalleryService } from "@/lib/services/gallery-service";
import { db } from "@/lib/db/store";
import { Gallery } from "@/lib/db/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const gallery = await db.getGalleryById(id);
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const photos = await db.getPhotosByGalleryId(id);
  const selections = await db.getSelectionsByGalleryId(id);

  return NextResponse.json({
    gallery,
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
  const body = await request.json().catch(() => ({}));

  let updated;
  if (body.additional_days !== undefined) {
    const additionalDays = Number(body.additional_days) || 3;
    updated = await GalleryService.extendGallery(id, additionalDays);
  } else {
    const updates: Partial<Gallery> = {};
    if (body.max_selections !== undefined) {
      updates.max_selections = Number(body.max_selections) || 0;
    }
    if (body.allow_download !== undefined) {
      updates.allow_download = !!body.allow_download;
    }
    
    if (Object.keys(updates).length > 0) {
      updated = await db.updateGallery(id, updates);
    } else {
      updated = await db.getGalleryById(id);
    }
  }

  if (!updated) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, gallery: updated });
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
  const deleted = await GalleryService.deleteGallery(id);
  if (!deleted) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
