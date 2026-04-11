/**
 * Returns the base URL for all API calls.
 *
 * - In production (Vercel): NEXT_PUBLIC_API_URL points to the Railway API server.
 * - In local dev (no env var set): falls back to "" so relative paths work against
 *   the Next.js dev server (which proxies /api/* locally).
 */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}
