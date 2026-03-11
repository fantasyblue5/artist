"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/lib/storage/auth";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  const nextPath = useMemo(() => {
    const search = searchParams.toString();
    return `${pathname}${search ? `?${search}` : ""}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      setReady(false);
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
  }, [nextPath, router]);

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
