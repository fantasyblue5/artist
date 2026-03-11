import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

function UploadSlot({ label }: { label: string }) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
      {label}
      <input type="file" accept="image/*" className="hidden" />
    </label>
  );
}

export function StyleTransferPanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5">
            <Palette className="h-4 w-4" />风格迁移输入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <UploadSlot label="上传内容图（占位）" />
          <UploadSlot label="上传风格图（占位）" />
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>迁移参数（占位）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-sm text-[hsl(var(--muted-foreground))]">
          <label className="space-y-1">
            强度
            <input type="range" min={0} max={100} defaultValue={65} className="w-full" />
          </label>
          <label className="space-y-1">
            细节保留
            <input type="range" min={0} max={100} defaultValue={54} className="w-full" />
          </label>
          <select className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]">
            <option>风格融合模式 A</option>
            <option>风格融合模式 B</option>
          </select>
        </CardContent>
      </Card>

      <Button className="mt-auto w-full">应用风格迁移</Button>
    </div>
  );
}
