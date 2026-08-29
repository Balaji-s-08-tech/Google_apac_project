import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * In-Memory Sliding Window Rate Limiter
 * - Keyed exclusively by verified req.user.uid (never from client-supplied body/headers)
 * - Automatically evicts stale timestamp records to prevent memory leaks
 * - Clean, lightweight, self-contained for Cloud Run deployment
 */
class SlidingWindowRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxRequests: number = 20, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodic sweep every 5 minutes to clean up users with no recent activity
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Unref so it doesn't block process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public check(uid: string): { allowed: boolean; remaining: number; resetTimeMs: number; retryAfterSeconds: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let userRecord = this.records.get(uid);
    if (!userRecord) {
      userRecord = { timestamps: [] };
      this.records.set(uid, userRecord);
    }

    // Filter out timestamps outside the sliding window
    userRecord.timestamps = userRecord.timestamps.filter((ts) => ts > windowStart);

    if (userRecord.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = userRecord.timestamps[0];
      const resetTimeMs = oldestTimestamp + this.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

      return {
        allowed: false,
        remaining: 0,
        resetTimeMs,
        retryAfterSeconds,
      };
    }

    // Record this request
    userRecord.timestamps.push(now);
    const remaining = this.maxRequests - userRecord.timestamps.length;
    const resetTimeMs = now + this.windowMs;

    return {
      allowed: true,
      remaining,
      resetTimeMs,
      retryAfterSeconds: 0,
    };
  }

  private cleanup(): void {
    const windowStart = Date.now() - this.windowMs;
    for (const [uid, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.records.delete(uid);
      }
    }
  }
}

// 20 requests per minute per authenticated user for Gemini AI interactions
export const chatRateLimiter = new SlidingWindowRateLimiter(20, 60 * 1000);

/**
 * Express Middleware for chat rate limiting
 * MUST be placed AFTER authenticate middleware so req.user.uid is cryptographically verified.
 */
export function chatRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required before rate limiting evaluation.',
      code: 'AUTH_REQUIRED',
    });
  }

  const verifiedUid = req.user.uid;
  const result = chatRateLimiter.check(verifiedUid);

  // Set standard rate limit headers
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfterSeconds.toString());
    return res.status(429).json({
      error: `Too many chat requests. Rate limit exceeded. Please wait ${result.retryAfterSeconds} seconds before sending another message.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfterSeconds,
    });
  }

  next();
}
