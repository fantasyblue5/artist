import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";

export function AttributePanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />属性滑杆（占位）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <label className="space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
            亮度
            <input type="range" min={0} max={100} defaultValue={48} className="w-full" />
          </label>
          <label className="space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
            对比度
            <input type="range" min={0} max={100} defaultValue={52} className="w-full" />
          </label>
          <label className="space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
            饱和度
            <input type="range" min={0} max={100} defaultValue={44} className="w-full" />
          </label>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>高级选项（占位）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm text-[hsl(var(--muted-foreground))]">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" defaultChecked />保留主体边缘
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" />增强局部纹理
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4" />自动平衡色温
          </label>
        </CardContent>
      </Card>

      <Button className="mt-auto w-full">应用属性</Button>
    </div>
  );
}
