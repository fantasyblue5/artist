"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type AuthUser, updateMe } from "@/lib/storage/auth";
import { Loader2 } from "lucide-react";

type AccountSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null;
  onSaved?: (user: AuthUser) => void;
};

export function AccountSettingsDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: AccountSettingsDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDisplayName(user?.displayName ?? "");
    setError("");
    setSuccess("");
    setLoading(false);
  }, [open, user]);

  const submit = async () => {
    setError("");
    setSuccess("");
    const nextName = displayName.trim();

    if (nextName.length < 2 || nextName.length > 20) {
      setError("用户名长度需为 2-20 个字符");
      return;
    }

    setLoading(true);
    const result = await updateMe({ displayName: nextName });
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message || "保存失败，请稍后再试");
      return;
    }

    setSuccess("保存成功");
    onSaved?.(result.data.user);
    window.dispatchEvent(new Event("auth:user-updated"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>账户设置</DialogTitle>
          <DialogDescription>修改显示用户名，保存后会同步到工作台头像。</DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-1.5">
          <label htmlFor="display-name" className="block text-sm font-medium">
            用户名
          </label>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="输入 2-20 个字符"
            className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
          />
          {error ? <p className="text-xs text-[hsl(2_64%_45%)]">{error}</p> : null}
          {success ? <p className="text-xs text-[hsl(160_44%_34%)]">{success}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
