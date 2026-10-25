"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
} from "lucide-react";

// ─── Inline validation (mirrors server-side, no extra deps) ──────────────────

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  barColor: string;
}

function getPasswordStrength(p: string): PasswordStrength {
  if (!p) return { score: 0, label: "", color: "#374151", barColor: "#374151" };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p)) score++;
  const map: Record<number, { label: string; color: string; barColor: string }> = {
    0: { label: "Too weak", color: "text-red-400", barColor: "bg-red-500" },
    1: { label: "Weak", color: "text-orange-400", barColor: "bg-orange-500" },
    2: { label: "Fair", color: "text-yellow-400", barColor: "bg-yellow-500" },
    3: { label: "Good", color: "text-emerald-400", barColor: "bg-emerald-500" },
    4: { label: "Strong 🔒", color: "text-[#bef238]", barColor: "bg-[#bef238]" },
  };
  return { score, ...map[score] };
}

interface Requirements {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

function getRequirements(p: string): Requirements {
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    digit: /[0-9]/.test(p),
    special: /[^a-zA-Z0-9]/.test(p),
  };
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return "Enter a valid email address.";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  return null;
}

function validatePassword(password: string): string | null {
  const reqs = getRequirements(password);
  if (!password) return "Password is required.";
  if (!reqs.length || !reqs.upper || !reqs.lower || !reqs.digit || !reqs.special)
    return "Password does not meet the requirements below.";
  return null;
}

function validateConfirmPassword(pw: string, cpw: string): string | null {
  if (!cpw) return "Please confirm your password.";
  if (pw !== cpw) return "Passwords do not match.";
  return null;
}

