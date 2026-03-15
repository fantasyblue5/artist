import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "@/components/workspace/types";
import { ChevronLeft, ChevronRight, History, Trash2 } from "lucide-react";

type HistoryDrawerProps = {
  isOpen: boolean;
  historyItems: HistoryItem[];
  onToggle: () => void;
  onDeleteItem: (id: string) => void;
  onSelectItem: (item: HistoryItem) => void;
};

const ITEMS_PER_PAGE = 4;

export function HistoryDrawer({
  isOpen,
  historyItems,
  onToggle,
  onDeleteItem,
  onSelectItem,
}: HistoryDrawerProps) {
  const [page, setPage] = useState(0);
  const isEmpty = historyItems.length === 0;
  const totalPages = Math.max(1, Math.ceil(historyItems.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return historyItems.slice(start, start + ITEMS_PER_PAGE);
  }, [historyItems, page]);

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

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isEmpty ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] px-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <History className="mb-2 h-5 w-5" />
                <p>暂无生成历史图片。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagedItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                    onClick={() => onSelectItem(item)}
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[hsl(var(--muted)/0.32)]">
                      <img
                        src={item.imageSrc}
                        alt={item.prompt || "生成历史图片"}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        draggable={false}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-[rgba(255,255,255,0.92)] text-[hsl(var(--foreground))] opacity-0 shadow-[0_8px_20px_rgba(43,67,95,0.16)] transition group-hover:opacity-100"
                      aria-label="删除历史图片"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="px-3 py-3">
                      {item.prompt ? (
                        <p className="line-clamp-2 text-sm leading-6 text-[hsl(var(--foreground))]">
                          {item.prompt}
                        </p>
                      ) : null}
                      <p className={cn("text-xs text-[hsl(var(--muted-foreground))]", item.prompt ? "mt-1" : "")}>
                        {item.createdAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[hsl(var(--border))] p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isEmpty || page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />上一页
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={isEmpty || page >= totalPages - 1}
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              >
                下一页<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </aside>
  );
}
