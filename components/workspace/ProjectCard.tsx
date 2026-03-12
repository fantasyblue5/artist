"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/storage/projects";
import { Clock3, Copy, Edit3, FolderOpen, Trash2 } from "lucide-react";

type ProjectCardProps = {
  project: Project;
  compact?: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(timestamp?: number) {
  if (!timestamp) {
    return "未打开";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function ProjectCard({
  project,
  compact = false,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-[22px] border-[hsl(var(--border)/0.88)] bg-[hsl(var(--card)/0.92)] shadow-[0_4px_14px_rgba(46,70,99,0.06)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] hover:shadow-[0_10px_22px_rgba(46,70,99,0.1)]">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="block w-full cursor-pointer text-left"
      >
        <div
          className={compact ? "h-24" : "h-28"}
          style={{
            background: project.coverThumb
              ? `center / cover no-repeat url(${project.coverThumb})`
              : "linear-gradient(138deg, rgba(203,219,238,0.84), rgba(182,206,232,0.74) 42%, rgba(168,195,225,0.74))",
          }}
        >
          {!project.coverThumb ? <div className="h-full w-full bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.35),transparent_38%),repeating-linear-gradient(to_right,rgba(113,141,176,0.08)_0,rgba(113,141,176,0.08)_1px,transparent_1px,transparent_20px),repeating-linear-gradient(to_bottom,rgba(113,141,176,0.08)_0,rgba(113,141,176,0.08)_1px,transparent_1px,transparent_20px)]" /> : null}
        </div>

        <div className="space-y-2 px-3.5 py-3">
          <div className="line-clamp-1 text-sm font-semibold leading-5 text-[hsl(var(--foreground))]">{project.name}</div>

          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{formatDate(project.lastOpenedAt ?? project.updatedAt)}</span>
          </div>

          <div className="flex min-h-6 flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.7)] px-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>

      <div className="pointer-events-none absolute right-2 top-2 flex translate-y-1 items-center gap-1 rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.86)] p-1 opacity-0 shadow-[0_4px_14px_rgba(46,70,99,0.1)] backdrop-blur transition-all group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full border-none bg-transparent shadow-none"
          onClick={() => onOpen(project.id)}
          title="继续编辑"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full border-none bg-transparent shadow-none"
          onClick={() => onRename(project.id)}
          title="重命名"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full border-none bg-transparent shadow-none"
          onClick={() => onDuplicate(project.id)}
          title="复制"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full border-none bg-transparent shadow-none"
          onClick={() => onDelete(project.id)}
          title="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
