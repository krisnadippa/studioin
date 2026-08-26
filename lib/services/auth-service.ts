import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "../db/store";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "studioin-super-secret-jwt-key-change-in-production-2026"
);

const SESSION_COOKIE_NAME = "studioin_admin_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async createToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);
  }

  static async verifyToken(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
      };
    } catch {
      return null;
    }
  }

  static async login(email: string, password: string): Promise<{ success: boolean; error?: string; token?: string }> {
    const admin = await db.getAdminByEmail(email);
    if (!admin) {
      return { success: false, error: "Invalid email or password" };
    }

    const isValid = await this.verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    const token = await this.createToken({
      userId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return { success: true, token };
  }

  static async logout(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  static async getCurrentUser(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return this.verifyToken(token);
  }
}
