/**
 * Rate Limiter - Token Bucket Implementation
 * LYFYE Marketing Studio
 */

import { NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  name: string;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export const RATE_LIMITS = {
  mia: {
    maxRequests: 30,
    windowSeconds: 60,
    name: 'mia-ai',
  } as RateLimitConfig,

  content: {
    maxRequests: 60,
    windowSeconds: 60,
    name: 'content-crud',
  } as RateLimitConfig,

  publish: {
    maxRequests: 10,
    windowSeconds: 60,
    name: 'publish',
  } as RateLimitConfig,

  video: {
    maxRequests: 5,
    windowSeconds: 60,
    name: 'video-render',
  } as RateLimitConfig,

  general: {
    maxRequests: 120,
    windowSeconds: 60,
    name: 'general',
  } as RateLimitConfig,
};

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;

    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(
        () => this.cleanup(),
        5 * 60 * 1000
      );
      if (this.cleanupInterval && 'unref' in this.cleanupInterval) {
        (this.cleanupInterval as NodeJS.Timeout).unref();
      }
    }
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const key = `${this.config.name}:${identifier}`;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests - 1,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
      return {
        allowed: true,
        remaining: bucket.tokens,
        retryAfter: 0,
      };
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd =
      (elapsed / this.config.windowSeconds) * this.config.maxRequests;

    bucket.tokens = Math.min(
      this.config.maxRequests,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const tokensNeeded = 1 - bucket.tokens;
      const secondsPerToken =
        this.config.windowSeconds / this.config.maxRequests;
      const retryAfter = Math.ceil(tokensNeeded * secondsPerToken);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfter: 0,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = this.config.windowSeconds * 2 * 1000;

    this.buckets.forEach((bucket, key) => {
      if (now - bucket.lastRefill > staleThreshold) {
        this.buckets.delete(key);
      }
    });
  }

  stats(): { activeUsers: number; name: string } {
    return {
      activeUsers: this.buckets.size,
      name: this.config.name,
    };
  }
}

const limiters = new Map<string, RateLimiter>();

export function rateLimit(config: RateLimitConfig): RateLimiter {
  let limiter = limiters.get(config.name);
  if (!limiter) {
    limiter = new RateLimiter(config);
    limiters.set(config.name, limiter);
  }
  return limiter;
}

export function applyRateLimit(
  config: RateLimitConfig,
  identifier: string
): NextResponse | null {
  const limiter = rateLimit(config);
  const result = limiter.check(identifier);

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        limit: config.maxRequests,
        window: `${config.windowSeconds}s`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
        },
      }
    );
  }

  return null;
}
