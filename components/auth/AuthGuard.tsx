"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/storage/auth";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      setReady(false);
      const nextPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/";
      const result = await getMe();
      if (!active) {
        return;
      }

      if (result.ok) {
        setReady(true);
        return;
      }

      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    };

    void verify();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[hsl(var(--background))] px-4">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-[0_10px_26px_rgba(44,70,99,0.1)]">
          正在验证登录状态...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
