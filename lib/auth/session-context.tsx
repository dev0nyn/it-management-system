"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "it_staff" | "end_user";
  /** Display name — not currently returned by /api/auth/me (JWT payload omits it). */
  name?: string;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
}

const SessionContext = createContext<SessionState>({
  user: null,
  loading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<SessionUser>;
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
