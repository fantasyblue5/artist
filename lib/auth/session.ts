export type User = {
  email: string;
  name?: string;
  initials: string;
};

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

function hasWindow() {
  return typeof window !== "undefined";
}

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }

  const compact = trimmed.replace(/\s+/g, "");
  if (/[\u3400-\u9fff]/.test(compact)) {
    return compact.slice(0, 2);
  }

  const parts = trimmed.split(/[\s._\-+]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  const alnum = trimmed.replace(/[^A-Za-z0-9]/g, "");
  if (alnum.length >= 2) {
    return alnum.slice(0, 2).toUpperCase();
  }

  return (alnum[0] ?? trimmed[0] ?? "?").toUpperCase();
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) {
    return "??";
  }

  const parts = local.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  const compact = local.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length >= 2) {
    return compact.slice(0, 2).toUpperCase();
  }

  if (compact.length === 1) {
    return compact[0].toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

export function deriveInitials({ email, name }: { email: string; name?: string }): string {
  if (name) {
    const fromName = initialsFromName(name);
    if (fromName) {
      return fromName;
    }
  }

  return initialsFromEmail(email);
}

function normalizeUser(user: User): User {
  const email = user.email.trim();
  const name = user.name?.trim() || undefined;
  const initials = (user.initials?.trim() || deriveInitials({ email, name })).slice(0, 2);
  return { email, name, initials };
}

export function getSession(): { token: string; user: User } | null {
  if (!hasWindow()) {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(AUTH_USER_KEY);
  if (!token || !rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as Partial<User>;
    if (typeof parsed.email !== "string" || !parsed.email.trim()) {
      return null;
    }

    const normalized = normalizeUser({
      email: parsed.email,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      initials: typeof parsed.initials === "string" ? parsed.initials : "",
    });

    return { token, user: normalized };
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User): void {
  if (!hasWindow()) {
    return;
  }

  const normalized = normalizeUser(user);
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
}

export function clearSession(): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthed(): boolean {
  return Boolean(getSession()?.token);
}
