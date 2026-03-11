import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";
import { getProjectForUser, softDeleteProjectForUser, updateProjectForUser } from "@/lib/projects/server";
import type { UpdateProjectPatch } from "@/lib/projects/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = getUserFromRequest(request);
  if (!user) {
    return jsonError(401, "UNAUTHORIZED", "请先登录");
  }

  const { id } = await context.params;
  const project = getProjectForUser(user.id, id);
  if (!project) {
    return jsonError(404, "PROJECT_NOT_FOUND", "项目不存在");
  }
  return jsonOk({ project });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const patch = (payload ?? {}) as UpdateProjectPatch;
  const { id } = await context.params;
  const project = updateProjectForUser(user.id, id, patch);
  if (!project) {
    return jsonError(404, "PROJECT_NOT_FOUND", "项目不存在");
  }
  return jsonOk({ project });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = getUserFromRequest(request);
  if (!user) {
    return jsonError(401, "UNAUTHORIZED", "请先登录");
  }

  const { id } = await context.params;
  const ok = softDeleteProjectForUser(user.id, id);
  if (!ok) {
    return jsonError(404, "PROJECT_NOT_FOUND", "项目不存在");
  }
  return jsonOk({ success: true });
}
