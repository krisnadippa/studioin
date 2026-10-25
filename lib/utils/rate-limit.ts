/**
 * In-memory rate limiter for API routes.
 *
 * Designed to be lightweight and serverless-compatible:
 * - Uses a global Map so the state is shared across requests within the same
 *   Vercel function instance (serverless warm containers).
 * - Automatically prunes stale windows to avoid memory leaks.
 * - NOT a substitute for a distributed rate limiter (Redis/Upstash) in high
 *   traffic scenarios, but appropriate for a private admin portal.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number; // ms epoch
}

// Global store persists across warm lambda invocations
const globalRateLimit = globalThis as unknown as {
  _rlStore?: Map<string, RateLimitEntry>;
};

function getStore(): Map<string, RateLimitEntry> {
  if (!globalRateLimit._rlStore) {
    globalRateLimit._rlStore = new Map();
  }
  return globalRateLimit._rlStore;
}

interface RateLimitOptions {
  /** Unique namespace (e.g. "login" or "register") */
  namespace: string;
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds (default: 60) */
  windowSecs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSecs: number;
}

export function checkRateLimit(
  identifier: string, // e.g. IP or email
  options: RateLimitOptions
): RateLimitResult {
  const { namespace, limit, windowSecs = 60 } = options;
  const key = `${namespace}:${identifier}`;
  const store = getStore();
  const now = Date.now();
  const windowMs = windowSecs * 1000;

  // Prune entries older than 2 × window to avoid unbounded growth
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) {
      if (now - v.windowStart > windowMs * 2) store.delete(k);
    }
  }

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetInSecs: windowSecs };
  }

  if (entry.count >= limit) {
    const resetInSecs = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, remaining: 0, resetInSecs };
  }

  entry.count++;
  const remaining = limit - entry.count;
  const resetInSecs = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
  return { allowed: true, remaining, resetInSecs };
}

/**
 * Resets the rate limit for a given identifier + namespace.
 * Call this on successful login so a correct user is never locked out.
 */
export function resetRateLimit(identifier: string, namespace: string): void {
  const key = `${namespace}:${identifier}`;
  getStore().delete(key);
}
