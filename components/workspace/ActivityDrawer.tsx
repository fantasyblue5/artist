"use client";

import { Button } from "@/components/ui/button";
import type { ActivityItem } from "@/lib/storage/activity";
import type { Project } from "@/lib/storage/projects";
import { cn } from "@/lib/utils";
import { Activity, Clock3, X } from "lucide-react";

type ActivityDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentProjects: Project[];
  recentImports: ActivityItem[];
  recentGenerates: ActivityItem[];
  onOpenProject: (id: string) => void;
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function ActivityDrawer({
  open,
  onOpenChange,
  recentProjects,
  recentImports,
  recentGenerates,
  onOpenProject,
}: ActivityDrawerProps) {
  return (
    <>
      {!open ? (
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 top-1/2 z-30 h-11 w-11 -translate-y-1/2 rounded-full"
          onClick={() => onOpenChange(true)}
          title="活动"
        >
          <Activity className="h-4 w-4" />
        </Button>
      ) : null}

      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-40 bg-[rgba(20,30,46,0.2)] opacity-0 transition",
          open ? "pointer-events-auto opacity-100" : "",
        )}
        onClick={() => onOpenChange(false)}
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[340px] border-l border-[hsl(var(--border))] bg-[hsl(var(--card)/0.98)] p-4 shadow-[-16px_0_34px_rgba(34,53,77,0.12)] transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">活动</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto pr-1">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              最近打开
            </h4>
            <div className="space-y-2">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-left text-sm hover:bg-[hsl(var(--accent))]"
                    onClick={() => onOpenProject(project.id)}
                  >
                    <div className="line-clamp-1 font-medium">{project.name}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTime(project.lastOpenedAt ?? project.updatedAt)}
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  暂无最近打开项目
                </p>
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              最近导入
            </h4>
            <div className="space-y-2">
              {recentImports.length > 0 ? (
                recentImports.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[hsl(var(--border))] p-2 text-sm">
                    <div className="line-clamp-1">{item.title}</div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {formatTime(item.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  暂无导入记录
                </p>
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              最近生成
            </h4>
            <div className="space-y-2">
              {recentGenerates.length > 0 ? (
                recentGenerates.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[hsl(var(--border))] p-2 text-sm">
                    <div className="line-clamp-1">{item.title}</div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {formatTime(item.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  暂无生成记录
                </p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
