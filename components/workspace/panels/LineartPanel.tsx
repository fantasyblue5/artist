import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PenTool } from "lucide-react";

export function LineartPanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5">
            <PenTool className="h-4 w-4" />上传线稿
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <label className="block cursor-pointer rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
            点击上传线稿图片（占位）
            <input type="file" accept="image/*" className="hidden" />
          </label>
          <select className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]">
            <option>中国山水意境</option>
            <option>现代插画风格</option>
            <option>工笔精细风格</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>修饰指令（占位）</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <textarea
            placeholder="例如：保留建筑轮廓，增强山体层次，云雾更柔和。"
            className="min-h-[140px] w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]"
          />
        </CardContent>
      </Card>

      <Button className="mt-auto w-full">生成线稿结果</Button>
    </div>
  );
}
