"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Client-side field validation (mirrors server-side rules) ────────────────
function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return "Enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field-level errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Track if field was ever touched (for real-time validation)
  const emailTouched = useRef(false);
  const passwordTouched = useRef(false);

  // ── Particle canvas decoration ──────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const dots: { x: number; y: number; r: number; vx: number; vy: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,242,56,${d.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Real-time validation ────────────────────────────────────────────────
  const handleEmailChange = (v: string) => {
    setEmail(v);
    setServerError(null);
    if (emailTouched.current) setEmailError(validateEmail(v));
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    setServerError(null);
    if (passwordTouched.current) setPasswordError(validatePassword(v));
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Force validation
    emailTouched.current = true;
    passwordTouched.current = true;
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors?.email) setEmailError(data.fieldErrors.email);
        if (data.fieldErrors?.password) setPasswordError(data.fieldErrors.password);
        throw new Error(data.error || "Sign-in failed.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setServerError(msg);
      setLoading(false);
    }
  };

  // ── Input base classes ──────────────────────────────────────────────────
  const inputBase =
    "w-full pl-11 pr-4 py-3.5 bg-white/5 border rounded-xl text-sm text-white placeholder-white/30 focus:placeholder-white/40 focus:outline-none transition-all duration-200";
  const inputOk = "border-white/15 focus:border-[#bef238] focus:ring-1 focus:ring-[#bef238]/40";
  const inputErr = "border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/40";

  return (
    <div className="relative min-h-screen bg-[#0c2b1f] text-white flex flex-col overflow-hidden">
      {/* Animated dot canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c2b1f] via-[#103322]/80 to-[#0c2b1f] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#bef238]/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#bef238] flex items-center justify-center shadow-lg group-hover:shadow-[#bef238]/30 transition-shadow duration-300">
            <Image
              src="/images/logosiputih.png"
              alt="Studioin"
              width={20}
              height={20}
              className="w-5 h-5 object-contain invert"
              priority
            />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">
            Studioin
          </span>
        </Link>

        <Link
          href="/admin/register"
          id="go-to-register"
          className="text-xs font-semibold text-emerald-300 hover:text-[#bef238] transition-colors flex items-center gap-1.5 group"
        >
          Create an account
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </header>

      {/* ── Main card ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Badge + Heading */}
            <div className="text-center mb-8 space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#bef238]/10 text-[#bef238] border border-[#bef238]/20">
                <Lock className="w-2.5 h-2.5" />
                Secure Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-white/50">
                Sign in to manage your client galleries.
              </p>
            </div>

            {/* Success state */}
            {success && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-sm animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Signed in — redirecting to dashboard…</span>
              </div>
            )}

            {/* Server error */}
            {serverError && !success && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/40 flex items-start gap-3 text-red-300 text-sm animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{serverError}</span>
              </div>
            )}

            <form id="login-form" onSubmit={handleLogin} noValidate className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[#bef238]" />
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-[#bef238] transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => {
                      emailTouched.current = true;
                      setEmailError(validateEmail(email));
                    }}
                    placeholder="admin@studioin.com"
                    className={`${inputBase} ${emailError ? inputErr : inputOk}`}
                    aria-describedby={emailError ? "login-email-error" : undefined}
                    aria-invalid={!!emailError}
                  />
                </div>
                {emailError && (
                  <p id="login-email-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#bef238]" />
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-[#bef238] transition-colors">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => {
                      passwordTouched.current = true;
                      setPasswordError(validatePassword(password));
                    }}
                    placeholder="Admin#2026!Str0ng"
                    className={`${inputBase} pr-11 ${passwordError ? inputErr : inputOk}`}
                    aria-describedby={passwordError ? "login-password-error" : undefined}
                    aria-invalid={!!passwordError}
                  />
                  <button
                    type="button"
                    id="toggle-password-visibility"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-[#bef238] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p id="login-password-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {passwordError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading || success}
                className="w-full mt-2 relative overflow-hidden inline-flex items-center justify-center gap-2 bg-[#bef238] hover:bg-[#cffc4a] text-[#0c2b1f] font-bold text-sm py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-[#bef238]/25 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Redirecting…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider + register link */}
            <div className="mt-7 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-white/30">New here?</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <Link
              href="/admin/register"
              id="register-link"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 border border-white/10 hover:border-[#bef238]/30 text-white/60 hover:text-white text-sm font-medium py-3 rounded-xl transition-all duration-200"
            >
              Create your account
            </Link>
          </div>

          {/* Security note */}
          <p className="mt-4 text-center text-xs text-white/25">
            Protected by bcrypt & JWT session cookies. All traffic is encrypted.
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center text-[11px] text-white/25 pb-6">
        © {new Date().getFullYear()} Studioin Photo Proofing. All rights reserved.
      </footer>
    </div>
  );
}
