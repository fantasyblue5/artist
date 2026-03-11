import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie, invalidateSessionFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export async function POST(request: NextRequest) {
  invalidateSessionFromRequest(request);
  const response = jsonOk({ success: true });
  clearSessionCookie(response);
  return response;
}
