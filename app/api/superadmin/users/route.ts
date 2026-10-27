import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { db } from "@/lib/db/store";
import bcrypt from "bcryptjs";

async function requireSuperAdmin() {
  const user = await AuthService.getCurrentUser();
  if (!user) return null;
  if (user.role !== "superadmin") return null;
  return user;
}

// GET /api/superadmin/users - list all users with activity
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usersActivity = await db.getAllUsersActivity();
    return NextResponse.json({ users: usersActivity });
  } catch (err) {
    console.error("[GET /api/superadmin/users]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/superadmin/users - create new photographer account
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, password, gallery_limit } = body as {
      name?: string;
      email?: string;
      password?: string;
      gallery_limit?: number | null;
    };

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const exists = await db.adminEmailExists(email);
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await db.createAdminUser({
      id,
      name,
      email,
      passwordHash,
      role: "admin",
      gallery_limit: gallery_limit !== undefined ? gallery_limit : null,
    });

    return NextResponse.json({ success: true, user: { ...newUser, password_hash: undefined } });
  } catch (err) {
    console.error("[POST /api/superadmin/users]", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
