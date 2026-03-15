"use client";

import { Button } from "@/components/ui/button";
import type { AnalysisImageSource, AnalysisViewState } from "@/components/workspace/analysis/types";
import { ImagePlus, Import, RefreshCcw, Sparkles } from "lucide-react";
import type { HistoryItem } from "@/components/workspace/types";

type AnalysisSourcePanelProps = {
  image: AnalysisImageSource | null;
  status: AnalysisViewState;
  canImportGenerated: boolean;
  historyItems: HistoryItem[];
  onPickLocal: () => void;
  onImportGenerated: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onStartAnalysis: () => void;
};

function getStatusText(status: AnalysisViewState) {
  switch (status) {
    case "empty":
      return "等待导入";
    case "image_ready":
      return "待分析";
    case "analyzing":
      return "分析中";
    case "analyzed":
      return "已完成";
    default:
      return "待分析";
  }
}

export function AnalysisSourcePanel({
  image,
  status,
  canImportGenerated,
  historyItems,
  onPickLocal,
  onImportGenerated,
  onSelectHistoryItem,
  onStartAnalysis,
}: AnalysisSourcePanelProps) {
  const statusText = getStatusText(status);
  const showStatusBadge = status === "analyzing" || status === "analyzed";

  return (
    <div className="flex h-full w-[350px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] shadow-[0_10px_28px_rgba(44,70,99,0.08)]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="text-sm font-semibold">画面分析</div>
        {showStatusBadge ? (
          <div className="rounded-full bg-[hsl(var(--accent))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--primary))]">
            {statusText}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <section className="rounded-2xl border border-[hsl(var(--border)/0.86)] bg-[hsl(var(--background))] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
            <ImagePlus className="h-4 w-4 text-[hsl(var(--primary))]" />
            图片导入
          </div>
          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={onPickLocal}>
              本地上传
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={onImportGenerated}
              disabled={!canImportGenerated}
            >
              <Import className="mr-1.5 h-4 w-4" />
              导入当前结果
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border)/0.86)] bg-[hsl(var(--background))] p-4">
          <div className="text-sm font-semibold text-[hsl(var(--foreground))]">当前作品</div>
          {image ? (
            <div className="mt-3 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.78)] bg-white">
                <img src={image.src} alt={image.name} className="h-40 w-full object-cover" />
              </div>
              <div>
                <div className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{image.name}</div>
                <div className="mt-2 inline-flex rounded-full bg-[hsl(var(--muted)/0.72)] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                  {image.origin === "generation"
                    ? "当前生成结果"
                    : image.origin === "shortcut"
                      ? "快捷带入"
                      : "本地上传"}
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={onPickLocal}>
                <RefreshCcw className="mr-1.5 h-4 w-4" />
                重新选择
              </Button>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] px-4 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              未导入图片
            </div>
          )}
        </section>

        {historyItems.length > 0 ? (
          <section className="rounded-2xl border border-[hsl(var(--border)/0.86)] bg-[hsl(var(--background))] p-4">
            <div className="text-sm font-semibold text-[hsl(var(--foreground))]">历史生成结果</div>
            <div className="mt-3 space-y-2">
              {historyItems.slice(0, 6).map((item) => {
                const isActive = image?.src === item.imageSrc;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectHistoryItem(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-2 py-2 text-left transition ${
                      isActive
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent)/0.7)]"
                        : "border-[hsl(var(--border)/0.75)] bg-white hover:border-[hsl(var(--primary)/0.42)] hover:bg-[hsl(var(--accent)/0.4)]"
                    }`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.35)]">
                      <img src={item.imageSrc} alt={item.prompt || "历史生成结果"} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm leading-5 text-[hsl(var(--foreground))]">
                        {item.prompt || "历史生成结果"}
                      </div>
                      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.createdAt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <div className="border-t border-[hsl(var(--border))] p-4">
        <Button className="w-full" onClick={onStartAnalysis} disabled={!image || status === "analyzing"}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {status === "analyzing" ? "分析中..." : "开始分析"}
        </Button>
      </div>
    </div>
  );
}
