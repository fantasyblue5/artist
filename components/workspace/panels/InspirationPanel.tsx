import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Images, Tags, WandSparkles } from "lucide-react";

const inspirationTags = ["山水", "留白", "东方意境", "蓝灰色调", "写意"];

export function InspirationPanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle>提示词输入</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            className="min-h-[120px] resize-none"
            placeholder="描述你想创作的主题、氛围和画面语言..."
          />
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border)/0.8)] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5">
            <Tags className="h-4 w-4" />灵感标签
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {inspirationTags.map((tag, index) => (
            <Button key={tag} variant={index === 0 ? "default" : "outline"} size="sm">
              {tag}
            </Button>
          ))}
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
            上传参考图（占位）
            <input type="file" accept="image/*" className="hidden" />
          </label>
          <input
            type="text"
            placeholder="或输入参考图 URL（占位）"
            className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]"
          />
        </CardContent>
      </Card>

      <Button className="mt-auto w-full">
        <WandSparkles className="mr-1.5 h-4 w-4" />生成灵感
      </Button>
    </div>
  );
}
