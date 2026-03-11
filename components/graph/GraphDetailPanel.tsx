"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Link2, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getNodeNote, setNodeNote } from "@/lib/library/storage";
import type { GraphNodeRecord } from "@/lib/resource-types";

type GraphDetailPanelProps = {
  node: GraphNodeRecord | null;
  nodeMap: Record<string, GraphNodeRecord>;
  onSelectNode: (nodeId: string) => void;
  onToggleFavorite: (nodeId: string) => void;
  onOpenAssets: (nodeId: string) => void;
};

export function GraphDetailPanel({
  node,
  nodeMap,
  onSelectNode,
  onToggleFavorite,
  onOpenAssets,
}: GraphDetailPanelProps) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setNote("");
      return;
    }
    setNote(getNodeNote(node.id));
  }, [node]);

  const children = useMemo(
    () => (node ? node.children.map((id) => nodeMap[id]).filter(Boolean) : []),
    [node, nodeMap],
  );

  const related = useMemo(() => {
    if (!node) {
      return [] as GraphNodeRecord[];
    }
    const ids = new Set<string>();
    if (node.parent) {
      ids.add(node.parent);
    }
    node.siblingIds.slice(0, 5).forEach((id) => ids.add(id));
    return Array.from(ids).map((id) => nodeMap[id]).filter(Boolean);
  }, [node, nodeMap]);

  if (!node) {
    return (
      <Card className="h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
        <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="h-16 w-16 rounded-3xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.78)]" />
          <div className="text-lg font-semibold">请选择一个节点</div>
          <div className="max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">单击图谱节点后，这里会显示路径、解释、子节点和关联资源入口。</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[22px] font-semibold tracking-tight">{node.label}</div>
              <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">第 {node.level} 层 · {node.isLeaf ? "叶子节点" : "分支节点"}</div>
            </div>
            <Button type="button" variant={node.favorite ? "default" : "outline"} size="sm" onClick={() => onToggleFavorite(node.id)}>
              <Heart className={`mr-1.5 h-4 w-4 ${node.favorite ? "fill-current" : ""}`} />
              收藏
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
            {node.path.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-1">
                <span>{item}</span>
                {index < node.path.length - 1 ? <span>/</span> : null}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-4">
          <div className="mb-2 text-sm font-medium">节点解释</div>
          <div className="text-sm leading-7 text-[hsl(var(--foreground))]">
            {node.description || (node.isLeaf ? "当前叶子节点暂未补充说明。" : "当前节点用于组织更细粒度的评价结构。")}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 text-sm font-medium">子节点</div>
          <div className="flex flex-wrap gap-2">
            {children.length > 0 ? (
              children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className="rounded-full border border-[hsl(var(--border)/0.72)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.32)] hover:text-[hsl(var(--primary))]"
                  onClick={() => onSelectNode(child.id)}
                >
                  {child.label}
                </button>
              ))
            ) : (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">当前节点没有子节点。</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 text-sm font-medium">相关节点</div>
          <div className="flex flex-wrap gap-2">
            {related.length > 0 ? (
              related.map((relatedNode) => (
                <button
                  key={relatedNode.id}
                  type="button"
                  className="rounded-full border border-[hsl(var(--border)/0.72)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.32)] hover:text-[hsl(var(--primary))]"
                  onClick={() => onSelectNode(relatedNode.id)}
                >
                  {relatedNode.label}
                </button>
              ))
            ) : (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">暂无相关节点。</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenAssets(node.id)}>
            <Palette className="mr-1.5 h-4 w-4" />
            查看关联素材
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(node.path.join(" / "));
              setMessage("路径已复制");
              window.setTimeout(() => setMessage(null), 1500);
            }}
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            复制路径
          </Button>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">个人备注</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNodeNote(node.id, note.trim());
                setMessage("备注已保存");
                window.setTimeout(() => setMessage(null), 1500);
              }}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              保存
            </Button>
          </div>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[132px]" placeholder="记录当前节点的观察、应用方式或创作提示。" />
        </div>

        {message ? <div className="rounded-xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--accent)/0.76)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">{message}</div> : null}
      </CardContent>
    </Card>
  );
}
