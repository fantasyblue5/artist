"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AudioLines, ImageUp, Upload } from "lucide-react";

export function AnalysisPanel() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>文本输入（可选）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Textarea
            className="min-h-[130px] resize-none"
            placeholder="请输入画面分析需求，例如：分析构图关系与主体层次。"
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-xl">
              <AudioLines className="mr-1.5 h-4 w-4" />语音
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-xl">
              <Upload className="mr-1.5 h-4 w-4" />上传
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>图片输入（可选）</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <label className="block cursor-pointer rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] p-3 transition-colors hover:border-[hsl(var(--primary)/0.5)]">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="上传预览"
                className="h-36 w-full rounded-xl border border-[hsl(var(--border))] object-cover"
              />
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl bg-[hsl(var(--card))] text-sm text-[hsl(var(--muted-foreground))]">
                <ImageUp className="h-6 w-6" />
                <span>点击上传图片或拖入图片文件</span>
              </div>
            )}
          </label>
        </CardContent>
      </Card>

      <Button className="mt-auto w-full">生成</Button>
    </div>
  );
}
