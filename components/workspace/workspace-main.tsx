import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const thumbs = Array.from({ length: 14 }).map((_, index) => index + 1);

const quickActions = ["拖拽", "手型", "缩放", "裁剪", "橡皮", "文字", "标注"];

export function WorkspaceMain() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card className="p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {thumbs.map((item) => (
            <div
              key={item}
              className="h-20 w-28 shrink-0 rounded-[12px] border border-slate-200 bg-gradient-to-br from-teal-100 via-cyan-50 to-emerald-100"
            />
          ))}
        </div>
      </Card>

      <Card className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="canvas-grid absolute inset-0 opacity-30" />
        <div className="relative flex h-[70%] w-[min(760px,100%)] items-center justify-center rounded-[12px] border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.12)]">
          <div className="space-y-2 p-5 text-sm text-slate-500">
            <p className="text-base font-semibold text-slate-700">主画布容器</p>
            <p>用于展示当前作品内容、文本框或编辑结果预览。</p>
            <p>仅实现结构与样式，不包含交互逻辑。</p>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-[12px] border border-slate-200 bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.18)] backdrop-blur">
          {quickActions.map((action, index) => (
            <Button
              key={action}
              variant={index === 0 ? "default" : "ghost"}
              size="sm"
              className="rounded-[10px]"
            >
              {action}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
