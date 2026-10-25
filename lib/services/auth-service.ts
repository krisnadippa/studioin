import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "../db/store";
import bcrypt from "bcryptjs";

// ─── Constants ──────────────────────────────────────────────────────────────
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    "studioin-super-secret-jwt-key-change-in-production-2026"
);

const SESSION_COOKIE_NAME = "studioin_admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const BCRYPT_ROUNDS = 12; // Higher = more secure, ~300ms per hash

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  /** Field-level errors for form UX */
  fieldErrors?: Record<string, string>;
}

// ─── AuthService ─────────────────────────────────────────────────────────────
export class AuthService {
  // ── Password helpers ──────────────────────────────────────────────────────
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ── JWT helpers ───────────────────────────────────────────────────────────
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

  // ── Cookie helpers ────────────────────────────────────────────────────────
  private static async setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }

  // ── Register ──────────────────────────────────────────────────────────────
  /**
   * Creates a new admin account and starts a session.
   * Caller is responsible for validating input fields before calling this.
   */
  static async register(
    name: string,
    email: string,
    password: string
  ): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();

    // Duplicate email check
    const exists = await db.adminEmailExists(normalizedEmail);
    if (exists) {
      return {
        success: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: "An account with this email already exists." },
      };
    }

    // Create account
    const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const passwordHash = await this.hashPassword(password);

    const admin = await db.createAdminUser({
      id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    // Auto-login after registration
    const token = await this.createToken({
      userId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    await this.setSessionCookie(token);

    return { success: true };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  static async login(
    email: string,
    password: string
  ): Promise<AuthResult & { token?: string }> {
    const admin = await db.getAdminByEmail(email.trim());

    // Use constant-time comparison by always calling verifyPassword
    // to prevent user enumeration via timing attacks.
    const DUMMY_HASH =
      "$2b$12$invalidsaltthatwillnevermatchanyrealpassword000000000000";
    const isValid = admin
      ? await this.verifyPassword(password, admin.password_hash)
      : await this.verifyPassword(password, DUMMY_HASH).then(() => false);

    if (!admin || !isValid) {
      return { success: false, error: "Invalid email or password." };
    }

    const token = await this.createToken({
      userId: admin.id,
      email: admin.email,
      name: admin.name,
    });

    await this.setSessionCookie(token);

    return { success: true, token };
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  static async logout(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  // ── Session ───────────────────────────────────────────────────────────────
  static async getCurrentUser(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return this.verifyToken(token);
  }
}
