import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { validateLoginForm } from "@/lib/utils/validation";
import { checkRateLimit, resetRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // ── IP-based rate limiting (5 attempts / 60s) ──────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const rl = checkRateLimit(ip, { namespace: "login", limit: 5, windowSecs: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${rl.resetInSecs} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.resetInSecs),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // ── Parse & validate ───────────────────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { email, password } = body as { email?: string; password?: string };

    const validation = validateLoginForm({
      email: email ?? "",
      password: password ?? "",
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

    // ── Authenticate ───────────────────────────────────────────────────────
    const result = await AuthService.login(email!, password!);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Invalid credentials." },
        { status: 401 }
      );
    }

    // Reset rate limit on success so legitimate users are never locked out
    resetRateLimit(ip, "login");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[POST /api/auth/login]", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
