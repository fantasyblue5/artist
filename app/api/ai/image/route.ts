import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";
import { formatSiliconFlowError, generateImageWithSiliconFlow } from "@/lib/ai/siliconflow";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
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
    prompt?: unknown;
    referenceImage?: unknown;
  };

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const referenceImage = typeof body.referenceImage === "string" ? body.referenceImage.trim() : "";

  if (!prompt && !referenceImage) {
    return jsonError(400, "INVALID_INPUT", "请输入创作描述或上传参考图");
  }

  try {
    console.info("[/api/ai/image] request received", {
      userId: user.id,
      hasPrompt: Boolean(prompt),
      promptLength: prompt.length,
      hasReferenceImage: Boolean(referenceImage),
    });

    const result = await generateImageWithSiliconFlow({
      prompt,
      referenceImage: referenceImage || undefined,
    });

    const payload = {
      imageUrl: result.imageUrl,
      imageBase64: result.imageBase64,
      imageDataUrl: result.imageDataUrl ?? result.imageSrc,
      imageSrc: result.imageSrc,
      revisedPrompt: result.revisedPrompt,
    };

    console.info("[/api/ai/image] response ready", {
      hasImageUrl: Boolean(payload.imageUrl),
      hasImageBase64: Boolean(payload.imageBase64),
      hasImageDataUrl: Boolean(payload.imageDataUrl),
      imageSrcKind: payload.imageSrc?.startsWith("data:image/") ? "data-url" : "remote-url",
    });

    return jsonOk(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片生成失败，请稍后重试";
    const details = formatSiliconFlowError(error);
    console.error("[/api/ai/image] generation failed", {
      message,
      promptLength: prompt.length,
      hasReferenceImage: Boolean(referenceImage),
      errorName: details.name,
      errorCause: details.cause,
      retryable: details.isRetryable,
    });
    return jsonError(message.includes("网络连接失败") ? 502 : 500, "IMAGE_GENERATION_FAILED", message);
  }
}
