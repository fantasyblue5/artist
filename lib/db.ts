import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CanvasDocState, ProjectPreset } from "@/lib/projects/types";

export type DbUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
};

export type DbSession = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
};

export type DbProject = {
  id: string;
  userId: string;
  name: string;
  initPreset?: ProjectPreset;
  tags: string[];
  coverThumb?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  deleted: boolean;
};

export type DbCanvasDoc = {
  id: string;
  projectId: string;
  userId: string;
  doc: CanvasDocState;
  version: number;
  updatedAt: number;
};

type AppDb = {
  users: DbUser[];
  sessions: DbSession[];
  projects: DbProject[];
  canvasDocs: DbCanvasDoc[];
  meta: {
    version: number;
    updatedAt: number;
  };
};

const DB_VERSION = 1;
let didWarnLegacyConflict = false;

function now() {
  return Date.now();
}

function resolveDataPath() {
  const raw = process.env.DATABASE_URL?.trim();
  const configuredPath = raw
    ? raw.startsWith("file:")
      ? raw.slice(5)
      : raw
    : path.join("data", "app.json");

  const normalizedPath = configuredPath.endsWith(".db")
    ? configuredPath.replace(/\.db$/i, ".json")
    : configuredPath;

  return path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.join(process.cwd(), normalizedPath);
}

const dataPath = resolveDataPath();
const legacySqlitePath = path.join(process.cwd(), "data", "app.db");

function ensureDataFile() {
  const dir = path.dirname(dataPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(dataPath)) {
    writeFileSync(dataPath, JSON.stringify(createEmptyDb(), null, 2), "utf8");
  }
}

function createEmptyDb(): AppDb {
  return {
    users: [],
    sessions: [],
    projects: [],
    canvasDocs: [],
    meta: {
      version: DB_VERSION,
      updatedAt: now(),
    },
  };
}

function sanitizeDb(raw: unknown): AppDb {
  if (!raw || typeof raw !== "object") {
    return createEmptyDb();
  }

  const data = raw as Partial<AppDb>;
  const next: AppDb = {
    users: Array.isArray(data.users) ? (data.users as DbUser[]) : [],
    sessions: Array.isArray(data.sessions) ? (data.sessions as DbSession[]) : [],
    projects: Array.isArray(data.projects) ? (data.projects as DbProject[]) : [],
    canvasDocs: Array.isArray(data.canvasDocs) ? (data.canvasDocs as DbCanvasDoc[]) : [],
    meta: {
      version: typeof data.meta?.version === "number" ? data.meta.version : DB_VERSION,
      updatedAt: typeof data.meta?.updatedAt === "number" ? data.meta.updatedAt : now(),
    },
  };

  return next;
}

function maybeWarnLegacyConflict(current: AppDb) {
  if (didWarnLegacyConflict) {
    return;
  }
  didWarnLegacyConflict = true;

  if (!existsSync(legacySqlitePath)) {
    return;
  }

  const samePath = path.resolve(legacySqlitePath) === path.resolve(dataPath);
  if (samePath) {
    return;
  }

  // If active JSON store has no users but legacy sqlite exists, login will fail unless migrated.
  if (current.users.length === 0) {
    console.warn(
      `[auth] Active store is "${dataPath}", but legacy sqlite "${legacySqlitePath}" also exists. ` +
        "Current JSON users are empty; run data migration or use the active JSON file to avoid login mismatch.",
    );
  }
}

export function readDb(): AppDb {
  ensureDataFile();

  try {
    const raw = readFileSync(dataPath, "utf8");
    if (!raw.trim()) {
      const empty = createEmptyDb();
      maybeWarnLegacyConflict(empty);
      return empty;
    }

    const parsed = sanitizeDb(JSON.parse(raw));
    maybeWarnLegacyConflict(parsed);
    return parsed;
  } catch {
    const empty = createEmptyDb();
    maybeWarnLegacyConflict(empty);
    return empty;
  }
}

function writeDb(data: AppDb) {
  data.meta.updatedAt = now();
  const dir = path.dirname(dataPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${dataPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  renameSync(tempPath, dataPath);
}

export function mutateDb<T>(updater: (data: AppDb) => T): T {
  const db = readDb();
  const result = updater(db);
  writeDb(db);
  return result;
}

export function getDbFilePath() {
  return dataPath;
}
