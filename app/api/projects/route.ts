import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";
import { createProjectForUser, listProjectsForUser } from "@/lib/projects/server";
import type { CreateProjectInput } from "@/lib/projects/types";

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

  const projects = listProjectsForUser(user.id);
  return jsonOk({ projects });
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

  const body = (payload ?? {}) as CreateProjectInput;
  const project = createProjectForUser(user.id, body);
  return jsonOk({ project }, 201);
}
