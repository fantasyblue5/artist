"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountSettingsDialog } from "@/components/account/AccountSettingsDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout, type AuthUser } from "@/lib/storage/auth";
import { Loader2, LogOut, Settings } from "lucide-react";

type UserMenuProps = {
  user: AuthUser | null;
  onUserUpdated?: (user: AuthUser) => void;
};

export function UserMenu({ user, onUserUpdated }: UserMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setOpen(false);
    window.dispatchEvent(new Event("auth:user-updated"));
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)]"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Avatar className="h-10 w-10 border border-[hsl(var(--border))] bg-[hsl(var(--accent))] text-sm font-semibold">
            <AvatarFallback>{user?.initials ?? "?"}</AvatarFallback>
          </Avatar>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-[0_14px_34px_rgba(44,70,99,0.16)]"
          >
            <div className="rounded-xl px-3 py-2">
              <div className="text-[11px] text-[hsl(var(--muted-foreground))]">当前账号</div>
              <div className="truncate text-sm font-medium">{user?.email ?? "未登录"}</div>
              {user?.displayName ? (
                <div className="truncate pt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {user.displayName}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              role="menuitem"
              className="flex h-9 w-full items-center rounded-xl px-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              账户设置
            </button>

            <div className="my-1 h-px bg-[hsl(var(--border))]" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex h-9 w-full items-center rounded-xl px-3 text-sm text-[hsl(2_48%_44%)] transition hover:bg-[hsl(2_68%_96%)]"
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              退出登录
            </button>
          </div>
        ) : null}
      </div>

      <AccountSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        onSaved={(next) => {
          onUserUpdated?.(next);
        }}
      />
    </>
  );
}
