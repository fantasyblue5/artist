import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const tools = [
  "灵感生成",
  "方案构思",
  "画面分析",
  "线稿生图",
  "智能构图",
  "局部修改",
  "风格迁移",
  "图片抠图",
  "融合生成",
  "全局修改",
  "视角微调",
];

export function LeftPanel() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle>文本输入（可选）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Textarea
                className="min-h-[120px] resize-none"
                placeholder="分析作品构图元素，描述希望优化的方向..."
              />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle>图片上传预览</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-3">
                <div className="mb-3 flex justify-between">
                  <Button variant="outline" size="sm">
                    上传图片
                  </Button>
                  <span className="text-xs text-slate-400">PNG / JPG</span>
                </div>
                <div className="h-28 rounded-[12px] bg-gradient-to-r from-teal-100 via-cyan-50 to-emerald-100" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-2">
            {tools.map((tool, index) => (
              <Button
                key={tool}
                variant={index === 2 ? "default" : "outline"}
                className="justify-start rounded-[12px]"
              >
                {tool}
              </Button>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <Button className="w-full rounded-[12px] text-base font-semibold">
            生成
          </Button>
        </div>
      </div>
    </Card>
  );
}
