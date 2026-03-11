"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { KnowledgeResource } from "@/lib/library/types";

type ResourceCardProps = {
  resource: KnowledgeResource;
  onToggleFavorite: (resourceId: string) => void;
};

export function ResourceCard({ resource, onToggleFavorite }: ResourceCardProps) {
  return (
    <Card className="overflow-hidden rounded-[26px] border-[hsl(var(--border)/0.74)] bg-[hsl(var(--card)/0.9)]">
      <div
        className="relative h-40 w-full border-b border-[hsl(var(--border)/0.66)]"
        style={{
          backgroundImage: resource.image,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(20,33,49,0.1))]" />
        <div className="absolute left-3 top-3 rounded-full border border-white/22 bg-white/14 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          {resource.type}
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{resource.title}</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">用于 AI 创作参考与评价提示</div>
          </div>
          <Button type="button" variant={resource.favorite ? "default" : "outline"} size="icon" className="h-8 w-8 rounded-xl" onClick={() => onToggleFavorite(resource.id)}>
            <Heart className={`h-4 w-4 ${resource.favorite ? "fill-current" : ""}`} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {resource.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.96)] px-2.5 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
