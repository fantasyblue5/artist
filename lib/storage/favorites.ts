const KEY = "library_favorite_node_ids_v1";

function hasWindow() {
  return typeof window !== "undefined";
}

function readSet(): Set<string> {
  if (!hasWindow()) {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(next: Set<string>) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(KEY, JSON.stringify(Array.from(next)));
}

export function getFavoriteNodeIds() {
  return Array.from(readSet());
}

export function isFavoriteNode(nodeId: string) {
  return readSet().has(nodeId);
}

export function toggleFavoriteNode(nodeId: string) {
  const favorites = readSet();
  const exists = favorites.has(nodeId);
  if (exists) {
    favorites.delete(nodeId);
  } else {
    favorites.add(nodeId);
  }
  writeSet(favorites);
  return !exists;
}
