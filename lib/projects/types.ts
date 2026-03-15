import type { EditorObject, Stroke } from "@/types/editor";
import type { SavedAnalysisConversation } from "@/components/workspace/analysis/types";

export type ProjectPreset = "1:1" | "4:3" | "16:9" | "A4";

export type Project = {
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

export type CreateProjectInput = {
  name?: string;
  coverThumb?: string;
  tags?: string[];
  initPreset?: ProjectPreset;
};

export type UpdateProjectPatch = Partial<
  Pick<
    Project,
    "name" | "coverThumb" | "tags" | "initPreset" | "lastOpenedAt" | "deleted" | "updatedAt"
  >
>;

export type CanvasDocState = {
  objects: EditorObject[];
  strokes: Stroke[];
  activeFrameId: string | null;
  historyItems?: Array<{
    id: string;
    imageSrc: string;
    prompt?: string;
    createdAt: string;
  }>;
  analysisConversations?: SavedAnalysisConversation[];
};

export type CanvasDoc = {
  doc: CanvasDocState;
  version: number;
  updatedAt: number;
};

export function emptyCanvasDocState(): CanvasDocState {
  return {
    objects: [],
    strokes: [],
    activeFrameId: null,
    historyItems: [],
    analysisConversations: [],
  };
}
