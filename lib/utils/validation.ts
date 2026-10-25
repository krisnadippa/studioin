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
  if (!email || email.trim().length === 0) return "Email is required.";
  if (email.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (!password) { errors.push("Password is required."); return errors; }
  if (password.length < 8) errors.push("At least 8 characters.");
  if (!HAS_UPPER.test(password)) errors.push("At least one uppercase letter (A–Z).");
  if (!HAS_LOWER.test(password)) errors.push("At least one lowercase letter (a–z).");
  if (!HAS_DIGIT.test(password)) errors.push("At least one number (0–9).");
  if (!HAS_SPECIAL.test(password)) errors.push("At least one special character (!@#$…).");
  return errors;
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) return "Name is required.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  if (name.trim().length > 100) return "Name is too long (max 100 characters).";
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
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

  if (!data.password) errors.push({ field: "password", message: "Password is required." });

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
