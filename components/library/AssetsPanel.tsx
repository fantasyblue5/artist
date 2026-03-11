"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAssets, saveAssets } from "@/lib/library/storage";
import type { LibraryAsset } from "@/lib/library/types";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string | undefined>((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function baseName(filename: string) {
  const index = filename.lastIndexOf(".");
  if (index <= 0) {
    return filename;
  }
  return filename.slice(0, index);
}

export function AssetsPanel() {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setAssets(getAssets());
  }, []);

  useEffect(() => {
    saveAssets(assets);
  }, [assets]);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) {
      return;
    }

    const nextItems: LibraryAsset[] = [];

    for (const file of list) {
      const previewDataUrl = await fileToDataUrl(file);
      nextItems.push({
        id: makeId(),
        title: baseName(file.name),
        tags: [],
        previewDataUrl,
        mimeType: file.type,
        createdAt: Date.now(),
      });
    }

    setAssets((prev) => [...nextItems, ...prev]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(event.dataTransfer.files);
  };

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => b.createdAt - a.createdAt),
    [assets],
  );

  return (
    <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.84)]">
      <CardContent className="flex h-full min-h-0 flex-col gap-4 p-5">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-2xl border border-dashed px-4 py-6 text-center transition ${
            dragging
              ? "border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.09)]"
              : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)]"
          }`}
        >
          <UploadCloud className="mx-auto h-7 w-7 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">拖拽素材到此处，或点击选择文件</p>
          <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
            选择文件
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  void uploadFiles(event.target.files);
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {sortedAssets.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.7)] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              还没有素材，先上传一些参考图、纹理或草图。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedAssets.map((asset) => (
                <article
                  key={asset.id}
                  className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.76)]"
                >
                  <div className="relative h-32 bg-[hsl(var(--accent)/0.9)]">
                    {asset.previewDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.previewDataUrl} alt={asset.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-[hsl(var(--muted-foreground))]">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <input
                      value={asset.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        setAssets((prev) => prev.map((item) => (item.id === asset.id ? { ...item, title } : item)));
                      }}
                      className="h-9 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 text-sm outline-none"
                    />
                    <input
                      value={asset.tags.join(",")}
                      onChange={(event) => {
                        const tags = event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .slice(0, 10);
                        setAssets((prev) => prev.map((item) => (item.id === asset.id ? { ...item, tags } : item)));
                      }}
                      placeholder="标签（逗号分隔）"
                      className="h-9 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 text-xs outline-none"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl text-[hsl(var(--muted-foreground))]"
                      onClick={() => setAssets((prev) => prev.filter((item) => item.id !== asset.id))}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
