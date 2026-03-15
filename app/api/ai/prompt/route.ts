import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";
import { polishPromptWithSiliconFlow } from "@/lib/ai/siliconflow";

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

  const body = (payload ?? {}) as { prompt?: unknown };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return jsonError(400, "INVALID_PROMPT", "请输入创作描述");
  }

  try {
    const polishedPrompt = await polishPromptWithSiliconFlow(prompt);
    return jsonOk({ prompt: polishedPrompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "润色失败，请稍后重试";
    return jsonError(500, "PROMPT_GENERATION_FAILED", message);
  }
}
