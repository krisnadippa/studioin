import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { db } from "@/lib/db/store";

async function requireSuperAdmin() {
  const user = await AuthService.getCurrentUser();
  if (!user) return null;
  if (user.role !== "superadmin") return null;
  return user;
}

// PATCH /api/superadmin/users/[id] - update restriction/limit for a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { is_restricted, gallery_limit, role } = body as {
      is_restricted?: boolean;
      gallery_limit?: number | null;
      role?: "superadmin" | "admin";
    };

    // Prevent superadmin from modifying another superadmin
    const target = await db.getAdminById(id);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "superadmin" && id !== user.userId) {
      return NextResponse.json({ error: "Cannot modify another superadmin" }, { status: 403 });
    }

    const updated = await db.updateAdminRestriction(id, {
      is_restricted,
      gallery_limit,
      role,
    });

    return NextResponse.json({ success: true, user: { ...updated, password_hash: undefined } });
  } catch (err) {
    console.error("[PATCH /api/superadmin/users/[id]]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/superadmin/users/[id] - delete a photographer account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent deleting self
  if (id === user.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const target = await db.getAdminById(id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "superadmin") {
    return NextResponse.json({ error: "Cannot delete a superadmin account" }, { status: 403 });
  }

  try {
    // Delete galleries of this user first? (for now just delete user)
    await import("@/lib/db/neon").then(async ({ sql }) => {
      await sql`DELETE FROM admin_users WHERE id = ${id}`;
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/superadmin/users/[id]]", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
