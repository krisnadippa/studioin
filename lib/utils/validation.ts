/**
 * Server-side validation utilities for auth forms.
 * Zero external dependencies — keeps bundle size minimal for Vercel.
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
}

// ─── Regex patterns ────────────────────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL = /[^a-zA-Z0-9]/;

// ─── Individual validators ──────────────────────────────────────────────────
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) return "Email wajib diisi.";
  if (email.length > 254) return "Email terlalu panjang (maksimal 254 karakter).";
  if (!EMAIL_RE.test(email.trim())) return "Format email tidak valid (contoh: nama@domain.com).";
  return null;
}

export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (!password) { errors.push("Kata sandi wajib diisi."); return errors; }
  if (password.length < 8) errors.push("Minimal 8 karakter.");
  if (!HAS_UPPER.test(password)) errors.push("Minimal 1 huruf besar (A–Z).");
  if (!HAS_LOWER.test(password)) errors.push("Minimal 1 huruf kecil (a–z).");
  if (!HAS_DIGIT.test(password)) errors.push("Minimal 1 angka (0–9).");
  if (!HAS_SPECIAL.test(password)) errors.push("Minimal 1 simbol atau karakter khusus (!@#$…).");
  return errors;
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) return "Nama lengkap wajib diisi.";
  if (name.trim().length < 2) return "Nama lengkap minimal 2 karakter.";
  if (name.trim().length > 100) return "Nama terlalu panjang (maksimal 100 karakter).";
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Konfirmasi kata sandi wajib diisi.";
  if (password !== confirm) return "Konfirmasi kata sandi tidak cocok.";
  return null;
}

// ─── Composite validators ───────────────────────────────────────────────────
export function validateRegisterForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  const errors: FieldError[] = [];

  const nameErr = validateName(data.name);
  if (nameErr) errors.push({ field: "name", message: nameErr });

  const emailErr = validateEmail(data.email);
  if (emailErr) errors.push({ field: "email", message: emailErr });

  const pwErrors = validatePassword(data.password);
  if (pwErrors.length > 0) {
    errors.push({ field: "password", message: pwErrors.join(" ") });
  }

  const confirmErr = validateConfirmPassword(data.password, data.confirmPassword);
  if (confirmErr) errors.push({ field: "confirmPassword", message: confirmErr });

  return { valid: errors.length === 0, errors };
}

export function validateLoginForm(data: {
  email: string;
  password: string;
}): ValidationResult {
  const errors: FieldError[] = [];

  const emailErr = validateEmail(data.email);
  if (emailErr) errors.push({ field: "email", message: emailErr });

  if (!data.password) errors.push({ field: "password", message: "Kata sandi wajib diisi." });

  return { valid: errors.length === 0, errors };
}

// ─── Password strength score (0–4) for UI meter ────────────────────────────
export function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "None", color: "#374151" };

  let score = 0;
  if (password.length >= 8) score++;
  if (HAS_UPPER.test(password) && HAS_LOWER.test(password)) score++;
  if (HAS_DIGIT.test(password)) score++;
  if (HAS_SPECIAL.test(password)) score++;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too weak", color: "#ef4444" },
    1: { label: "Weak", color: "#f97316" },
    2: { label: "Fair", color: "#eab308" },
    3: { label: "Good", color: "#22c55e" },
    4: { label: "Strong", color: "#16a34a" },
  };

  return { score, ...map[score] };
}
