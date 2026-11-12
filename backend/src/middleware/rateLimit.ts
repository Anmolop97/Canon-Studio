import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  maxKeys?: number;
}

/**
 * Default key generator as specified in Milestone 3 requirements:
 * `req.user?.id ? ('user:' + req.user.id) : ('ip:' + (req.ip || req.socket?.remoteAddress || 'unknown'))`
 */
export function defaultKeyGenerator(req: Request): string {
  const user = (req as any).user;
  if (user && user.id) {
    return `user:${user.id}`;
  }
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

export function ipKeyGenerator(req: Request): string {
  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

/**
 * Resolves the configured rate limit maximum, defaulting to 10 unless
 * specified in environment variables or configuration options.
 */
export function getAiRateLimitMax(configuredMax?: number): number {
  if (typeof configuredMax === 'number' && configuredMax > 0) {
    return configuredMax;
  }
  if (process.env.RATE_LIMIT_AI_MAX) {
    const parsed = parseInt(process.env.RATE_LIMIT_AI_MAX, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10;
}

/**
 * Sliding Window Rate Limiter (R4)
 *
 * Implements a zero-dependency in-memory sliding window rate limiter
 * tracking request timestamps per client key to defend AI generation
 * endpoints against DoS floods and quota exhaustion.
 */
export class SlidingWindowRateLimiter {
  private store = new Map<string, number[]>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private optionsMax?: number;
  private maxKeys: number;
  public windowMs: number;
  public keyGenerator: (req: Request) => string;

  constructor(options: RateLimiterOptions = {}) {
    const configuredWindow = Number.parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS || '', 10);
    this.windowMs = options.windowMs && options.windowMs > 0
      ? options.windowMs
      : configuredWindow > 0 ? configuredWindow : 60_000;
    this.optionsMax = options.max;
    this.keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
    this.maxKeys = options.maxKeys && options.maxKeys > 0 ? options.maxKeys : 20_000;

    // Periodic cleanup of expired entries to prevent memory leaks
    const cleanupInterval = Math.max(10_000, this.windowMs);
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);

    // Unref timer so it never prevents the Node process from terminating
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  public get max(): number {
    return getAiRateLimitMax(this.optionsMax);
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.store.entries()) {
      const valid = timestamps.filter(t => (now - t) < this.windowMs);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, valid);
      }
    }
  }

  public reset(): void {
    this.store.clear();
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  public getStoreSize(): number {
    return this.store.size;
  }

  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = this.keyGenerator(req);
    const max = this.max;
    const windowMs = this.windowMs;

    let timestamps = this.store.get(key) || [];
    // Prune entries outside the sliding window
    timestamps = timestamps.filter(t => (now - t) < windowMs);

    if (timestamps.length >= max) {
      const oldest = timestamps[0];
      const timeRemainingMs = Math.max(0, (oldest + windowMs) - now);
      const retryAfterSec = Math.max(1, Math.ceil(timeRemainingMs / 1000));

      res.setHeader('Retry-After', retryAfterSec.toString());
      res.setHeader('RateLimit-Limit', max.toString());
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', retryAfterSec.toString());

      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: retryAfterSec
      });
      return;
    }

    if (!this.store.has(key) && this.store.size >= this.maxKeys) {
      this.cleanup();
      if (this.store.size >= this.maxKeys) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ error: 'Too Many Requests', retryAfter: 60 });
        return;
      }
    }

    // Record this request
    timestamps.push(now);
    this.store.set(key, timestamps);

    const remaining = Math.max(0, max - timestamps.length);
    const oldest = timestamps[0];
    const resetSec = Math.max(1, Math.ceil(((oldest + windowMs) - now) / 1000));

    res.setHeader('RateLimit-Limit', max.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Reset', resetSec.toString());

    next();
  };
}

export function createRateLimiter(options?: RateLimiterOptions): SlidingWindowRateLimiter {
  return new SlidingWindowRateLimiter(options);
}

