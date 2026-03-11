"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type KnowledgeGraphHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KnowledgeGraphHelpDialog({ open, onOpenChange }: KnowledgeGraphHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>图谱说明</DialogTitle>
          <DialogDescription>这是一个以“艺术评价体系”为中心的知识图谱页面。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          <div className="rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.56)] p-3">
            节点颜色说明：中心 root 为深蓝，祖先路径为中高亮蓝，普通节点为浅蓝灰，叶子节点带有更细粒度说明提示。
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.8)] p-3">
            交互说明：单击节点查看详情，双击节点展开或收起子树，滚轮缩放，拖拽平移，搜索结果会自动定位并高亮。
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.8)] p-3">
            备注说明：当前数据中的备注会作为叶子节点的解释说明显示，不会被渲染成独立节点。
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
