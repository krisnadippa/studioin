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
    return NextResponse.json({ error: "Galeri foto tidak ditemukan." }, { status: 404 });
  }

  const now = Date.now();
  const expTime = new Date(gallery.expires_at).getTime();
  if (gallery.status === "expired" || now > expTime) {
    return NextResponse.json(
      { error: "Masa aktif galeri foto ini telah berakhir. Silakan hubungi fotografer Anda." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { client_name, client_email, client_notes, selected_photo_ids } = body;

    if (!selected_photo_ids || !Array.isArray(selected_photo_ids) || selected_photo_ids.length === 0) {
      return NextResponse.json(
        { error: "Silakan pilih minimal 1 foto sebelum mengirim pilihan." },
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
    const msg = err instanceof Error ? err.message : "Gagal menyimpan pilihan foto.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
