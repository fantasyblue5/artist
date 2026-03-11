"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateProjectInput } from "@/lib/storage/projects";

type TemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFromTemplate: (input: CreateProjectInput) => Promise<void>;
};

type TemplateItem = {
  id: string;
  name: string;
  desc: string;
  badge: string;
  tags: string[];
};

const templates: TemplateItem[] = [
  { id: "landscape", name: "山水", desc: "国风山水创作模板", badge: "国风", tags: ["山水", "国风"] },
  { id: "poster", name: "海报", desc: "适合竖版视觉海报", badge: "封面", tags: ["海报", "排版"] },
  { id: "composition", name: "构图练习", desc: "用于画面结构训练", badge: "练习", tags: ["构图", "练习"] },
  { id: "color", name: "国风配色", desc: "低饱和配色方案起稿", badge: "配色", tags: ["配色", "国风"] },
  { id: "review", name: "评审标注", desc: "适合批注与反馈流程", badge: "评审", tags: ["标注", "评审"] },
  { id: "blank", name: "空白", desc: "从空白画布开始", badge: "推荐", tags: ["空白"] },
];

export function TemplateModal({
  open,
  onOpenChange,
  onCreateFromTemplate,
}: TemplateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>从模板创建</DialogTitle>
          <DialogDescription>选择模板后会创建新项目并进入编辑器。</DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.45)]"
              onClick={async () => {
                await onCreateFromTemplate({
                  name: `${template.name} 项目`,
                  tags: template.tags,
                });
                onOpenChange(false);
              }}
            >
              <div className="mb-2 rounded-xl bg-[hsl(var(--accent))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))]">
                {template.badge}
              </div>
              <h4 className="text-sm font-semibold">{template.name}</h4>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{template.desc}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-[hsl(var(--border))] px-1.5 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
