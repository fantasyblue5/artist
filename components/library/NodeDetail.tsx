"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Heart, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getNodeNote, isFavorite, setNodeNote, toggleFavorite } from "@/lib/library/storage";
import type { KnowledgeNode } from "@/lib/library/types";

type NodeDetailProps = {
  node: KnowledgeNode | null;
  breadcrumb: string[];
};

export function NodeDetail({ node, breadcrumb }: NodeDetailProps) {
  const [note, setNote] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setNote("");
      setFavorite(false);
      return;
    }

    setNote(getNodeNote(node.id));
    setFavorite(isFavorite(node.id));
  }, [node]);

  const isLeaf = Boolean(node && node.children.length === 0);

  const descriptionText = useMemo(() => {
    if (!node) {
      return "";
    }

    if (node.description?.trim()) {
      return node.description.trim();
    }

    return isLeaf ? "该节点暂未补充描述，后续可在资料库中补全。" : "这是一个目录节点，可继续在左侧展开查看具体叶子节点。";
  }, [isLeaf, node]);

  const onCopyPrompt = async () => {
    if (!node) {
      return;
    }

    const promptText = `${node.name}\n${descriptionText}`;

    try {
      await navigator.clipboard.writeText(promptText);
      setToastText("已复制 Prompt 片段");
      window.setTimeout(() => setToastText(null), 1200);
    } catch {
      setToastText("复制失败，请重试");
      window.setTimeout(() => setToastText(null), 1200);
    }
  };

  const onToggleFavorite = () => {
    if (!node) {
      return;
    }

    toggleFavorite(node.id);
    const next = !favorite;
    setFavorite(next);
    setToastText(next ? "已加入收藏" : "已取消收藏");
    window.setTimeout(() => setToastText(null), 1200);
  };

  const onSaveNote = () => {
    if (!node) {
      return;
    }

    setNodeNote(node.id, note.trim());
    setToastText("备注已保存");
    window.setTimeout(() => setToastText(null), 1200);
  };

  if (!node) {
    return (
      <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.8)]">
        <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="h-16 w-16 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.7)]" />
          <h3 className="text-lg font-semibold">选择一个叶子节点开始查看</h3>
          <p className="max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            左侧知识图谱支持搜索与展开，点击叶子节点后将显示路径、描述与可复用 Prompt 片段。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.84)]">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="text-[20px] font-semibold tracking-tight text-[hsl(var(--foreground))]">{node.name}</h3>
          <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{breadcrumb.join(" > ")}</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.72)] p-4">
          <p className="text-sm leading-7 text-[hsl(var(--foreground))]">{descriptionText}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onCopyPrompt}>
            <Copy className="mr-2 h-4 w-4" />
            复制为 Prompt片段
          </Button>
          <Button variant="outline" onClick={onToggleFavorite}>
            <Heart className={`mr-2 h-4 w-4 ${favorite ? "fill-current text-[hsl(var(--primary))]" : ""}`} />
            {favorite ? "已收藏" : "加入收藏"}
          </Button>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">添加备注</div>
            <Button variant="outline" size="sm" onClick={onSaveNote}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              保存
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[132px]"
            placeholder="记录你对该节点的观察、提示词偏好或使用规范..."
          />
        </div>

        {toastText ? (
          <div className="rounded-xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.75)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
            {toastText}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
