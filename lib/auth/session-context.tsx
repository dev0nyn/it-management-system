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

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          const user: SessionUser = await res.json();
          setState({ user, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      })
      .catch(() => {
        setState({ user: null, loading: false });
      });
  }, []);

  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext(): SessionState {
  const ctx = useContext(SessionContext);
  if (ctx === undefined) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return ctx;
}

/** Alias for useSessionContext — use either name */
export const useSession = useSessionContext;
