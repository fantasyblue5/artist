"use client";

import { useRef } from "react";
import { AnalysisPanel } from "@/components/workspace/analysis/AnalysisPanel";
import { AnalysisSourcePanel } from "@/components/workspace/analysis/AnalysisSourcePanel";
import { ArtworkPreview } from "@/components/workspace/analysis/ArtworkPreview";
import { ToolRail } from "@/components/workspace/ToolRail";
import type { CanvasDocState } from "@/lib/projects/types";
import type {
  AnalysisFollowup,
  AnalysisImageSource,
  AnalysisPendingMessage,
  SavedAnalysisConversation,
  AnalysisViewState,
  ArtworkAnalysisResult,
} from "@/components/workspace/analysis/types";
import type { ToolKey } from "@/components/workspace/types";
import type { HistoryItem } from "@/components/workspace/types";

type AnalysisWorkspaceProps = {
  activeTool: ToolKey;
  onSelectTool: (tool: ToolKey) => void;
  image: AnalysisImageSource | null;
  status: AnalysisViewState;
  result: ArtworkAnalysisResult | null;
  followups: AnalysisFollowup[];
  pendingMessage: AnalysisPendingMessage | null;
  analysisConversations: SavedAnalysisConversation[];
  canvasDoc: CanvasDocState;
  historyItems: HistoryItem[];
  loadingStep: string;
  error: string | null;
  canImportGenerated: boolean;
  isFollowupLoading?: boolean;
  onSelectFile: (file: File) => void | Promise<void>;
  onCanvasDocChange: (doc: CanvasDocState) => void;
  onImportGenerated: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onSelectConversation: (conversation: SavedAnalysisConversation) => void;
  onDeleteConversation: (id: string) => void;
  onStartAnalysis: () => void;
  onFollowup: (question: string) => void | Promise<void>;
};

export function AnalysisWorkspace({
  activeTool,
  onSelectTool,
  image,
  status,
  result,
  followups,
  pendingMessage,
  analysisConversations,
  canvasDoc,
  historyItems,
  loadingStep,
  error,
  canImportGenerated,
  isFollowupLoading,
  onSelectFile,
  onCanvasDocChange,
  onImportGenerated,
  onSelectHistoryItem,
  onSelectConversation,
  onDeleteConversation,
  onStartAnalysis,
  onFollowup,
}: AnalysisWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handlePickLocal = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex h-full w-full min-w-0 gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          void onSelectFile(file);
        }}
      />

      <AnalysisSourcePanel
        image={image}
        status={status}
        canImportGenerated={canImportGenerated}
        historyItems={historyItems}
        onPickLocal={handlePickLocal}
        onImportGenerated={onImportGenerated}
        onSelectHistoryItem={onSelectHistoryItem}
        onStartAnalysis={onStartAnalysis}
      />

      <ToolRail activeTool={activeTool} onSelectTool={onSelectTool} />

      <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row">
        <section className="min-h-0 min-w-0 flex-1">
          <ArtworkPreview image={image} doc={canvasDoc} onDocChange={onCanvasDocChange} />
        </section>

        <section className="h-[42vh] shrink-0 xl:h-full xl:w-[392px]">
          <AnalysisPanel
            image={image}
            status={status}
            result={result}
            followups={followups}
            pendingMessage={pendingMessage}
            analysisConversations={analysisConversations}
            loadingStep={loadingStep}
            error={error}
            isFollowupLoading={isFollowupLoading}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={onDeleteConversation}
            onFollowup={onFollowup}
          />
        </section>
      </div>
    </div>
  );
}
