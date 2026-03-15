"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUp, Import, Plus } from "lucide-react";

type ImageDropzoneProps = {
  canImportGenerated: boolean;
  onSelectFile: (file: File) => void | Promise<void>;
  onImportGenerated: () => void;
};

export function ImageDropzone({
  canImportGenerated,
  onSelectFile,
  onImportGenerated,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }
    await onSelectFile(file);
  };

  return (
    <div className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[32px] border border-[hsl(var(--border)/0.7)] bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(236,243,250,0.92))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(88,121,165,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(163,188,219,0.16),transparent_32%)]" />

      <div
        className={`relative flex flex-1 flex-col items-center justify-center px-8 text-center transition ${
          isDragActive ? "bg-[rgba(82,123,175,0.06)]" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          void handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
          }}
        />

        <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-[0_18px_50px_rgba(73,111,156,0.18)]">
          <ImageUp className="h-8 w-8" />
        </div>
        <div className="mt-6 max-w-xl space-y-3">
          <h2 className="text-[28px] font-semibold tracking-tight text-[hsl(var(--foreground))]">
            导入作品，开始评图
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            上传图片后即可获得结构化分析建议。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button className="rounded-2xl px-5" onClick={() => inputRef.current?.click()}>
            <Plus className="mr-1.5 h-4 w-4" />
            本地上传
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl px-5"
            onClick={onImportGenerated}
            disabled={!canImportGenerated}
          >
            <Import className="mr-1.5 h-4 w-4" />
            导入当前结果
          </Button>
        </div>

        <div className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">
          支持拖拽上传
        </div>
      </div>
    </div>
  );
}
