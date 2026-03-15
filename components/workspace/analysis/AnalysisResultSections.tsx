"use client";

import type { ArtworkAnalysisResult } from "@/components/workspace/analysis/types";

type AnalysisResultSectionsProps = {
  result: ArtworkAnalysisResult;
};

export function AnalysisResultSections({ result }: AnalysisResultSectionsProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[22px] border border-[hsl(var(--border)/0.55)] bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        <div className="text-sm font-semibold text-[hsl(var(--foreground))]">整体判断</div>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{result.summary.overall_assessment}</p>
        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          主要问题
        </div>
        <div className="mt-2 space-y-2">
          {result.summary.top_issues.map((item) => (
            <p key={item} className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          分析维度
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {result.dimensions.map((dimension) => (
            <div
              key={dimension.name}
              className="rounded-[22px] border border-[hsl(var(--border)/0.55)] bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
            >
              <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{dimension.name}</div>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {dimension.analysis.professional_judgment}
              </p>
              <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                证据：{dimension.evidence.join("；")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          关键优化建议
        </div>
        <div className="space-y-2">
          {result.dimensions.flatMap((dimension) => dimension.suggestions).map((suggestion, index) => (
            <div
              key={`${index}-${suggestion}`}
              className="flex gap-3 rounded-[20px] border border-[hsl(var(--border)/0.55)] bg-white/78 px-4 py-3"
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs font-semibold text-[hsl(var(--primary-foreground))]">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-[hsl(var(--foreground))]">{suggestion}</p>
            </div>
          ))}
        </div>
      </section>

      {result.followups.length > 0 ? (
        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            补充问答
          </div>
          <div className="space-y-3">
            {result.followups.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-[hsl(var(--border)/0.6)] bg-white/76 p-4">
                <div className="text-xs font-semibold text-[hsl(var(--primary))]">追问</div>
                <p className="mt-1 text-sm leading-6 text-[hsl(var(--foreground))]">{item.question}</p>
                <div className="mt-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">补充分析</div>
                <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
