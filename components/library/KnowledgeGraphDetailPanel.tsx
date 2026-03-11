"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Heart, ListTree, Save, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getNodeNote, setNodeNote } from "@/lib/library/storage";
import type { KnowledgeGraphNode } from "@/lib/library/types";

type KnowledgeGraphDetailPanelProps = {
  node: KnowledgeGraphNode | null;
  nodeMap: Record<string, KnowledgeGraphNode>;
  onSelectNode: (nodeId: string) => void;
  onToggleFavorite: (nodeId: string) => void;
  onFocusBranch: (nodeId: string) => void;
};

function levelLabel(level: number) {
  const labels = ["根节点", "一级目录", "二级目录", "三级目录", "四级目录", "五级目录", "六级目录"];
  return labels[level] ?? `${level}级`;
}

function defaultDescription(node: KnowledgeGraphNode | null) {
  if (!node) {
    return "";
  }

  if (node.description?.trim()) {
    return node.description.trim();
  }

  if (node.isLeaf) {
    return "这是一个可直接用于生成控制/评价的细粒度属性，当前叶子节点暂未补充更详细的备注。";
  }

  return "这是一个中间层级节点，可继续向下展开查看更细粒度的评价属性。";
}

export function KnowledgeGraphDetailPanel({
  node,
  nodeMap,
  onSelectNode,
  onToggleFavorite,
  onFocusBranch,
}: KnowledgeGraphDetailPanelProps) {
  const [noteText, setNoteText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setNoteText("");
      return;
    }

    setNoteText(getNodeNote(node.id));
  }, [node]);

  const breadcrumbNodes = useMemo(() => {
    if (!node) {
      return [] as KnowledgeGraphNode[];
    }

    return node.pathIds.map((id) => nodeMap[id]).filter((item): item is KnowledgeGraphNode => Boolean(item));
  }, [node, nodeMap]);

  const childNodes = useMemo(() => {
    if (!node) {
      return [] as KnowledgeGraphNode[];
    }

    return node.children.map((id) => nodeMap[id]).filter((item): item is KnowledgeGraphNode => Boolean(item));
  }, [node, nodeMap]);

  const relatedNodes = useMemo(() => {
    if (!node) {
      return [] as KnowledgeGraphNode[];
    }

    const ids = new Set<string>();
    if (node.parentId) {
      ids.add(node.parentId);
    }

    node.siblingIds.slice(0, 4).forEach((id) => ids.add(id));
    node.children.slice(0, 4).forEach((id) => ids.add(id));

    return Array.from(ids)
      .map((id) => nodeMap[id])
      .filter((item): item is KnowledgeGraphNode => Boolean(item));
  }, [node, nodeMap]);

  const handleCopyPath = async () => {
    if (!node) {
      return;
    }

    const text = node.pathLabels.join(" / ");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("节点路径已复制");
      window.setTimeout(() => setMessage(null), 1500);
    } catch {
      setMessage("复制失败，请稍后重试");
      window.setTimeout(() => setMessage(null), 1500);
    }
  };

  const handleSaveNote = () => {
    if (!node) {
      return;
    }

    setNodeNote(node.id, noteText.trim());
    setMessage("备注已保存");
    window.setTimeout(() => setMessage(null), 1500);
  };

  if (!node) {
    return (
      <Card className="h-full rounded-[28px] border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.84)] shadow-[0_16px_36px_rgba(48,74,106,0.1)]">
        <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="h-16 w-16 rounded-3xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.78)]" />
          <h3 className="text-xl font-semibold tracking-tight">请选择一个节点</h3>
          <p className="max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            在中间知识图谱中单击任意节点，右侧将展示它的层级路径、定义说明、相邻节点、收藏状态与个人备注。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-[28px] border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.86)] shadow-[0_16px_36px_rgba(48,74,106,0.1)]">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--foreground))]">{node.label}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <span className="rounded-full border border-[hsl(var(--border)/0.72)] px-2 py-1">{levelLabel(node.level)}</span>
                <span className="rounded-full border border-[hsl(var(--border)/0.72)] px-2 py-1">{node.isLeaf ? "叶子节点" : "分支节点"}</span>
                <span className="rounded-full border border-[hsl(var(--border)/0.72)] px-2 py-1">子叶数量 {node.count}</span>
              </div>
            </div>

            <Button type="button" variant={node.favorite ? "default" : "outline"} size="sm" onClick={() => onToggleFavorite(node.id)}>
              <Heart className={`mr-1.5 h-4 w-4 ${node.favorite ? "fill-current" : ""}`} />
              {node.favorite ? "已收藏" : "收藏"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
            {breadcrumbNodes.map((item, index) => (
              <div key={item.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 transition hover:bg-[hsl(var(--accent)/0.9)] hover:text-[hsl(var(--foreground))]"
                  onClick={() => onSelectNode(item.id)}
                >
                  {item.label}
                </button>
                {index < breadcrumbNodes.length - 1 ? <span>/</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.76)] bg-[hsl(var(--card)/0.76)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
            <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
            节点解释
          </div>
          <p className="text-sm leading-7 text-[hsl(var(--foreground))]">{defaultDescription(node)}</p>
          {node.isLeaf ? (
            <div className="mt-3 rounded-2xl border border-[hsl(var(--primary)/0.18)] bg-[hsl(var(--primary)/0.08)] px-3 py-2 text-xs leading-6 text-[hsl(var(--primary))]">
              这是一个可直接用于生成控制/评价的细粒度属性。
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-[hsl(var(--border)/0.74)] bg-[hsl(var(--card)/0.72)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4 text-[hsl(var(--primary))]" />
              子节点
            </div>
            <div className="flex flex-wrap gap-2">
              {childNodes.length > 0 ? (
                childNodes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-full border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.92)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.36)] hover:text-[hsl(var(--primary))]"
                    onClick={() => onSelectNode(item.id)}
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">当前节点没有子节点。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border)/0.74)] bg-[hsl(var(--card)/0.72)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4 text-[hsl(var(--primary))]" />
              相关相邻节点
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedNodes.length > 0 ? (
                relatedNodes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-full border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.92)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.36)] hover:text-[hsl(var(--primary))]"
                    onClick={() => onSelectNode(item.id)}
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">暂无相邻节点信息。</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleCopyPath}>
            <Copy className="mr-1.5 h-4 w-4" />
            复制路径
          </Button>
          <Button type="button" variant="outline" onClick={() => onFocusBranch(node.id)}>
            <ListTree className="mr-1.5 h-4 w-4" />
            查看该分支
          </Button>
          <Button type="button" variant="outline" onClick={() => setMessage("已加入控制条件（示意按钮）")}>
            <Wand2 className="mr-1.5 h-4 w-4" />
            加入控制条件
          </Button>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">个人备注</p>
            <Button type="button" variant="outline" size="sm" onClick={handleSaveNote}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              保存
            </Button>
          </div>
          <Textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            className="min-h-[140px]"
            placeholder="记录你的观察、评审要点或后续可复用的控制条件。"
          />
        </div>

        {message ? (
          <div className="rounded-xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.76)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