export function limitAiRequestBody(req: Request, res: Response, next: NextFunction): void {
  const bodyBytes = Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8');
  if (bodyBytes > 64 * 1024) {
    res.status(413).json({ error: 'AI request content exceeds the 64 KB limit.' });
    return;
  }
  next();
}

// Default singleton instance configured for AI endpoints
export const aiRateLimiterInstance = new SlidingWindowRateLimiter();
export const aiRateLimiter = aiRateLimiterInstance.middleware;
export const apiRateLimiterInstance = new SlidingWindowRateLimiter({
  max: 300,
  windowMs: 15 * 60_000,
  keyGenerator: ipKeyGenerator,
});
export const apiRateLimiter = apiRateLimiterInstance.middleware;
export const loginRateLimiterInstance = new SlidingWindowRateLimiter({
  max: 10,
  windowMs: 15 * 60_000,
  keyGenerator: ipKeyGenerator,
});
export const loginRateLimiter = loginRateLimiterInstance.middleware;
export const registerRateLimiterInstance = new SlidingWindowRateLimiter({
  max: 5,
  windowMs: 60 * 60_000,
  keyGenerator: ipKeyGenerator,
});
export const registerRateLimiter = registerRateLimiterInstance.middleware;
export const treeMutationRateLimiterInstance = new SlidingWindowRateLimiter({
  max: 5,
  windowMs: 60_000,
  keyGenerator: ipKeyGenerator,
});
export const treeMutationRateLimiter = treeMutationRateLimiterInstance.middleware;

// -----------------------------------------------------------------------------
// OWASP Account-Level Login Throttling (Defense against credential stuffing)
// -----------------------------------------------------------------------------
interface FailedLoginState {
  attempts: number;
  lockUntil: number;
}
const failedLoginTracker = new Map<string, FailedLoginState>();

export function recordFailedLogin(identity: string): void {
  const key = identity.trim().toLowerCase();
  const current = failedLoginTracker.get(key) || { attempts: 0, lockUntil: 0 };
  current.attempts += 1;
  // Exponential progressive delay after 5 failed attempts
  if (current.attempts >= 5) {
    const exponent = Math.min(current.attempts - 5, 6);
    const lockoutMs = Math.min(60_000 * Math.pow(2, exponent), 30 * 60_000); // 1m up to 30m max
    current.lockUntil = Date.now() + lockoutMs;
  }
  failedLoginTracker.set(key, current);
}

export function resetFailedLogin(identity: string): void {
  failedLoginTracker.delete(identity.trim().toLowerCase());
}

export function checkLoginThrottled(identity: string): { throttled: boolean; retryAfterSec?: number } {
  const current = failedLoginTracker.get(identity.trim().toLowerCase());
  if (!current || current.lockUntil <= Date.now()) {
    return { throttled: false };
  }
  const retryAfterSec = Math.max(1, Math.ceil((current.lockUntil - Date.now()) / 1000));
  return { throttled: true, retryAfterSec };
}

// -----------------------------------------------------------------------------
// Global Daily AI Quota / Spend Safeguard (Protects LLM provider budget)
// -----------------------------------------------------------------------------
const dailyAiTracker = {
  count: 0,
  resetAt: Date.now() + 24 * 60 * 60_000,
};

export function aiQuotaGuard(_req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (now > dailyAiTracker.resetAt) {
    dailyAiTracker.count = 0;
    dailyAiTracker.resetAt = now + 24 * 60 * 60_000;
  }

  const maxDaily = Number.parseInt(process.env.AI_DAILY_QUOTA_MAX || '2000', 10);
  if (dailyAiTracker.count >= maxDaily) {
    const retryAfter = Math.max(1, Math.ceil((dailyAiTracker.resetAt - now) / 1000));
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({
      error: 'Global AI daily quota limit reached. Please retry tomorrow or contact administrator.',
      retryAfter
    });
    return;
  }

  dailyAiTracker.count += 1;
  next();
}

export default aiRateLimiter;
