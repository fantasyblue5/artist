"use client";

import { ImagePlus } from "lucide-react";
import { ResourceCard } from "@/components/library/ResourceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeGraphNode, KnowledgeResource } from "@/lib/library/types";

type ResourceGridProps = {
  node: KnowledgeGraphNode | null;
  resources: KnowledgeResource[];
  onToggleFavorite: (resourceId: string) => void;
};

export function ResourceGrid({ node, resources, onToggleFavorite }: ResourceGridProps) {
  return (
    <Card className="rounded-[30px] border-[hsl(var(--border)/0.74)] bg-[hsl(var(--card)/0.76)] shadow-[0_18px_38px_rgba(43,69,98,0.08)]">
      <CardHeader className="items-start gap-2 px-5 pt-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--accent)/0.68)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]">
          <ImagePlus className="h-3.5 w-3.5" />
          关联资源区
        </div>
        <div>
          <CardTitle className="text-base">艺术素材资源</CardTitle>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {node ? `当前节点“${node.label}”关联的构图、色彩、笔触、光影与风格参考资源。` : "请选择节点以查看更精准的资源联动。"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onToggleFavorite={onToggleFavorite} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
