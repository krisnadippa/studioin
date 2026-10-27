import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { db } from "@/lib/db/store";

export async function GET() {
  const session = await AuthService.getCurrentUser();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const admin = await db.getAdminById(session.userId);
    const user = admin
      ? {
          id: admin.id,
          userId: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          is_restricted: Boolean(admin.is_restricted),
          gallery_limit: admin.gallery_limit,
        }
      : session;

    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: true, user: session });
  }
}
