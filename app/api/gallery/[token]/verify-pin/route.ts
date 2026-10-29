import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { GalleryService } from "@/lib/services/gallery-service";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const gallery = await db.getGalleryByToken(token);

  if (!gallery) {
    return NextResponse.json({ error: "Galeri foto tidak ditemukan atau tautan sudah tidak aktif." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: "Kode PIN wajib diisi." }, { status: 400 });
    }

    const isValid = await GalleryService.verifyPin(gallery, pin);
    if (!isValid) {
      return NextResponse.json({ error: "Kode PIN yang Anda masukkan salah. Silakan periksa kembali kode PIN dari fotografer Anda." }, { status: 401 });
    }

    // Set verified cookie
    const cookieStore = await cookies();
    cookieStore.set(`pin_auth_${gallery.id}`, "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal memverifikasi kode PIN. Silakan coba lagi." }, { status: 500 });
  }
}
