"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TOOL_ITEMS } from "@/components/workspace/ToolRail";
import type { ToolKey } from "@/components/workspace/types";
import { AnalysisPanel } from "@/components/workspace/panels/AnalysisPanel";
import { AttributePanel } from "@/components/workspace/panels/AttributePanel";
import { InspirationPanel } from "@/components/workspace/panels/InspirationPanel";
import { LineartPanel } from "@/components/workspace/panels/LineartPanel";
import { StyleTransferPanel } from "@/components/workspace/panels/StyleTransferPanel";
import { ChevronLeft } from "lucide-react";

type LeftPanelProps = {
  activeTool: ToolKey;
  isOpen: boolean;
  onCollapse: () => void;
};

function renderPanelByTool(activeTool: ToolKey) {
  switch (activeTool) {
    case "inspiration":
      return <InspirationPanel />;
    case "analysis":
      return <AnalysisPanel />;
    case "attribute":
      return <AttributePanel />;
    case "lineart":
      return <LineartPanel />;
    case "style":
      return <StyleTransferPanel />;
    default:
      return null;
  }
}

export function LeftPanel({ activeTool, isOpen, onCollapse }: LeftPanelProps) {
  if (!isOpen) {
    return null;
  }

  const currentTool = TOOL_ITEMS.find((item) => item.key === activeTool);

  return (
    <Card className="flex h-full w-[350px] shrink-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{currentTool?.label ?? "功能面板"}</span>
        </div>
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={onCollapse}>
          <ChevronLeft className="mr-1 h-4 w-4" />收起
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">{renderPanelByTool(activeTool)}</div>
    </Card>
  );
}
