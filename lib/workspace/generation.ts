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

export type InspirationImageApiData = {
  imageUrl?: string;
  imageBase64?: string;
  imageDataUrl?: string;
  imageSrc?: string;
  revisedPrompt: string;
};

const API_REQUEST_TIMEOUT_MS = 60000;

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

export async function polishPrompt(prompt: string) {
  return postJson<{ prompt: string }>("/api/ai/prompt", { prompt });
}

export async function generateInspirationImage(input: {
  prompt?: string;
  referenceImage?: string;
}) {
  console.info("[generateInspirationImage] request", {
    hasPrompt: Boolean(input.prompt?.trim()),
    promptLength: input.prompt?.trim().length ?? 0,
    hasReferenceImage: Boolean(input.referenceImage),
  });

  const result = await postJson<InspirationImageApiData>("/api/ai/image", input);
  if (result.ok) {
    console.info("[generateInspirationImage] response", {
      hasImageUrl: Boolean(result.data.imageUrl),
      hasImageBase64: Boolean(result.data.imageBase64),
      hasImageDataUrl: Boolean(result.data.imageDataUrl),
      hasImageSrc: Boolean(result.data.imageSrc),
    });
  } else {
    console.error("[generateInspirationImage] failed", result.error);
  }

  return result;
}
