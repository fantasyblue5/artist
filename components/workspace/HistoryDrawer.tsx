import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "@/components/workspace/types";
import { ChevronLeft, ChevronRight, History } from "lucide-react";

type HistoryDrawerProps = {
  isOpen: boolean;
  historyItems: HistoryItem[];
  onToggle: () => void;
};

export function HistoryDrawer({ isOpen, historyItems, onToggle }: HistoryDrawerProps) {
  const isEmpty = historyItems.length === 0;

  return (
    <aside
      className={cn(
        "relative h-full shrink-0 transition-[width] duration-300",
        isOpen ? "w-[320px]" : "w-14",
      )}
    >
      {!isOpen ? (
        <div className="flex h-full items-start justify-center pt-5">
          <Button
            onClick={onToggle}
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl"
            aria-label="展开历史记录"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
            <h3 className="text-sm font-semibold">历史记录</h3>
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={onToggle}>
              收起<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {isEmpty ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] px-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <History className="mb-2 h-5 w-5" />
                <p>暂无历史记录。你生成/分析后的结果会出现在这里。</p>
              </div>
            ) : (
              historyItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2"
                >
                  <p className="max-h-20 overflow-hidden text-sm leading-6 text-[hsl(var(--foreground))]">
                    {item.summary}
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {item.createdAt}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[hsl(var(--border))] p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1" disabled={isEmpty}>
                <ChevronLeft className="mr-1 h-4 w-4" />上一页
              </Button>
              <Button variant="outline" className="flex-1" disabled={isEmpty}>
                下一页<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </aside>
  );
}
