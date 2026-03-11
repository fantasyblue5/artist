import {
  type CanvasDoc,
  type CanvasDocState,
  type CreateProjectInput,
  type Project,
  type ProjectPreset,
  type UpdateProjectPatch,
  emptyCanvasDocState,
} from "@/lib/projects/types";

export type { CanvasDoc, CanvasDocState, CreateProjectInput, Project, ProjectPreset, UpdateProjectPatch };

export type ApiError = {
  code: string;
  message: string;
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

type ProjectWire = {
  id: string;
  userId: string;
  name: string;
  coverThumb?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  tags: string[];
  initPreset?: ProjectPreset;
  deleted?: boolean;
};

type CanvasDocWire = {
  doc: CanvasDocState;
  version: number;
  updatedAt: number;
};

function normalizeProject(raw: ProjectWire): Project {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    coverThumb: raw.coverThumb,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lastOpenedAt: raw.lastOpenedAt,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    initPreset: raw.initPreset,
    deleted: Boolean(raw.deleted),
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

export function createGradientCoverThumb(seed: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const palette = [
    ["#dbe8f6", "#c5d7ec", "#b8cfe7"],
    ["#d9e4f2", "#c7d8ea", "#b9ccdf"],
    ["#e1e8f5", "#cddaf0", "#bfd0e8"],
    ["#dae6f4", "#c4d6ea", "#b4c8de"],
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const colors = palette[Math.abs(hash) % palette.length];

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.58, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(92, 116, 148, 0.15)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  return canvas.toDataURL("image/jpeg", 0.74);
}

export async function toCompressedCoverThumb(
  sourceDataUrl: string,
  options?: { maxWidth?: number; quality?: number },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 512;
  const quality = options?.quality ?? 0.7;

  if (typeof window === "undefined") {
    return sourceDataUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = sourceDataUrl;
  });

  const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return sourceDataUrl;
  }

  ctx.fillStyle = "#eef4fb";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

export function createEmptyCanvasDoc(): CanvasDocState {
  return emptyCanvasDocState();
}

export async function listProjects() {
  const result = await requestJson<{ projects: ProjectWire[] }>("/api/projects", {
    method: "GET",
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      projects: result.data.projects.map(normalizeProject),
    },
  };
}

export async function getProjectById(id: string) {
  const result = await requestJson<{ project: ProjectWire }>(`/api/projects/${id}`, {
    method: "GET",
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      project: normalizeProject(result.data.project),
    },
  };
}

export async function createProject(input: CreateProjectInput) {
  const result = await requestJson<{ project: ProjectWire }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      project: normalizeProject(result.data.project),
    },
  };
}

export async function updateProject(id: string, patch: UpdateProjectPatch) {
  const result = await requestJson<{ project: ProjectWire }>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      project: normalizeProject(result.data.project),
    },
  };
}

export async function deleteProject(id: string) {
  return requestJson<{ success: true }>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

export async function touchOpened(id: string) {
  return updateProject(id, {
    lastOpenedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function duplicateProject(id: string) {
  const sourceResult = await getProjectById(id);
  if (!sourceResult.ok) {
    return sourceResult;
  }

  const sourceCanvas = await getProjectCanvas(id);
  if (!sourceCanvas.ok) {
    return sourceCanvas;
  }

  const created = await createProject({
    name: `${sourceResult.data.project.name} 副本`,
    tags: sourceResult.data.project.tags,
    initPreset: sourceResult.data.project.initPreset,
    coverThumb: sourceResult.data.project.coverThumb,
  });

  if (!created.ok) {
    return created;
  }

  const savedCanvas = await saveProjectCanvas(created.data.project.id, {
    doc: sourceCanvas.data.canvas.doc,
    version: 0,
    coverThumb: sourceResult.data.project.coverThumb,
  });

  if (!savedCanvas.ok) {
    return savedCanvas;
  }

  return {
    ok: true as const,
    data: {
      project: created.data.project,
    },
  };
}

export async function getProjectCanvas(projectId: string) {
  const result = await requestJson<{ canvas: CanvasDocWire }>(`/api/projects/${projectId}/canvas`, {
    method: "GET",
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      canvas: {
        doc: result.data.canvas.doc ?? emptyCanvasDocState(),
        version: result.data.canvas.version ?? 0,
        updatedAt: result.data.canvas.updatedAt ?? Date.now(),
      } satisfies CanvasDoc,
    },
  };
}

export async function saveProjectCanvas(
  projectId: string,
  input: {
    doc: CanvasDocState;
    version: number;
    coverThumb?: string;
  },
) {
  const result = await requestJson<{ canvas: CanvasDocWire; project: ProjectWire }>(
    `/api/projects/${projectId}/canvas`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      canvas: {
        doc: result.data.canvas.doc ?? emptyCanvasDocState(),
        version: result.data.canvas.version ?? 0,
        updatedAt: result.data.canvas.updatedAt ?? Date.now(),
      } satisfies CanvasDoc,
      project: normalizeProject(result.data.project),
    },
  };
}
