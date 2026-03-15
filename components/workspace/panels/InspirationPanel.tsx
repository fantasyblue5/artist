"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  generateInspirationImage,
  polishPrompt,
  type InspirationImageApiData,
} from "@/lib/workspace/generation";
import { Images, WandSparkles } from "lucide-react";

type InspirationPanelProps = {
  onGeneratedImage: (image: {
    requestId: string;
    status: "loading" | "ready" | "error";
    prompt: string;
    src?: string;
    sourceType?: "data-url" | "url";
  }) => void;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("文件读取失败"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function toImageDataUrl(base64OrDataUrl: string) {
  const normalized = base64OrDataUrl.trim();
  if (normalized.startsWith("data:image/")) {
    return normalized;
  }
  return `data:image/png;base64,${normalized.replace(/\s+/g, "")}`;
}

function normalizeGeneratedImageSource(data: InspirationImageApiData) {
  if (typeof data.imageSrc === "string" && data.imageSrc.trim()) {
    const imageSrc = data.imageSrc.trim();
    return {
      src: imageSrc,
      sourceType: imageSrc.startsWith("data:image/") ? ("data-url" as const) : ("url" as const),
    };
  }

  if (typeof data.imageDataUrl === "string" && data.imageDataUrl.trim()) {
    const imageDataUrl = data.imageDataUrl.trim();
    return {
      src: imageDataUrl,
      sourceType: imageDataUrl.startsWith("data:image/") ? ("data-url" as const) : ("url" as const),
    };
  }

  if (typeof data.imageBase64 === "string" && data.imageBase64.trim()) {
    return {
      src: toImageDataUrl(data.imageBase64),
      sourceType: "data-url" as const,
    };
  }

  if (typeof data.imageUrl === "string" && data.imageUrl.trim()) {
    return {
      src: data.imageUrl.trim(),
      sourceType: "url" as const,
    };
  }

  return null;
}

export function InspirationPanel({ onGeneratedImage }: InspirationPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [referenceFileName, setReferenceFileName] = useState("");
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePolishPrompt = async () => {
    if (!prompt.trim()) {
      window.alert("请先输入创作描述，再进行 AI 润色。");
      return;
    }

    setIsPolishing(true);
    const result = await polishPrompt(prompt);
    setIsPolishing(false);

    if (!result.ok) {
      window.alert(result.error.message || "润色失败，请稍后重试");
      return;
    }

    setPrompt(result.data.prompt);
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() && !referenceImageDataUrl) {
      window.alert("请输入创作描述或上传参考图后再开始生成。");
      return;
    }

    console.info("[InspirationPanel] start generating image", {
      promptLength: prompt.trim().length,
      hasReferenceImage: Boolean(referenceImageDataUrl),
    });
    const requestId = `generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onGeneratedImage({
      requestId,
      status: "loading",
      prompt: prompt.trim() || "正在生成灵感图",
    });
    setIsGenerating(true);

    const result = await generateInspirationImage({
      prompt,
      referenceImage: referenceImageDataUrl || undefined,
    });
    setIsGenerating(false);

    if (!result.ok) {
      console.error("[InspirationPanel] image generation failed", result.error);
      onGeneratedImage({
        requestId,
        status: "error",
        prompt: prompt.trim() || "生成失败",
      });
      window.alert(result.error.message || "图片生成失败，请稍后重试");
      return;
    }

    console.info("[InspirationPanel] image api payload", {
      hasImageUrl: Boolean(result.data.imageUrl),
      hasImageBase64: Boolean(result.data.imageBase64),
      hasImageDataUrl: Boolean(result.data.imageDataUrl),
      hasImageSrc: Boolean(result.data.imageSrc),
    });

    const normalizedImage = normalizeGeneratedImageSource(result.data);
    if (!normalizedImage) {
      console.error("[InspirationPanel] missing image source in response", result.data);
      window.alert("接口已返回成功，但没有拿到可渲染的图片地址。");
      return;
    }

    setPrompt(result.data.revisedPrompt);
    console.info("[InspirationPanel] dispatch image to canvas", {
      requestId,
      sourceType: normalizedImage.sourceType,
      srcPreview: normalizedImage.src.slice(0, 120),
      promptLength: result.data.revisedPrompt.length,
    });
    onGeneratedImage({
      requestId,
      status: "ready",
      src: normalizedImage.src,
      prompt: result.data.revisedPrompt,
      sourceType: normalizedImage.sourceType,
    });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>创作描述</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Textarea
            className="min-h-[160px] resize-none"
            placeholder="描述你想创作的主题、氛围、主体元素和画面语言..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Button className="w-full" onClick={() => void handlePolishPrompt()} disabled={isPolishing}>
            <WandSparkles className="mr-1.5 h-4 w-4" />
            {isPolishing ? "润色中..." : "AI润色描述"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5">
            <Images className="h-4 w-4" />参考图选择
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <label className="block cursor-pointer rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] p-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {referenceFileName ? `已选择：${referenceFileName}` : "上传参考图"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setReferenceFileName("");
                  setReferenceImageDataUrl("");
                  return;
                }

                try {
                  const dataUrl = await readFileAsDataUrl(file);
                  setReferenceFileName(file.name);
                  setReferenceImageDataUrl(dataUrl);
                } catch (error) {
                  setReferenceFileName("");
                  setReferenceImageDataUrl("");
                  const message = error instanceof Error ? error.message : "参考图读取失败";
                  window.alert(message);
                }
              }}
            />
          </label>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            支持 JPG / PNG，用于辅助控制画面风格和主体细节。
          </p>
        </CardContent>
      </Card>

      <Button className="mt-auto w-full" onClick={() => void handleGenerateImage()} disabled={isGenerating}>
        <WandSparkles className="mr-1.5 h-4 w-4" />
        {isGenerating ? "生成中..." : "开始生成"}
      </Button>
    </div>
  );
}
