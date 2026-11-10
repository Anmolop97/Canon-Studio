import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
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
  public windowMs: number;
  public keyGenerator: (req: Request) => string;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? (
      process.env.RATE_LIMIT_AI_WINDOW_MS
        ? parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS, 10) || 60_000
        : 60_000
    );
    this.optionsMax = options.max;
    this.keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

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

// Default singleton instance configured for AI endpoints
export const aiRateLimiterInstance = new SlidingWindowRateLimiter();
export const aiRateLimiter = aiRateLimiterInstance.middleware;

export default aiRateLimiter;
