import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";
import {
  analyzeArtworkWithSiliconFlow,
  answerArtworkFollowupWithSiliconFlow,
  formatSiliconFlowError,
} from "@/lib/ai/siliconflow";
import type {
  AnalysisFollowup,
  AnalysisImageSource,
  ArtworkAnalysisResult,
} from "@/components/workspace/analysis/types";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

function normalizeImage(input: unknown): AnalysisImageSource | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const src = typeof raw.src === "string" ? raw.src.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const origin =
    raw.origin === "local" || raw.origin === "generation" || raw.origin === "shortcut"
      ? raw.origin
      : "local";
  const sourceType = raw.sourceType === "url" ? "url" : "data-url";
  const importedAt = typeof raw.importedAt === "number" ? raw.importedAt : Date.now();

  if (!src) {
    return null;
  }

  return {
    src,
    name: name || "分析图片",
    origin,
    sourceType,
    importedAt,
  };
}

function normalizeResult(input: unknown): ArtworkAnalysisResult | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  return input as ArtworkAnalysisResult;
}

function normalizeFollowups(input: unknown): AnalysisFollowup[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const value = item as Record<string, unknown>;
      const id = typeof value.id === "string" ? value.id.trim() : "";
      const question = typeof value.question === "string" ? value.question.trim() : "";
      const answer = typeof value.answer === "string" ? value.answer.trim() : "";

      if (!question || !answer) {
        return null;
      }

      return {
        id: id || `followup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question,
        answer,
      };
    })
    .filter(Boolean) as AnalysisFollowup[];
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return jsonError(401, "UNAUTHORIZED", "请先登录");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体格式错误");
  }

  const body = (payload ?? {}) as {
    mode?: unknown;
    image?: unknown;
    question?: unknown;
    result?: unknown;
    followups?: unknown;
  };

  const mode = body.mode === "followup" ? "followup" : "analyze";
  const image = normalizeImage(body.image);

  try {
    if (mode === "analyze") {
      if (!image) {
        return jsonError(400, "INVALID_IMAGE", "请先上传需要分析的图片");
      }

      const result = await analyzeArtworkWithSiliconFlow(image);
      return jsonOk({ result });
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return jsonError(400, "INVALID_QUESTION", "请输入要追问的问题");
    }

    const answer = await answerArtworkFollowupWithSiliconFlow({
      question,
      image,
      result: normalizeResult(body.result),
      followups: normalizeFollowups(body.followups),
    });

    return jsonOk({
      followup: {
        id: `followup-${Date.now()}`,
        question,
        answer,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "画面分析失败，请稍后重试";
    const details = formatSiliconFlowError(error);
    console.error("[/api/ai/analysis] request failed", {
      userId: user.id,
      mode,
      hasImage: Boolean(image),
      errorName: details.name,
      errorCause: details.cause,
      retryable: details.isRetryable,
      message,
    });
    return jsonError(message.includes("网络连接失败") ? 502 : 500, "ARTWORK_ANALYSIS_FAILED", message);
  }
}
