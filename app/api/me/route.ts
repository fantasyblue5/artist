import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest, updateDisplayName } from "@/lib/auth/server";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return jsonError(401, "UNAUTHORIZED", "请先登录");
  }
  return jsonOk({ user });
}

export async function PATCH(request: NextRequest) {
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

  const body = payload as { displayName?: unknown };
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length < 2 || displayName.length > 20) {
    return jsonError(400, "INVALID_DISPLAY_NAME", "用户名长度需为 2-20 个字符");
  }

  const updated = updateDisplayName(user.id, displayName);
  if (!updated) {
    return jsonError(404, "USER_NOT_FOUND", "用户不存在");
  }

  return jsonOk({ user: updated });
}
