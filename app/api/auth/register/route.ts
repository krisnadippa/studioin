import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { validateRegisterForm } from "@/lib/utils/validation";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // ── IP-based rate limiting (3 registrations / 3600s = 1 hour) ──────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const rl = checkRateLimit(ip, {
      namespace: "register",
      limit: 3,
      windowSecs: 3600,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please try again in ${Math.ceil(rl.resetInSecs / 60)} minute(s).`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.resetInSecs) },
        }
      );
    }

    // ── Parse & validate ───────────────────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { name, email, password, confirmPassword } = body as {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    const validation = validateRegisterForm({
      name: name ?? "",
      email: email ?? "",
      password: password ?? "",
      confirmPassword: confirmPassword ?? "",
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errors[0]?.message ?? "Validation failed.",
          fieldErrors: Object.fromEntries(
            validation.errors.map((e) => [e.field, e.message])
          ),
        },
        { status: 422 }
      );
    }

    // ── Register ───────────────────────────────────────────────────────────
    const result = await AuthService.register(name!, email!, password!);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error ?? "Registration failed.",
          fieldErrors: result.fieldErrors,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[POST /api/auth/register]", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
