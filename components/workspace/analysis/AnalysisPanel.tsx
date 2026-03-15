"use client";

import { useState } from "react";
import { FollowupInput } from "@/components/workspace/analysis/FollowupInput";
import type {
  AnalysisFollowup,
  AnalysisImageSource,
  AnalysisPendingMessage,
  SavedAnalysisConversation,
  AnalysisViewState,
  ArtworkAnalysisResult,
} from "@/components/workspace/analysis/types";
import { Bot, History, LoaderCircle, Trash2, X } from "lucide-react";

type AnalysisPanelProps = {
  image: AnalysisImageSource | null;
  status: AnalysisViewState;
  result: ArtworkAnalysisResult | null;
  followups: AnalysisFollowup[];
  pendingMessage: AnalysisPendingMessage | null;
  analysisConversations: SavedAnalysisConversation[];
  loadingStep: string;
  error: string | null;
  isFollowupLoading?: boolean;
  onSelectConversation: (conversation: SavedAnalysisConversation) => void;
  onDeleteConversation: (id: string) => void;
  onFollowup: (question: string) => void | Promise<void>;
};

function buildResultMessage(result: ArtworkAnalysisResult) {
  const strengthsText = result.summary.top_strengths.join("；");
  const issueText = result.summary.top_issues.join("；");
  const dimensionLines = result.dimensions
    .map((dimension) => {
      const facts = dimension.analysis.visible_facts;
      const judgment = dimension.analysis.professional_judgment;
      const evidence = dimension.evidence.join("；");
      const suggestion = dimension.suggestions[0];
      return [
        `${dimension.name}：${facts}`,
        judgment,
        evidence ? `证据：${evidence}` : "",
        suggestion ? `建议：${suggestion}` : "",
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join("\n");

  return [
    `整体判断：${result.summary.overall_assessment}`,
    strengthsText ? `主要优点：${strengthsText}` : "",
    issueText ? `主要问题：${issueText}` : "",
    `优先动作：${result.summary.next_step}`,
    dimensionLines,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function AnalysisPanel({
  image,
  status,
  result,
  followups,
  pendingMessage,
  analysisConversations,
  loadingStep,
  error,
  isFollowupLoading,
  onSelectConversation,
  onDeleteConversation,
  onFollowup,
}: AnalysisPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-[hsl(var(--border)/0.68)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,250,255,0.96))] shadow-[0_18px_42px_rgba(43,66,94,0.08)]">
      <div className="border-b border-[hsl(var(--border)/0.58)] px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                <Bot className="h-5 w-5" />
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--foreground))]">
                艺术专家 Agent
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              整合专家知识与多模态评图能力，既能评估画面，也能继续回答你的创作疑问。
            </p>
          </div>

          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
              historyOpen
                ? "border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--accent)/0.78)] text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border)/0.72)] bg-white/88 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.28)] hover:text-[hsl(var(--foreground))]"
            }`}
            aria-label={historyOpen ? "关闭历史对话" : "查看历史对话"}
          >
            <History className="h-4 w-4" />
            历史
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {status === "analyzed" && result ? (
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[92%] rounded-[22px] rounded-tl-[10px] border border-[hsl(var(--border)/0.54)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,250,255,0.96))] px-4 py-3 text-sm leading-7 whitespace-pre-line text-[hsl(var(--foreground))]">
                  {buildResultMessage(result)}
                </div>
              </div>
            ) : null}

            {followups.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-[20px] rounded-br-[10px] bg-[hsl(var(--primary))] px-4 py-3 text-sm leading-6 text-[hsl(var(--primary-foreground))]">
                    {item.question}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[92%] rounded-[20px] rounded-tl-[10px] border border-[hsl(var(--border)/0.54)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,255,0.96))] px-4 py-3 text-sm leading-6 text-[hsl(var(--foreground))]">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}

            {pendingMessage ? (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-[20px] rounded-br-[10px] bg-[hsl(var(--primary))] px-4 py-3 text-sm leading-6 text-[hsl(var(--primary-foreground))]">
                    {pendingMessage.question}
                  </div>
                </div>
              </div>
            ) : null}

            {status === "analyzing" ? (
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                </div>
                <div className="max-w-[92%] rounded-[20px] rounded-tl-[10px] border border-[hsl(var(--border)/0.54)] bg-white/92 px-4 py-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  <div className="font-medium text-[hsl(var(--foreground))]">正在生成专业评图</div>
                  <div className="mt-1">{loadingStep}</div>
                </div>
              </div>
            ) : null}

            {isFollowupLoading ? (
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-[20px] rounded-tl-[10px] border border-[hsl(var(--border)/0.54)] bg-white/92 px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                  正在整理回答...
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-[rgba(185,28,28,0.18)] bg-[rgba(254,242,242,0.92)] px-4 py-3 text-sm text-[rgb(153,27,27)]">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {historyOpen ? (
          <div className="absolute inset-0 z-10 flex flex-col bg-[rgba(248,251,255,0.96)] backdrop-blur-[3px]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.58)] px-6 py-4">
              <div>
                <div className="text-sm font-semibold text-[hsl(var(--foreground))]">历史对话</div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border)/0.72)] bg-white/92 text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.26)] hover:text-[hsl(var(--foreground))]"
                aria-label="关闭历史对话"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {analysisConversations.length > 0 ? (
                <div className="space-y-2">
                  {analysisConversations.map((conversation) => {
                    const isActive = image?.src === conversation.imageSrc;
                    const previewText =
                      conversation.followups[conversation.followups.length - 1]?.question ||
                      conversation.result?.summary.overall_assessment ||
                      conversation.imageName;

                    return (
                      <div
                        key={conversation.id}
                        className={`group flex items-center gap-3 rounded-[18px] border px-3 py-3 transition ${
                          isActive
                            ? "border-[hsl(var(--primary)/0.52)] bg-[hsl(var(--accent)/0.52)]"
                            : "border-[hsl(var(--border)/0.58)] bg-white/84 hover:border-[hsl(var(--primary)/0.34)] hover:bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectConversation(conversation);
                            setHistoryOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.28)]">
                            <img src={conversation.imageSrc} alt={conversation.imageName} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                              {conversation.imageName}
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                              {previewText}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteConversation(conversation.id)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[hsl(var(--border)/0.72)] bg-white/92 text-[hsl(var(--muted-foreground))] opacity-100 transition hover:border-[rgba(185,28,28,0.28)] hover:text-[rgb(185,28,28)] md:opacity-0 md:group-hover:opacity-100"
                          aria-label="删除历史对话"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-[22px] border border-dashed border-[hsl(var(--border)/0.72)] bg-white/70 px-6 text-center">
                  <div>
                    <div className="text-sm font-medium text-[hsl(var(--foreground))]">暂无历史对话</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[hsl(var(--border)/0.58)] px-6 py-4">
        <FollowupInput disabled={false} loading={isFollowupLoading} onSubmit={onFollowup} />
      </div>
    </aside>
  );
}
