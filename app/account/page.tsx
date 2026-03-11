"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/workspace/Topbar";
import { getMe, logout, type AuthUser } from "@/lib/storage/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const result = await getMe();
      if (!active) {
        return;
      }
      if (result.ok) {
        setUser(result.data.user);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthGuard>
      <div className="h-screen w-screen overflow-hidden bg-[hsl(var(--background))]">
        <Topbar />
        <main className="grid h-[calc(100vh-64px)] place-items-center px-4">
          <Card className="w-full max-w-xl rounded-3xl border-[hsl(var(--border))] bg-[hsl(var(--card)/0.98)]">
            <CardHeader>
              <CardTitle className="text-base">账户信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-5">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.36)] p-4">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">邮箱</p>
                <p className="mt-1 text-sm font-medium">{user?.email ?? "-"}</p>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.36)] p-4">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">用户名</p>
                <p className="mt-1 text-sm font-medium">{user?.displayName || "-"}</p>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.36)] p-4">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">头像缩写</p>
                <p className="mt-1 text-sm font-medium">{user?.initials ?? "-"}</p>
              </div>

              <Button
                className="w-full"
                onClick={async () => {
                  await logout();
                  window.dispatchEvent(new Event("auth:user-updated"));
                  router.replace("/login");
                }}
              >
                退出登录
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
