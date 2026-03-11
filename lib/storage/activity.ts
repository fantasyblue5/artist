export type ActivityKind = "import" | "generate";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  createdAt: number;
};

const ACTIVITY_KEY = "artist_workspace_activity_v1";

let memoryActivity: ActivityItem[] = [];

function hasWindow() {
  return typeof window !== "undefined";
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeItem(raw: unknown): ActivityItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    (item.kind !== "import" && item.kind !== "generate") ||
    typeof item.title !== "string" ||
    typeof item.createdAt !== "number"
  ) {
    return null;
  }
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    createdAt: item.createdAt,
  };
}

function readRaw(): ActivityItem[] {
  if (!hasWindow()) {
    return memoryActivity;
  }

  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return safeArray(parsed)
      .map((item) => normalizeItem(item))
      .filter((item): item is ActivityItem => Boolean(item));
  } catch {
    return [];
  }
}

function writeRaw(items: ActivityItem[]) {
  if (!hasWindow()) {
    memoryActivity = items;
    return;
  }
  try {
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(items));
  } catch {
    // ignore storage write errors
  }
}

export function listActivity(kind?: ActivityKind): ActivityItem[] {
  const items = readRaw().sort((a, b) => b.createdAt - a.createdAt);
  return kind ? items.filter((item) => item.kind === kind) : items;
}

export function addActivity(kind: ActivityKind, title: string): ActivityItem {
  const nextItem: ActivityItem = {
    id: newId(),
    kind,
    title,
    createdAt: Date.now(),
  };

  const items = readRaw();
  const next = [nextItem, ...items].slice(0, 100);
  writeRaw(next);
  return nextItem;
}
