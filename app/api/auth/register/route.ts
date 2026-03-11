import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  createUser,
  defaultDisplayName,
  getUserByEmail,
  setSessionCookie,
} from "@/lib/auth/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体格式错误");
  }

  const body = payload as {
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
  };

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayNameRaw = typeof body.displayName === "string" ? body.displayName.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return jsonError(400, "INVALID_EMAIL", "请输入合法邮箱地址");
  }
  if (password.length < 8) {
    return jsonError(400, "INVALID_PASSWORD", "密码至少 8 位");
  }
  if (displayNameRaw && (displayNameRaw.length < 2 || displayNameRaw.length > 20)) {
    return jsonError(400, "INVALID_DISPLAY_NAME", "用户名长度需为 2-20 个字符");
  }

  if (getUserByEmail(email)) {
    return jsonError(409, "EMAIL_EXISTS", "该邮箱已注册");
  }

  try {
    const user = createUser({
      email,
      passwordHash: hashPassword(password),
      displayName: displayNameRaw || defaultDisplayName(email),
    });

    const session = createSession(user.id);
    const response = jsonOk({ user }, 201);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch {
    return jsonError(500, "REGISTER_FAILED", "注册失败，请稍后再试");
  }
}
