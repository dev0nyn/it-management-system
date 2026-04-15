import Redis from "ioredis";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 60;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[rate-limit] REDIS_URL not set — rate limiting disabled");
    return null;
  }
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    redis.on("error", (err) => {
      console.warn("[rate-limit] Redis connection error — rate limiting disabled:", err.message);
    });
    return redis;
  } catch {
    return null;
  }
}

/**
 * Redis-backed sliding window rate limiter.
 * Checks both per-IP and per-email keys.
 * Returns true if the request should be blocked.
 *
 * Fail-open: if Redis is unavailable, requests are allowed through.
 */
export async function isRateLimited(ip: string, email?: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false; // fail-open

  try {
    const keys = [`rate:ip:${ip}`];
    if (email) keys.push(`rate:email:${email}`);

    for (const key of keys) {
      const count = await client.get(key);
      if (count !== null && parseInt(count, 10) >= RATE_LIMIT_MAX) {
        return true;
      }
    }
    return false;
  } catch {
    return false; // fail-open on Redis errors
  }
}

/**
 * Record a failed login attempt for both IP and email keys.
 * Only call this after a failed authentication — successful logins don't consume quota.
 */
export async function recordFailedAttempt(ip: string, email: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const keys = [`rate:ip:${ip}`, `rate:email:${email}`];
    for (const key of keys) {
      const multi = client.multi();
      multi.incr(key);
      multi.expire(key, RATE_LIMIT_WINDOW_SEC);
      await multi.exec();
    }
  } catch {
    // Silently fail — rate limiting is best-effort
  }
}

// Railway Redis integration plan:
// TODO: On Railway, provision a Redis plugin and set REDIS_URL in the service env.
// Railway Redis uses `rediss://` (TLS) URLs — ioredis handles these natively.
// No code changes needed beyond setting the env var.
