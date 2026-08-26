import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { SelectionService } from "@/lib/services/selection-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const gallery = await db.getGalleryByToken(token);

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  const now = Date.now();
  const expTime = new Date(gallery.expires_at).getTime();
  if (gallery.status === "expired" || now > expTime) {
    return NextResponse.json(
      { error: "This gallery has expired. Please contact the photographer." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { client_name, client_email, client_notes, selected_photo_ids } = body;

    if (!selected_photo_ids || !Array.isArray(selected_photo_ids) || selected_photo_ids.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one photo." },
        { status: 400 }
      );
    }

    const selection = await SelectionService.submitSelection({
      gallery_id: gallery.id,
      client_name: client_name || gallery.client_name,
      client_email,
      client_notes,
      selected_photo_ids,
    });

    return NextResponse.json({ success: true, selection });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit selection.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
