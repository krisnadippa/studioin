"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@studioin.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#114234] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 relative selection:bg-[#bef238] selection:text-[#114234]">
      {/* Background ambient radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(255,255,255,0.06)_0%,_transparent_70%)] pointer-events-none" />

      {/* Header Logo */}
      <header className="max-w-[1400px] mx-auto w-full flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <Image
              src="/images/logosiputih.png"
              alt="Studioin"
              width={34}
              height={34}
              className="w-7 h-7 object-contain"
              priority
            />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">
            Studioin
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs font-medium text-emerald-200 hover:text-white transition-colors"
        >
          Back to Homepage
        </Link>
      </header>

      {/* Login Card */}
      <main className="max-w-md w-full mx-auto my-auto z-10 py-8">
        <div className="bg-[#0e382b] border border-emerald-800/60 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur-sm">
          
          <div className="text-center mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#185342] text-[#bef238] border border-[#2b6553] mb-3">
              Photographer Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign In to Studioin
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1.5">
              Manage your client proofing galleries and photo selections.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center gap-3 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@studioin.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#09261d] border border-emerald-700/60 rounded-xl text-sm text-white placeholder-emerald-500/50 focus:outline-none focus:border-[#bef238] focus:ring-1 focus:ring-[#bef238] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#09261d] border border-emerald-700/60 rounded-xl text-sm text-white placeholder-emerald-500/50 focus:outline-none focus:border-[#bef238] focus:ring-1 focus:ring-[#bef238] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-400 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Demo Credential Note */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-emerald-200">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-emerald-700 text-[#114234] focus:ring-[#bef238]"
                />
                <span>Remember me</span>
              </label>
              <span className="text-emerald-400/80 text-[11px]">
                Demo: admin@studioin.com / admin123
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-sm py-3 px-4 rounded-xl transition-all duration-150 shadow-md hover:shadow-lime-500/20 active:scale-98 disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </main>

      {/* Footer Meta */}
      <footer className="text-center text-xs text-emerald-300/60 py-2 z-10">
        © Copyright 2026 Studioin Photo Proofing System. All rights reserved.
      </footer>
    </div>
  );
}
