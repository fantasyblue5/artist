import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { mutateDb, readDb, type DbUser } from "@/lib/db";

const SESSION_COOKIE_NAME = "app_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
};

function sessionSecret() {
  return process.env.SESSION_SECRET?.trim() || "dev-session-secret-change-me";
}

function hashSessionToken(token: string) {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

function toPublicUser(row: DbUser): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function defaultDisplayName(email: string): string {
  const prefix = email.split("@")[0]?.trim() ?? "";
  const safe = prefix.replace(/\s+/g, "");
  if (safe.length >= 2) {
    return safe.slice(0, 20);
  }
  return "新用户";
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
}): PublicUser {
  const now = Date.now();

  const created = mutateDb((db) => {
    const exists = db.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase());
    if (exists) {
      throw new Error("EMAIL_EXISTS");
    }

    const user: DbUser = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(user);
    return user;
  });

  return toPublicUser(created);
}

export function getUserByEmail(email: string): (PublicUser & { passwordHash: string }) | null {
  const user = readDb().users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return null;
  }

  return {
    ...toPublicUser(user),
    passwordHash: user.passwordHash,
  };
}

export function updateDisplayName(userId: string, displayName: string): PublicUser | null {
  const updated = mutateDb((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    user.displayName = displayName;
    user.updatedAt = Date.now();
    return user;
  });

  if (!updated) {
    return null;
  }

  return toPublicUser(updated);
}

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;

  mutateDb((db) => {
    db.sessions.push({
      id: randomUUID(),
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      createdAt: Date.now(),
    });
  });

  return { token, expiresAt };
}

export function readSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: number) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function invalidateSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token);
  mutateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
  });
}

export function invalidateSessionFromRequest(request: NextRequest) {
  const token = readSessionToken(request);
  if (!token) {
    return;
  }
  invalidateSessionByToken(token);
}

export function getUserFromRequest(request: NextRequest): PublicUser | null {
  const token = readSessionToken(request);
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = Date.now();

  return mutateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.expiresAt > now);

    const session = db.sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) {
      return null;
    }

    const user = db.users.find((item) => item.id === session.userId);
    if (!user) {
      return null;
    }

    return toPublicUser(user);
  });
}
