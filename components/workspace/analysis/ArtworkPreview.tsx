"use client";

import { useMemo } from "react";
import { CanvasStage } from "@/components/workspace/CanvasStage";
import type { AnalysisImageSource } from "@/components/workspace/analysis/types";
import type { CanvasDocState } from "@/lib/projects/types";

type ArtworkPreviewProps = {
  image: AnalysisImageSource | null;
  doc: CanvasDocState;
  onDocChange: (doc: CanvasDocState) => void;
};

export function ArtworkPreview({ image, doc, onDocChange }: ArtworkPreviewProps) {
  const hasImageInCanvas = useMemo(() => {
    if (!image) {
      return false;
    }

    return doc.objects.some((object) => object.type === "image" && object.src === image.src);
  }, [doc.objects, image]);

  const previewRequest = useMemo(() => {
    if (!image || hasImageInCanvas) {
      return null;
    }

    return {
      requestId: `analysis-preview-${image.importedAt}`,
      status: "ready" as const,
      prompt: image.name,
      src: image.src,
      sourceType: image.sourceType,
      insertedLabel: "分析图片",
    };
  }, [hasImageInCanvas, image]);

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-[28px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] shadow-[0_18px_44px_rgba(52,76,104,0.08)]">
      <CanvasStage
        initialDoc={doc}
        generatedImageRequest={previewRequest}
        onDocChange={onDocChange}
        emptyMessage={null}
      />
    </div>
  );
}
