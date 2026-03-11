import type { LibraryAsset, PromptSnippet } from "@/lib/library/types";

const FAVORITES_KEY = "library:favorites:v1";
const NOTES_KEY = "library:notes:v1";
const ASSETS_KEY = "library:assets:v1";
const SNIPPETS_KEY = "library:snippets:v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getFavorites(): string[] {
  const value = readJson<string[]>(FAVORITES_KEY, []);
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function isFavorite(nodeId: string) {
  return getFavorites().includes(nodeId);
}

export function toggleFavorite(nodeId: string) {
  const set = new Set(getFavorites());
  if (set.has(nodeId)) {
    set.delete(nodeId);
  } else {
    set.add(nodeId);
  }

  const next = Array.from(set);
  writeJson(FAVORITES_KEY, next);
  return next;
}

export function getAllNotes() {
  const value = readJson<Record<string, string>>(NOTES_KEY, {});
  if (!value || typeof value !== "object") {
    return {};
  }
  return value;
}

export function getNodeNote(nodeId: string) {
  return getAllNotes()[nodeId] ?? "";
}

export function setNodeNote(nodeId: string, note: string) {
  const notes = getAllNotes();
  notes[nodeId] = note;
  writeJson(NOTES_KEY, notes);
  return notes;
}

export function getAssets(): LibraryAsset[] {
  const value = readJson<LibraryAsset[]>(ASSETS_KEY, []);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => item && typeof item.id === "string");
}

export function saveAssets(assets: LibraryAsset[]) {
  writeJson(ASSETS_KEY, assets);
}

export function getPromptSnippets(): PromptSnippet[] {
  const value = readJson<PromptSnippet[]>(SNIPPETS_KEY, []);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => item && typeof item.id === "string");
}

export function savePromptSnippets(snippets: PromptSnippet[]) {
  writeJson(SNIPPETS_KEY, snippets);
}
