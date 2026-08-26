import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { SelectionService } from "@/lib/services/selection-service";
import { db } from "@/lib/db/store";

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

  const selections = await db.getSelectionsByGalleryId(id);
  const allPhotos = await db.getPhotosByGalleryId(id);

  // Group selected photos
  const selectedPhotoIds = new Set<string>();
  selections.forEach((s) => {
    s.selected_photo_ids.forEach((pid) => selectedPhotoIds.add(pid));
  });

  const selectedPhotos = allPhotos.filter((p) => selectedPhotoIds.has(p.id));

  return NextResponse.json({
    gallery,
    selections,
    selected_photos: selectedPhotos,
  });
}

export async function POST(
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

  const body = await request.json().catch(() => ({}));
  const format = body.format || "txt"; // 'txt' | 'csv' | 'json'

  const selections = await db.getSelectionsByGalleryId(id);
  const allPhotos = await db.getPhotosByGalleryId(id);

  const selectedPhotoIds = new Set<string>();
  selections.forEach((s) => {
    s.selected_photo_ids.forEach((pid) => selectedPhotoIds.add(pid));
  });

  const selectedPhotos = allPhotos.filter((p) => selectedPhotoIds.has(p.id));

  if (format === "csv") {
    const csvContent = await SelectionService.exportSelectionsAsCSV(selectedPhotos);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${gallery.client_name.replace(/\s+/g, "_")}_selections.csv"`,
      },
    });
  }

  if (format === "json") {
    const jsonContent = await SelectionService.exportSelectionsAsJSON(selectedPhotos, selections[0]);
    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${gallery.client_name.replace(/\s+/g, "_")}_selections.json"`,
      },
    });
  }

  // Default: Plain text list of filenames
  const textContent = await SelectionService.exportSelectionsAsText(selectedPhotos);
  return new NextResponse(textContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${gallery.client_name.replace(/\s+/g, "_")}_selections.txt"`,
    },
  });
}
