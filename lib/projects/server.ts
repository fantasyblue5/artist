import { randomUUID } from "node:crypto";
import { mutateDb, readDb, type DbCanvasDoc, type DbProject } from "@/lib/db";
import {
  type CanvasDoc,
  type CanvasDocState,
  type CreateProjectInput,
  type Project,
  type ProjectPreset,
  type UpdateProjectPatch,
  emptyCanvasDocState,
} from "@/lib/projects/types";

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .filter((item): item is string => typeof item === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizePreset(input: unknown): ProjectPreset | undefined {
  if (input === "1:1" || input === "4:3" || input === "16:9" || input === "A4") {
    return input;
  }
  return undefined;
}

function normalizeCanvasDoc(input: unknown): CanvasDocState {
  if (!input || typeof input !== "object") {
    return emptyCanvasDocState();
  }

  const raw = input as Record<string, unknown>;
  return {
    objects: Array.isArray(raw.objects) ? (raw.objects as CanvasDocState["objects"]) : [],
    strokes: Array.isArray(raw.strokes) ? (raw.strokes as CanvasDocState["strokes"]) : [],
    activeFrameId: typeof raw.activeFrameId === "string" ? raw.activeFrameId : null,
    historyItems: Array.isArray(raw.historyItems)
      ? (raw.historyItems as CanvasDocState["historyItems"])
      : [],
    analysisConversations: Array.isArray(raw.analysisConversations)
      ? (raw.analysisConversations as CanvasDocState["analysisConversations"])
      : [],
  };
}

function cloneCanvasDoc(doc: CanvasDocState): CanvasDocState {
  return JSON.parse(JSON.stringify(doc)) as CanvasDocState;
}

function toProject(record: DbProject): Project {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    coverThumb: record.coverThumb,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastOpenedAt: record.lastOpenedAt,
    tags: [...record.tags],
    initPreset: record.initPreset,
    deleted: Boolean(record.deleted),
  };
}

function toCanvas(record: DbCanvasDoc): CanvasDoc {
  return {
    doc: cloneCanvasDoc(record.doc),
    version: record.version,
    updatedAt: record.updatedAt,
  };
}

export function listProjectsForUser(userId: string): Project[] {
  return readDb()
    .projects.filter((item) => item.userId === userId && !item.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(toProject);
}

export function getProjectForUser(userId: string, projectId: string): Project | null {
  const record = readDb().projects.find((item) => item.id === projectId && item.userId === userId && !item.deleted);
  return record ? toProject(record) : null;
}

export function createProjectForUser(userId: string, input: CreateProjectInput): Project {
  const now = Date.now();
  const record: DbProject = {
    id: randomUUID(),
    userId,
    name: input.name?.trim() || "未命名项目",
    initPreset: normalizePreset(input.initPreset),
    tags: normalizeTags(input.tags),
    coverThumb: input.coverThumb?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: undefined,
    deleted: false,
  };

  mutateDb((db) => {
    db.projects.push(record);
  });

  return toProject(record);
}

export function updateProjectForUser(userId: string, projectId: string, patch: UpdateProjectPatch): Project | null {
  return mutateDb((db) => {
    const record = db.projects.find((item) => item.id === projectId && item.userId === userId && !item.deleted);
    if (!record) {
      return null;
    }

    record.name = typeof patch.name === "string" ? patch.name.trim() || record.name : record.name;
    record.tags = patch.tags ? normalizeTags(patch.tags) : record.tags;
    record.initPreset = patch.initPreset !== undefined ? normalizePreset(patch.initPreset) : record.initPreset;
    record.coverThumb =
      patch.coverThumb !== undefined ? patch.coverThumb?.trim() || undefined : record.coverThumb;
    record.lastOpenedAt = patch.lastOpenedAt !== undefined ? patch.lastOpenedAt : record.lastOpenedAt;
    record.deleted = patch.deleted !== undefined ? Boolean(patch.deleted) : record.deleted;
    record.updatedAt = typeof patch.updatedAt === "number" ? patch.updatedAt : Date.now();

    return toProject(record);
  });
}

export function softDeleteProjectForUser(userId: string, projectId: string): boolean {
  return mutateDb((db) => {
    const record = db.projects.find((item) => item.id === projectId && item.userId === userId && !item.deleted);
    if (!record) {
      return false;
    }

    record.deleted = true;
    record.updatedAt = Date.now();
    return true;
  });
}

export function getCanvasDocForProject(userId: string, projectId: string): CanvasDoc | null {
  const project = getProjectForUser(userId, projectId);
  if (!project) {
    return null;
  }

  const record = readDb().canvasDocs.find((item) => item.projectId === projectId && item.userId === userId);
  if (!record) {
    return {
      doc: emptyCanvasDocState(),
      version: 0,
      updatedAt: project.updatedAt,
    };
  }

  return toCanvas(record);
}

export function saveCanvasDocForProject(input: {
  userId: string;
  projectId: string;
  doc: CanvasDocState;
  version: number;
  coverThumb?: string;
}): { project: Project; canvas: CanvasDoc } | null {
  return mutateDb((db) => {
    const project = db.projects.find(
      (item) => item.id === input.projectId && item.userId === input.userId && !item.deleted,
    );
    if (!project) {
      return null;
    }

    const now = Date.now();
    const normalizedDoc = normalizeCanvasDoc(input.doc);

    let canvas = db.canvasDocs.find(
      (item) => item.projectId === input.projectId && item.userId === input.userId,
    );

    if (!canvas) {
      canvas = {
        id: randomUUID(),
        projectId: input.projectId,
        userId: input.userId,
        doc: cloneCanvasDoc(normalizedDoc),
        version: Math.max(1, input.version + 1),
        updatedAt: now,
      };
      db.canvasDocs.push(canvas);
    } else {
      canvas.doc = cloneCanvasDoc(normalizedDoc);
      canvas.version = Math.max(canvas.version + 1, input.version + 1);
      canvas.updatedAt = now;
    }

    project.updatedAt = now;
    if (input.coverThumb?.trim()) {
      project.coverThumb = input.coverThumb.trim();
    }

    return {
      project: toProject(project),
      canvas: toCanvas(canvas),
    };
  });
}
