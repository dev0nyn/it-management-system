"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  if (!authorized) return null;
  return <>{children}</>;
}
