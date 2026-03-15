import type {
  AnalysisFollowup,
  AnalysisImageSource,
  ArtworkAnalysisResult,
} from "@/components/workspace/analysis/types";

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

const API_REQUEST_TIMEOUT_MS = 130000;

export const ANALYSIS_LOADING_STEPS = [
  "正在识别画面主体",
  "正在分析构图与层次",
  "正在判断色彩与光影关系",
  "正在生成专业建议",
] as const;

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });

    const json = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !json.ok) {
      if (!json || typeof json !== "object" || !("ok" in json)) {
        return {
          ok: false as const,
          error: { code: "REQUEST_FAILED", message: "请求失败，请稍后重试" },
        };
      }
      return json;
    }

    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false as const,
        error: {
          code: "REQUEST_TIMEOUT",
          message: `请求超时（${Math.round(API_REQUEST_TIMEOUT_MS / 1000)} 秒），请重试`,
        },
      };
    }

    return {
      ok: false as const,
      error: { code: "NETWORK_ERROR", message: "网络异常，请稍后重试" },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function runArtworkAnalysis(image: AnalysisImageSource): Promise<ArtworkAnalysisResult> {
  const result = await postJson<{ result: ArtworkAnalysisResult }>("/api/ai/analysis", {
    mode: "analyze",
    image,
  });

  if (!result.ok) {
    throw new Error(result.error.message || "分析失败，请稍后重试");
  }

  return result.data.result;
}

export async function runAnalysisFollowup(input: {
  question: string;
  image: AnalysisImageSource | null;
  result: ArtworkAnalysisResult | null;
  followups: AnalysisFollowup[];
}): Promise<AnalysisFollowup> {
  const result = await postJson<{ followup: AnalysisFollowup }>("/api/ai/analysis", {
    mode: "followup",
    question: input.question,
    image: input.image,
    result: input.result,
    followups: input.followups,
  });

  if (!result.ok) {
    throw new Error(result.error.message || "追问失败，请稍后重试");
  }

  return result.data.followup;
}
