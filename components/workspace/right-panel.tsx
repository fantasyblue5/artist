import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const historyItems = [
  {
    summary:
      "画面以朦胧青灰色调展开，远山与湖面形成平衡关系，几何块面增强了层次感。",
    time: "2025-10-31 17:52",
  },
  {
    summary:
      "构图在中景留白较多，建议增加前景元素以增强纵深，强化视觉停留点。",
    time: "2025-10-31 15:30",
  },
  {
    summary:
      "色彩对比偏柔和，若提高暖色饱和度可让主体更突出，适合黄昏场景表达。",
    time: "2025-10-28 21:50",
  },
  {
    summary:
      "细节处理偏统一，建议在建筑边缘与水波纹处增加笔触差异，形成节奏层级。",
    time: "2025-10-28 14:17",
  },
  {
    summary:
      "整体空间关系稳定，天空与水面呼应较好，画面氛围安静且有叙事感。",
    time: "2025-10-28 22:26",
  },
  {
    summary:
      "可尝试将近景亮度下调，留出主体高光区域，提升画面聚焦与引导效果。",
    time: "2025-10-28 21:45",
  },
];

export function RightPanel() {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>历史记录</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 overflow-y-auto pt-0">
        {historyItems.map((item) => (
          <Card key={`${item.time}-${item.summary.slice(0, 6)}`} className="shadow-none">
            <CardContent className="space-y-2 py-3">
              <p className="max-h-24 overflow-hidden text-sm leading-6 text-slate-700">
                {item.summary}
              </p>
              <p className="text-xs text-slate-400">{item.time}</p>
            </CardContent>
          </Card>
        ))}
      </CardContent>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" className="flex-1 rounded-[12px]">
            上一页
          </Button>
          <Button variant="outline" className="flex-1 rounded-[12px]">
            下一页
          </Button>
        </div>
      </div>
    </Card>
  );
}