// ─── Requirement row ──────────────────────────────────────────────────────────
function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-[11px] ${met ? "text-emerald-400" : "text-white/35"}`}>
      {met ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
      {label}
    </li>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminRegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const nameTouched = useRef(false);
  const emailTouched = useRef(false);
  const passwordTouched = useRef(false);
  const confirmTouched = useRef(false);

  const [showReqs, setShowReqs] = useState(false);

  // Animated background
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
        alpha: Math.random() * 0.4 + 0.1,
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

  const strength = getPasswordStrength(password);
  const reqs = getRequirements(password);

  // ── Field handlers ──────────────────────────────────────────────────────
  const handleNameChange = (v: string) => {
    setName(v);
    setServerError(null);
    if (nameTouched.current) setNameError(validateName(v));
  };

  const handleEmailChange = (v: string) => {
    setEmail(v);
    setServerError(null);
    if (emailTouched.current) setEmailError(validateEmail(v));
  };

  const handlePasswordChange = useCallback(
    (v: string) => {
      setPassword(v);
      setServerError(null);
      if (passwordTouched.current) setPasswordError(validatePassword(v));
      if (confirmTouched.current) setConfirmError(validateConfirmPassword(v, confirmPassword));
    },
    [confirmPassword]
  );

  const handleConfirmChange = (v: string) => {
    setConfirmPassword(v);
    setServerError(null);
    if (confirmTouched.current) setConfirmError(validateConfirmPassword(password, v));
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    nameTouched.current = true;
    emailTouched.current = true;
    passwordTouched.current = true;
    confirmTouched.current = true;

    const nErr = validateName(name);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirmPassword(password, confirmPassword);

    setNameError(nErr);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);

    if (nErr || eErr || pErr || cErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors?.name) setNameError(data.fieldErrors.name);
        if (data.fieldErrors?.email) setEmailError(data.fieldErrors.email);
        if (data.fieldErrors?.password) setPasswordError(data.fieldErrors.password);
        if (data.fieldErrors?.confirmPassword) setConfirmError(data.fieldErrors.confirmPassword);
        throw new Error(data.error || "Registration failed.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setServerError(msg);
      setLoading(false);
    }
  };

  const inputBase =
    "w-full pl-11 pr-4 py-3.5 bg-white/5 border rounded-xl text-sm text-white placeholder-white/30 focus:placeholder-white/40 focus:outline-none transition-all duration-200";
  const inputOk = "border-white/15 focus:border-[#bef238] focus:ring-1 focus:ring-[#bef238]/40";
  const inputErr = "border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/40";

  return (
    <div className="relative min-h-screen bg-[#0c2b1f] text-white flex flex-col overflow-hidden">
      {/* Animated canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c2b1f] via-[#103322]/80 to-[#0c2b1f] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#bef238]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
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
          <span className="text-white text-xl font-bold tracking-tight">Studioin</span>
        </Link>

        <Link
          href="/admin/login"
          id="go-to-login"
          className="text-xs font-semibold text-emerald-300 hover:text-[#bef238] transition-colors flex items-center gap-1.5 group"
        >
          Already have an account?
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Heading */}
            <div className="text-center mb-8 space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#bef238]/10 text-[#bef238] border border-[#bef238]/20">
                <User className="w-2.5 h-2.5" />
                Photographer Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create your account
              </h1>
              <p className="text-sm text-white/50">
                Join Studioin and start managing your client galleries.
              </p>
            </div>

            {/* Success */}
            {success && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-sm animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Account created! Redirecting to dashboard…</span>
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

            <form id="register-form" onSubmit={handleRegister} noValidate className="space-y-5">
              {/* Full name */}
              <div>
                <label
                  htmlFor="register-name"
                  className="block text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-[#bef238]" />
                  Nama Lengkap
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-[#bef238] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={() => {
                      nameTouched.current = true;
                      setNameError(validateName(name));
                    }}
                    placeholder="Krisna Dwi"
                    className={`${inputBase} ${nameError ? inputErr : inputOk}`}
                    aria-describedby={nameError ? "register-name-error" : undefined}
                    aria-invalid={!!nameError}
                  />
                </div>
                {nameError && (
                  <p id="register-name-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {nameError}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="register-email"
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
                    id="register-email"
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
                    aria-describedby={emailError ? "register-email-error" : undefined}
                    aria-invalid={!!emailError}
                  />
                </div>
                {emailError && (
                  <p id="register-email-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="register-password"
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
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onFocus={() => setShowReqs(true)}
                    onBlur={() => {
                      passwordTouched.current = true;
                      setPasswordError(validatePassword(password));
                    }}
                    placeholder="Admin#2026!Str0ng"
                    className={`${inputBase} pr-11 ${passwordError ? inputErr : inputOk}`}
                    aria-describedby="password-requirements"
                    aria-invalid={!!passwordError}
                  />
                  <button
                    type="button"
                    id="toggle-new-password-visibility"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-[#bef238] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            i < strength.score ? strength.barColor : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] font-medium ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                )}

                {/* Requirements checklist */}
                {showReqs && (
                  <ul
                    id="password-requirements"
                    className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1"
                  >
                    <Req met={reqs.length} label="8+ characters" />
                    <Req met={reqs.upper} label="Uppercase letter" />
                    <Req met={reqs.lower} label="Lowercase letter" />
                    <Req met={reqs.digit} label="Number" />
                    <Req met={reqs.special} label="Special char (!@#…)" />
                  </ul>
                )}

                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {passwordError}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="block text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#bef238]" />
                  Konfirmasi Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-[#bef238] transition-colors">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmChange(e.target.value)}
                    onBlur={() => {
                      confirmTouched.current = true;
                      setConfirmError(validateConfirmPassword(password, confirmPassword));
                    }}
                    placeholder="Ulangi password di atas"
                    className={`${inputBase} pr-11 ${confirmError ? inputErr : inputOk} ${
                      !confirmError && confirmPassword && confirmPassword === password
                        ? "border-emerald-500/50"
                        : ""
                    }`}
                    aria-describedby={confirmError ? "register-confirm-error" : undefined}
                    aria-invalid={!!confirmError}
                  />
                  <button
                    type="button"
                    id="toggle-confirm-password-visibility"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-[#bef238] transition-colors"
                  >
                    {!confirmError && confirmPassword && confirmPassword === password ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmError && (
                  <p id="register-confirm-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {confirmError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                id="register-submit"
                type="submit"
                disabled={loading || success}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#bef238] hover:bg-[#cffc4a] text-[#0c2b1f] font-bold text-sm py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-[#bef238]/25 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account…</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Account created!</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className="mt-7 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-white/30">Already registered?</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <Link
              href="/admin/login"
              id="login-link"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 border border-white/10 hover:border-[#bef238]/30 text-white/60 hover:text-white text-sm font-medium py-3 rounded-xl transition-all duration-200"
            >
              Sign in instead
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-white/25">
            Your password is hashed with bcrypt before storage. We never store plaintext credentials.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-white/25 pb-6">
        © {new Date().getFullYear()} Studioin Photo Proofing. All rights reserved.
      </footer>
    </div>
  );
}
