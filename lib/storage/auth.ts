export type ApiError = {
  code: string;
  message: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
};

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: ApiError;
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

function deriveInitials(input: { email: string; displayName?: string }) {
  const name = input.displayName?.trim() ?? "";
  if (name) {
    const compact = name.replace(/\s+/g, "");
    if (/[\u3400-\u9fff]/.test(compact)) {
      return compact.slice(0, 2);
    }
    const parts = name.split(/[\s._\-+]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    const alpha = name.replace(/[^A-Za-z0-9]/g, "");
    if (alpha.length >= 2) {
      return alpha.slice(0, 2).toUpperCase();
    }
    return (alpha[0] ?? name[0] ?? "?").toUpperCase();
  }

  const local = input.email.split("@")[0]?.trim() ?? "";
  const tokens = local.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (tokens.length >= 2) {
    return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
  }
  const compact = local.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length >= 2) {
    return compact.slice(0, 2).toUpperCase();
  }
  if (compact.length === 1) {
    return compact.toUpperCase();
  }
  return "??";
}

function toAuthUser(raw: { id: string; email: string; displayName: string }): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    displayName: raw.displayName,
    initials: deriveInitials({ email: raw.email, displayName: raw.displayName }),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
      cache: "no-store",
    });

    const json = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !json.ok) {
      if (!json || typeof json !== "object" || !("ok" in json)) {
        return {
          ok: false,
          error: { code: "REQUEST_FAILED", message: "请求失败，请稍后重试" },
        };
      }
      return json as ApiFailure;
    }
    return json;
  } catch {
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: "网络异常，请稍后重试" },
    };
  }
}

export async function login(input: { email: string; password: string }) {
  const result = await requestJson<{ user: { id: string; email: string; displayName: string } }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (!result.ok) {
    return result;
  }
  return {
    ok: true as const,
    data: { user: toAuthUser(result.data.user) },
  };
}

export async function register(input: { email: string; password: string; displayName?: string }) {
  const result = await requestJson<{ user: { id: string; email: string; displayName: string } }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (!result.ok) {
    return result;
  }
  return {
    ok: true as const,
    data: { user: toAuthUser(result.data.user) },
  };
}

export async function logout() {
  return requestJson<{ success: true }>("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  const result = await requestJson<{ user: { id: string; email: string; displayName: string } }>("/api/me", {
    method: "GET",
  });

  if (!result.ok) {
    return result;
  }
  return {
    ok: true as const,
    data: { user: toAuthUser(result.data.user) },
  };
}

export async function updateMe(input: { displayName: string }) {
  const result = await requestJson<{ user: { id: string; email: string; displayName: string } }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    return result;
  }
  return {
    ok: true as const,
    data: { user: toAuthUser(result.data.user) },
  };
}
