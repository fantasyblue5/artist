"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/workspace/UserMenu";
import { getMe, type AuthUser } from "@/lib/storage/auth";
import { cn } from "@/lib/utils";
import { Database, LayoutDashboard, Palette, Search, Sparkles, type LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

const navItems: NavItem[] = [
  { label: "工作台", icon: LayoutDashboard, href: "/workspace" },
  { label: "创作项目", icon: Sparkles, href: "/editor" },
  { label: "资料库", icon: Database, href: "/library" },
];

type TopbarProps = {
  projectName?: string;
  saveStatusText?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/editor") {
    return pathname.startsWith("/editor") || pathname.startsWith("/create-project");
  }
  return pathname.startsWith(href);
}

export function Topbar({ projectName, saveStatusText }: TopbarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    const result = await getMe();
    if (result.ok) {
      setUser(result.data.user);
      return;
    }
    setUser(null);
  }, []);

  useEffect(() => {
    void refreshUser();

    const onSync = () => {
      void refreshUser();
    };

    window.addEventListener("focus", onSync);
    window.addEventListener("auth:user-updated", onSync);

    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener("auth:user-updated", onSync);
    };
  }, [refreshUser]);

  return (
    <header className="h-16 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] px-4 backdrop-blur md:px-6">
      <div className="flex h-16 w-full items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
            <Palette className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold tracking-tight">艺术家 Workspace</div>
            {projectName || saveStatusText ? (
              <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                {projectName ? `当前项目：${projectName}` : ""}
                {projectName && saveStatusText ? " · " : ""}
                {saveStatusText || ""}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1 px-1 md:px-3">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="全局搜索项目、标签、模板..."
              className="h-10 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 lg:flex">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-8 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_8px_20px_rgba(73,111,156,0.25)]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]",
                  )}
                >
                  <Icon className="mr-1.5 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <UserMenu
            user={user}
            onUserUpdated={(nextUser) => {
              setUser(nextUser);
            }}
          />
        </div>
      </div>
    </header>
  );
}
