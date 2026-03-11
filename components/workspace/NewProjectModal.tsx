"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateProjectInput } from "@/lib/storage/projects";
import { X } from "lucide-react";

type NewProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateProjectInput) => Promise<void>;
};

export function NewProjectModal({ open, onOpenChange, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState("未命名项目");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const addTag = (value: string) => {
    const next = value.trim();
    if (!next || tags.includes(next)) {
      return;
    }
    setTags((prev) => [...prev, next]);
  };

  const resetState = () => {
    setName("未命名项目");
    setTagInput("");
    setTags([]);
  };

  const handleCreate = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    await onCreate({
      name: name.trim(),
      tags,
    });
    setSubmitting(false);
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetState();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>创建一个新的创作项目并立即进入编辑器。</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">项目名</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              placeholder="输入项目名"
            />
          </label>

          <div className="space-y-1.5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">标签</p>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              disabled={submitting}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag(tagInput);
                  setTagInput("");
                }
              }}
              className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              placeholder="输入后按 Enter 添加"
            />
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-[hsl(var(--muted-foreground))]"
                    disabled={submitting}
                    onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || submitting}>
            创建并进入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
