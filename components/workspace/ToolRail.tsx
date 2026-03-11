import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Palette,
  PenTool,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ToolKey } from "@/components/workspace/types";

type ToolItem = {
  key: ToolKey;
  label: string;
  icon: LucideIcon;
};

export const TOOL_ITEMS: ToolItem[] = [
  { key: "inspiration", label: "灵感创作", icon: Sparkles },
  { key: "analysis", label: "画面分析", icon: Search },
  { key: "attribute", label: "属性调整", icon: SlidersHorizontal },
  { key: "lineart", label: "线稿生成", icon: PenTool },
  { key: "style", label: "风格迁移", icon: Palette },
];

type ToolRailProps = {
  activeTool: ToolKey;
  onSelectTool: (tool: ToolKey) => void;
};

export function ToolRail({ activeTool, onSelectTool }: ToolRailProps) {
  return (
    <Card className="flex h-full w-[104px] shrink-0 flex-col gap-2 p-2">
      {TOOL_ITEMS.map((tool) => {
        const Icon = tool.icon;
        const isActive = tool.key === activeTool;

        return (
          <Button
            key={tool.key}
            variant={isActive ? "default" : "ghost"}
            className={cn(
              "h-auto w-full flex-col gap-1.5 rounded-xl px-2 py-3 text-xs",
              isActive
                ? "text-[hsl(var(--primary-foreground))]"
                : "text-[hsl(var(--muted-foreground))]",
            )}
            onClick={() => onSelectTool(tool.key)}
          >
            <Icon className="h-4 w-4" />
            <span className="w-full whitespace-nowrap overflow-hidden text-ellipsis text-center leading-tight">
              {tool.label}
            </span>
          </Button>
        );
      })}
    </Card>
  );
}
