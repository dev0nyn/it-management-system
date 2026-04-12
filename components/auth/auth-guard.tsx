"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api-client";

function subscribeNoop() {
  return () => {};
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeNoop,
    () => getToken(),
    () => null,
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  if (!token) return null;
  return <>{children}</>;
}
