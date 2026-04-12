/**
 * Base URL for all API calls.
 * - Production (Vercel): NEXT_PUBLIC_API_URL points to the Railway API server.
 * - Local dev / Railway itself: empty string → relative paths work as-is.
 */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

const TOKEN_KEY = "session_token";
const USER_KEY = "session_user";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "it_staff" | "end_user";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** fetch() wrapper that injects Authorization: Bearer <token> */
export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
