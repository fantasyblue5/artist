"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisWorkspace } from "@/components/workspace/analysis/AnalysisWorkspace";
import type {
  AnalysisFollowup,
  AnalysisImageSource,
  AnalysisPendingMessage,
  SavedAnalysisConversation,
  AnalysisViewState,
  ArtworkAnalysisResult,
} from "@/components/workspace/analysis/types";
import { CanvasStage } from "@/components/workspace/CanvasStage";
import { HistoryDrawer } from "@/components/workspace/HistoryDrawer";
import { LeftPanel } from "@/components/workspace/LeftPanel";
import { ToolRail } from "@/components/workspace/ToolRail";
import { Topbar } from "@/components/workspace/Topbar";
import type { HistoryItem, ToolKey } from "@/components/workspace/types";
import {
  createEmptyCanvasDoc,
  createGradientCoverThumb,
  getProjectCanvas,
  saveProjectCanvas,
  toCompressedCoverThumb,
  type CanvasDocState,
} from "@/lib/storage/projects";
import {
  ANALYSIS_LOADING_STEPS,
  runAnalysisFollowup,
  runArtworkAnalysis,
} from "@/lib/workspace/artwork-analysis";
import type { ImageObject } from "@/types/editor";

type WorkspaceLayoutProps = {
  projectName?: string;
  projectId?: string;
};

type GeneratedImageRequest = {
  requestId: string;
  status: "loading" | "ready" | "error";
  prompt: string;
  src?: string;
  sourceType?: "data-url" | "url";
};

type SaveState = "idle" | "saving" | "saved" | "error";
const EDITOR_DRAFT_STORAGE_KEY = "workspace:editor:draft:v1";
const EDITOR_DRAFT_DB_NAME = "workspace-editor-draft";
const EDITOR_DRAFT_STORE_NAME = "drafts";

function formatSaveStatus(state: SaveState, savedAt: number | null) {
  if (state === "saving") {
    return "保存中...";
  }
  if (state === "error") {
    return "保存失败";
  }
  if (state === "saved" && savedAt) {
    return `已保存 ${new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(savedAt)}`;
  }
  return "";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("文件读取失败"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function cloneCanvasDocState(doc: CanvasDocState): CanvasDocState {
  return JSON.parse(JSON.stringify(doc)) as CanvasDocState;
}

function withCanvasDocMeta(
  doc: CanvasDocState,
  historyItems: HistoryItem[],
  analysisConversations: SavedAnalysisConversation[],
): CanvasDocState {
  return {
    ...doc,
    historyItems,
    analysisConversations,
  };
}

function getSourceType(src: string): "data-url" | "url" {
  return src.startsWith("data:image/") ? "data-url" : "url";
}

function toAnalysisImageFromHistory(item: HistoryItem): AnalysisImageSource {
  return {
    src: item.imageSrc,
    name: item.prompt || "历史生成结果",
    origin: "generation",
    sourceType: getSourceType(item.imageSrc),
    importedAt: Date.now(),
  };
}

function getLatestCanvasImage(doc: CanvasDocState): ImageObject | null {
  const generatedFirst = [...doc.objects]
    .reverse()
    .find((object): object is ImageObject => object.type === "image" && object.generationSlot === "inspiration");

  if (generatedFirst) {
    return generatedFirst;
  }

  return (
    [...doc.objects].reverse().find((object): object is ImageObject => object.type === "image") ?? null
  );
}

function toAnalysisImageFromCanvasObject(object: ImageObject): AnalysisImageSource {
  return {
    src: object.src,
    name: object.alt?.trim() || "当前画布结果",
    origin: "generation",
    sourceType: getSourceType(object.src),
    importedAt: Date.now(),
  };
}

function toSavedConversationImage(conversation: SavedAnalysisConversation): AnalysisImageSource {
  return {
    src: conversation.imageSrc,
    name: conversation.imageName,
    origin: conversation.origin,
    sourceType: conversation.sourceType,
    importedAt: conversation.updatedAt,
  };
}

function sameJsonValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getEditorDraftRecordKey(projectId?: string) {
  return projectId ? `project:${projectId}` : "active";
}

function readLegacyEditorDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(EDITOR_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      doc?: CanvasDocState;
      historyItems?: HistoryItem[];
      updatedAt?: number;
    };

    return {
      doc: parsed.doc ?? createEmptyCanvasDoc(),
      historyItems: Array.isArray(parsed.historyItems) ? parsed.historyItems : [],
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

function openEditorDraftDb() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve<IDBDatabase | null>(null);
  }

  return new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(EDITOR_DRAFT_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EDITOR_DRAFT_STORE_NAME)) {
        db.createObjectStore(EDITOR_DRAFT_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function loadEditorDraft(projectId?: string) {
  const legacyDraft = !projectId ? readLegacyEditorDraft() : null;
  const db = await openEditorDraftDb();
  const recordKey = getEditorDraftRecordKey(projectId);

  if (!db) {
    return legacyDraft;
  }

  const indexedDraft = await new Promise<{
    doc: CanvasDocState;
    historyItems: HistoryItem[];
    updatedAt: number;
  } | null>((resolve) => {
    const tx = db.transaction(EDITOR_DRAFT_STORE_NAME, "readonly");
    const store = tx.objectStore(EDITOR_DRAFT_STORE_NAME);
    const request = store.get(recordKey);

    request.onsuccess = () => {
      const raw = request.result as
        | {
            doc?: CanvasDocState;
            historyItems?: HistoryItem[];
            updatedAt?: number;
          }
        | undefined;

      if (!raw) {
        resolve(null);
        return;
      }

      resolve({
        doc: raw.doc ?? createEmptyCanvasDoc(),
        historyItems: Array.isArray(raw.historyItems) ? raw.historyItems : [],
        updatedAt: raw.updatedAt ?? Date.now(),
      });
    };

    request.onerror = () => resolve(null);
  });

  if (indexedDraft) {
    return indexedDraft;
  }

  if (legacyDraft) {
    void saveEditorDraft(undefined, legacyDraft.doc, legacyDraft.historyItems);
    window.localStorage.removeItem(EDITOR_DRAFT_STORAGE_KEY);
  }

  return legacyDraft;
}

async function saveEditorDraft(projectId: string | undefined, doc: CanvasDocState, historyItems: HistoryItem[]) {
  if (typeof window === "undefined") {
    return false;
  }

  const payload = {
    doc,
    historyItems,
    updatedAt: Date.now(),
  };

  const db = await openEditorDraftDb();
  if (db) {
    const saved = await new Promise<boolean>((resolve) => {
      const tx = db.transaction(EDITOR_DRAFT_STORE_NAME, "readwrite");
      tx.objectStore(EDITOR_DRAFT_STORE_NAME).put(payload, getEditorDraftRecordKey(projectId));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });

    if (saved && !projectId) {
      window.localStorage.removeItem(EDITOR_DRAFT_STORAGE_KEY);
    }
    if (saved) {
      return true;
    }
  }

  if (projectId) {
    return false;
  }

  try {
    window.localStorage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function WorkspaceLayout({ projectName, projectId }: WorkspaceLayoutProps) {
  const [activeTool, setActiveTool] = useState<ToolKey>("inspiration");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const [initialDoc, setInitialDoc] = useState<CanvasDocState>(createEmptyCanvasDoc());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [generatedImageRequest, setGeneratedImageRequest] = useState<GeneratedImageRequest | null>(null);
  const [analysisImage, setAnalysisImage] = useState<AnalysisImageSource | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisViewState>("empty");
  const [analysisResult, setAnalysisResult] = useState<ArtworkAnalysisResult | null>(null);
  const [analysisFollowups, setAnalysisFollowups] = useState<AnalysisFollowup[]>([]);
  const [analysisConversations, setAnalysisConversations] = useState<SavedAnalysisConversation[]>([]);
  const [pendingAnalysisMessage, setPendingAnalysisMessage] = useState<AnalysisPendingMessage | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisLoadingStepIndex, setAnalysisLoadingStepIndex] = useState(0);
  const [isFollowupLoading, setIsFollowupLoading] = useState(false);
  const [analysisCanvasSeed, setAnalysisCanvasSeed] = useState<CanvasDocState>(createEmptyCanvasDoc());

  const versionRef = useRef(0);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(true);
  const savingRef = useRef(false);
  const latestDocRef = useRef<CanvasDocState>(createEmptyCanvasDoc());
  const skipNextDocSyncRef = useRef(true);
  const debounceTimerRef = useRef<number | null>(null);
  const snapshotGetterRef = useRef<(() => string | null) | null>(null);
  const historyItemsRef = useRef<HistoryItem[]>([]);
  const analysisConversationsRef = useRef<SavedAnalysisConversation[]>([]);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (!dirtyRef.current || savingRef.current) {
      return;
    }

    const snapshotDoc = withCanvasDocMeta(
      latestDocRef.current,
      historyItemsRef.current,
      analysisConversationsRef.current,
    );
    const localSaved = await saveEditorDraft(projectId, snapshotDoc, historyItemsRef.current);
    if (!projectId) {
      if (!localSaved) {
        setSaveState("error");
        return;
      }
      dirtyRef.current = false;
      setSaveState("saved");
      setLastSavedAt(Date.now());
      return;
    }

    console.info("[WorkspaceLayout] flushing canvas", {
      projectId,
      objectCount: snapshotDoc.objects.length,
      strokeCount: snapshotDoc.strokes.length,
      activeFrameId: snapshotDoc.activeFrameId,
      version: versionRef.current,
    });
    savingRef.current = true;
    setSaveState("saving");

    try {
      let coverThumb: string | undefined;
      const rawSnapshot = snapshotGetterRef.current?.();
      if (rawSnapshot) {
        coverThumb = await toCompressedCoverThumb(rawSnapshot, {
          maxWidth: 512,
          quality: 0.7,
        });
      }
      if (!coverThumb) {
        coverThumb = createGradientCoverThumb(projectId);
      }

      const result = await saveProjectCanvas(projectId, {
        doc: snapshotDoc,
        version: versionRef.current,
        coverThumb,
      });

      if (!result.ok) {
        console.error("[WorkspaceLayout] save canvas failed", {
          projectId,
          error: result.error,
        });
        setSaveState("error");
        return;
      }

      versionRef.current = result.data.canvas.version;
      if (latestDocRef.current === snapshotDoc) {
        dirtyRef.current = false;
      }
      setSaveState("saved");
      setLastSavedAt(Date.now());
      console.info("[WorkspaceLayout] canvas saved", {
        projectId,
        objectCount: result.data.canvas.doc.objects.length,
        strokeCount: result.data.canvas.doc.strokes.length,
        version: result.data.canvas.version,
      });
      window.dispatchEvent(new Event("projects:updated"));
    } finally {
      savingRef.current = false;

      if (dirtyRef.current) {
        clearDebounce();
        debounceTimerRef.current = window.setTimeout(() => {
          void flushSave();
        }, 260);
      }
    }
  }, [clearDebounce, projectId]);

  const queueSave = useCallback(
    (doc: CanvasDocState) => {
      latestDocRef.current = doc;
      if (skipNextDocSyncRef.current) {
        skipNextDocSyncRef.current = false;
        return;
      }

      if (loadingRef.current) {
        return;
      }

      if (activeTool !== "analysis") {
        setAnalysisCanvasSeed(doc);
      }

      console.info("[WorkspaceLayout] queue canvas save", {
        projectId,
        objectCount: doc.objects.length,
        strokeCount: doc.strokes.length,
        activeFrameId: doc.activeFrameId,
      });
      dirtyRef.current = true;
      setSaveState((prev) => (prev === "saving" ? prev : "idle"));
      clearDebounce();
      debounceTimerRef.current = window.setTimeout(() => {
        void flushSave();
      }, 800);
    },
    [activeTool, clearDebounce, flushSave, projectId],
  );

  useEffect(() => {
    let active = true;
    loadingRef.current = true;
    dirtyRef.current = false;
    clearDebounce();

    const load = async () => {
      if (!projectId) {
        if (!active) {
          return;
        }
        const draft = await loadEditorDraft();
        const empty = draft?.doc ?? createEmptyCanvasDoc();
        skipNextDocSyncRef.current = true;
        latestDocRef.current = empty;
        versionRef.current = 0;
        setInitialDoc(empty);
        setAnalysisCanvasSeed(empty);
        setHistoryItems(draft?.historyItems ?? empty.historyItems ?? []);
        setAnalysisConversations(empty.analysisConversations ?? []);
        setSaveState("idle");
        setLastSavedAt(draft?.updatedAt ?? null);
        loadingRef.current = false;
        return;
      }

      console.info("[WorkspaceLayout] loading canvas", { projectId });
      const [result, draft] = await Promise.all([getProjectCanvas(projectId), loadEditorDraft(projectId)]);
      if (!active) {
        return;
      }

      if (result.ok) {
        const serverDoc = result.data.canvas.doc;
        const serverUpdatedAt = result.data.canvas.updatedAt || 0;
        const draftUpdatedAt = draft?.updatedAt ?? 0;
        const serverHasContent =
          serverDoc.objects.length > 0 ||
          serverDoc.strokes.length > 0 ||
          (serverDoc.historyItems?.length ?? 0) > 0 ||
          (serverDoc.analysisConversations?.length ?? 0) > 0;
        const shouldUseDraft =
          Boolean(draft) && (draftUpdatedAt > serverUpdatedAt || (!serverHasContent && draftUpdatedAt > 0));
        const resolvedDoc = shouldUseDraft ? (draft?.doc ?? serverDoc) : serverDoc;
        const resolvedHistory = shouldUseDraft
          ? (draft?.historyItems ?? resolvedDoc.historyItems ?? [])
          : (serverDoc.historyItems ?? []);
        const resolvedUpdatedAt = shouldUseDraft ? draftUpdatedAt : serverUpdatedAt;
        console.info("[WorkspaceLayout] canvas loaded", {
          projectId,
          objectCount: resolvedDoc.objects.length,
          strokeCount: resolvedDoc.strokes.length,
          activeFrameId: resolvedDoc.activeFrameId,
          version: result.data.canvas.version,
          restoredFromDraft: shouldUseDraft,
        });
        skipNextDocSyncRef.current = true;
        latestDocRef.current = resolvedDoc;
        versionRef.current = result.data.canvas.version;
        setInitialDoc(resolvedDoc);
        setAnalysisCanvasSeed(resolvedDoc);
        setHistoryItems(resolvedHistory);
        setAnalysisConversations(resolvedDoc.analysisConversations ?? []);
        setSaveState("saved");
        setLastSavedAt(resolvedUpdatedAt || Date.now());
      } else {
        console.error("[WorkspaceLayout] load canvas failed", {
          projectId,
          error: result.error,
        });
        const empty = draft?.doc ?? createEmptyCanvasDoc();
        skipNextDocSyncRef.current = true;
        latestDocRef.current = empty;
        versionRef.current = 0;
        setInitialDoc(empty);
        setAnalysisCanvasSeed(empty);
        setHistoryItems(draft?.historyItems ?? empty.historyItems ?? []);
        setAnalysisConversations(empty.analysisConversations ?? []);
        setSaveState(draft ? "saved" : "error");
        setLastSavedAt(draft?.updatedAt ?? null);
      }

      loadingRef.current = false;
    };

    void load();

    return () => {
      active = false;
    };
  }, [clearDebounce, projectId]);

  useEffect(() => {
    historyItemsRef.current = historyItems;
  }, [historyItems]);

  useEffect(() => {
    analysisConversationsRef.current = analysisConversations;
  }, [analysisConversations]);

  useEffect(() => {
    const onBeforeUnload = () => {
      void flushSave();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushSave();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearDebounce();
      void flushSave();
    };
  }, [clearDebounce, flushSave]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tool = params.get("tool");
    const prefillImage = params.get("analysisImage");
    const prefillName = params.get("analysisName")?.trim() || "快捷导入图片";

    if (tool === "analysis") {
      setActiveTool("analysis");
      setAnalysisCanvasSeed(cloneCanvasDocState(latestDocRef.current));
    }

    if (prefillImage) {
      setAnalysisImage({
        src: prefillImage,
        name: prefillName,
        origin: "shortcut",
        sourceType: prefillImage.startsWith("data:image/") ? "data-url" : "url",
        importedAt: Date.now(),
      });
      setAnalysisStatus("image_ready");
      setAnalysisResult(null);
      setAnalysisFollowups([]);
      setPendingAnalysisMessage(null);
      setAnalysisError(null);
    }
  }, []);

  useEffect(() => {
    if (analysisStatus !== "analyzing") {
      return;
    }

    const timer = window.setInterval(() => {
      setAnalysisLoadingStepIndex((prev) => (prev + 1) % ANALYSIS_LOADING_STEPS.length);
    }, 1200);

    return () => {
      window.clearInterval(timer);
    };
  }, [analysisStatus]);

  useEffect(() => {
    if (
      activeTool !== "analysis" ||
      analysisImage ||
      generatedImageRequest?.status !== "ready" ||
      !generatedImageRequest.src ||
      !generatedImageRequest.sourceType
    ) {
      return;
    }

    setAnalysisImage({
      src: generatedImageRequest.src,
      name: "当前生成结果",
      origin: "generation",
      sourceType: generatedImageRequest.sourceType,
      importedAt: Date.now(),
    });
    setAnalysisStatus("image_ready");
    setAnalysisResult(null);
    setAnalysisError(null);
  }, [activeTool, analysisImage, generatedImageRequest]);

  const restoreAnalysisConversation = useCallback((image: AnalysisImageSource) => {
    const matched = analysisConversationsRef.current.find((item) => item.imageSrc === image.src);

    if (!matched) {
      setAnalysisStatus("image_ready");
      setAnalysisResult(null);
      setAnalysisFollowups([]);
      setPendingAnalysisMessage(null);
      setAnalysisError(null);
      return;
    }

    setAnalysisStatus(matched.result ? "analyzed" : "image_ready");
    setAnalysisResult(matched.result);
    setAnalysisFollowups(matched.followups);
    setPendingAnalysisMessage(null);
    setAnalysisError(null);
  }, []);

  const applyAnalysisImage = (image: AnalysisImageSource) => {
    setAnalysisImage(image);
    restoreAnalysisConversation(image);
  };

  const handleSelectAnalysisFile = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      applyAnalysisImage({
        src: dataUrl,
        name: file.name,
        origin: "local",
        sourceType: "data-url",
        importedAt: Date.now(),
      });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "图片读取失败");
    }
  };

  const handleImportCurrentGenerated = () => {
    if (!currentImportableAnalysisImage) {
      setAnalysisError("当前还没有可导入的生成结果");
      return;
    }

    applyAnalysisImage(currentImportableAnalysisImage);
  };

  const handleStartAnalysis = async () => {
    if (!analysisImage) {
      return;
    }

    setAnalysisStatus("analyzing");
    setAnalysisLoadingStepIndex(0);
    setAnalysisError(null);

    try {
      const result = await runArtworkAnalysis(analysisImage);
      setAnalysisResult(result);
      setAnalysisStatus("analyzed");
    } catch (error) {
      setAnalysisStatus("image_ready");
      setAnalysisError(error instanceof Error ? error.message : "分析失败，请稍后重试");
    }
  };

  const handleFollowup = async (question: string) => {
    const nextQuestion = question.trim();
    if (!nextQuestion) {
      return;
    }

    setIsFollowupLoading(true);
    setAnalysisError(null);
    const pendingMessage = {
      id: `pending-followup-${Date.now()}`,
      question: nextQuestion,
    };
    setPendingAnalysisMessage(pendingMessage);

    try {
      const nextFollowup = await runAnalysisFollowup({
        question: nextQuestion,
        image: analysisImage,
        result: analysisResult,
        followups: analysisFollowups,
      });
      setAnalysisFollowups((prev) => [...prev, nextFollowup].slice(-6));
      setPendingAnalysisMessage(null);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "追问失败，请稍后重试");
    } finally {
      setIsFollowupLoading(false);
    }
  };

  const queuePersistCurrentState = useCallback(() => {
    dirtyRef.current = true;
    setSaveState((prev) => (prev === "saving" ? prev : "idle"));
    clearDebounce();
    debounceTimerRef.current = window.setTimeout(() => {
      void flushSave();
    }, 120);
  }, [clearDebounce, flushSave]);

  useEffect(() => {
    if (!analysisImage || (!analysisResult && analysisFollowups.length === 0)) {
      return;
    }

    let didChange = false;

    setAnalysisConversations((prev) => {
      const existing = prev.find((item) => item.imageSrc === analysisImage.src);
      const nextRecord: SavedAnalysisConversation = {
        id: existing?.id ?? `analysis-conversation-${Date.now()}`,
        imageSrc: analysisImage.src,
        imageName: analysisImage.name,
        origin: analysisImage.origin,
        sourceType: analysisImage.sourceType,
        updatedAt: Date.now(),
        result: analysisResult,
        followups: analysisFollowups,
      };

      if (
        existing &&
        existing.imageName === nextRecord.imageName &&
        existing.origin === nextRecord.origin &&
        existing.sourceType === nextRecord.sourceType &&
        sameJsonValue(existing.result, nextRecord.result) &&
        sameJsonValue(existing.followups, nextRecord.followups)
      ) {
        return prev;
      }

      didChange = true;
      const withoutCurrent = prev.filter((item) => item.imageSrc !== analysisImage.src);
      const next = [nextRecord, ...withoutCurrent].slice(0, 24);
      analysisConversationsRef.current = next;
      return next;
    });

    if (didChange) {
      queuePersistCurrentState();
    }
  }, [analysisFollowups, analysisImage, analysisResult, queuePersistCurrentState]);

  const handleSelectTool = (tool: ToolKey) => {
    setActiveTool(tool);
    setIsLeftPanelOpen(true);
    if (tool === "analysis") {
      setAnalysisCanvasSeed(cloneCanvasDocState(latestDocRef.current));
      return;
    }

    setInitialDoc(cloneCanvasDocState(latestDocRef.current));
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistoryItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (!projectId) {
        void saveEditorDraft(
          undefined,
          withCanvasDocMeta(latestDocRef.current, next, analysisConversationsRef.current),
          next,
        );
      }
      return next;
    });
    queuePersistCurrentState();
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const sourceType = item.imageSrc.startsWith("data:image/") ? "data-url" : "url";
    const requestId = `history-${item.id}-${Date.now()}`;

    setGeneratedImageRequest({
      requestId,
      status: "ready",
      src: item.imageSrc,
      prompt: item.prompt || "历史记录图片",
      sourceType,
    });
  };

  const currentCanvasAnalysisCandidate = useMemo(
    () => getLatestCanvasImage(activeTool === "analysis" ? analysisCanvasSeed : latestDocRef.current),
    [activeTool, analysisCanvasSeed],
  );

  const currentImportableAnalysisImage = useMemo(() => {
    if (
      generatedImageRequest?.status === "ready" &&
      generatedImageRequest.src &&
      generatedImageRequest.sourceType
    ) {
      return {
        src: generatedImageRequest.src,
        name: "当前生成结果",
        origin: "generation" as const,
        sourceType: generatedImageRequest.sourceType,
        importedAt: Date.now(),
      };
    }

    if (currentCanvasAnalysisCandidate) {
      return toAnalysisImageFromCanvasObject(currentCanvasAnalysisCandidate);
    }

    if (historyItems.length > 0) {
      return toAnalysisImageFromHistory(historyItems[0]);
    }

    return null;
  }, [currentCanvasAnalysisCandidate, generatedImageRequest, historyItems]);

  const handleSelectAnalysisHistoryItem = (item: HistoryItem) => {
    applyAnalysisImage(toAnalysisImageFromHistory(item));
  };

  const handleSelectAnalysisConversation = (conversation: SavedAnalysisConversation) => {
    setAnalysisImage(toSavedConversationImage(conversation));
    setAnalysisStatus(conversation.result ? "analyzed" : "image_ready");
    setAnalysisResult(conversation.result);
    setAnalysisFollowups(conversation.followups);
    setPendingAnalysisMessage(null);
    setAnalysisError(null);
  };

  const handleDeleteAnalysisConversation = (id: string) => {
    setAnalysisConversations((prev) => {
      const target = prev.find((item) => item.id === id) ?? null;
      const next = prev.filter((item) => item.id !== id);
      analysisConversationsRef.current = next;

      if (target && analysisImage?.src === target.imageSrc) {
        setAnalysisResult(null);
        setAnalysisFollowups([]);
        setPendingAnalysisMessage(null);
        setAnalysisStatus("image_ready");
      }

      return next;
    });
    queuePersistCurrentState();
  };

  const saveStatusText = useMemo(() => formatSaveStatus(saveState, lastSavedAt), [saveState, lastSavedAt]);
  const canImportGenerated = Boolean(currentImportableAnalysisImage);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Topbar projectName={projectName} saveStatusText={saveStatusText} />

      <main className="relative z-0 flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[hsl(var(--muted)/0.45)]">
        {activeTool === "analysis" ? (
          <section className="h-full w-full p-3">
            <AnalysisWorkspace
              activeTool={activeTool}
              onSelectTool={handleSelectTool}
              image={analysisImage}
              status={analysisStatus}
              result={analysisResult}
              followups={analysisFollowups}
              pendingMessage={pendingAnalysisMessage}
              analysisConversations={analysisConversations}
              canvasDoc={analysisCanvasSeed}
              historyItems={historyItems}
              loadingStep={ANALYSIS_LOADING_STEPS[analysisLoadingStepIndex]}
              error={analysisError}
              canImportGenerated={Boolean(canImportGenerated)}
              isFollowupLoading={isFollowupLoading}
              onSelectFile={handleSelectAnalysisFile}
              onCanvasDocChange={queueSave}
              onImportGenerated={handleImportCurrentGenerated}
              onSelectHistoryItem={handleSelectAnalysisHistoryItem}
              onSelectConversation={handleSelectAnalysisConversation}
              onDeleteConversation={handleDeleteAnalysisConversation}
              onStartAnalysis={() => void handleStartAnalysis()}
              onFollowup={handleFollowup}
            />
          </section>
        ) : (
          <section className="flex h-full w-full min-w-0 gap-3 p-3">
            <div className="flex h-full shrink-0 gap-3">
              <LeftPanel
                activeTool={activeTool}
                isOpen={isLeftPanelOpen}
                onCollapse={() => setIsLeftPanelOpen(false)}
                onGeneratedImage={({ requestId, status, src, prompt, sourceType }) => {
                  console.info("[WorkspaceLayout] received generated image", {
                    requestId,
                    status,
                    sourceType,
                    srcPreview: src?.slice(0, 120),
                    promptLength: prompt.length,
                  });
                  setGeneratedImageRequest({
                    requestId,
                    status,
                    src,
                    prompt,
                    sourceType,
                  });
                  if (status === "ready" && src) {
                    setHistoryItems((prev) => {
                      const nextItem: HistoryItem = {
                        id: requestId,
                        imageSrc: src,
                        prompt,
                        createdAt: new Intl.DateTimeFormat("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date()),
                      };
                      const next = [nextItem, ...prev.filter((item) => item.id !== requestId)];
                      return next;
                    });
                    setIsHistoryOpen(true);
                  }
                }}
              />
              <ToolRail activeTool={activeTool} onSelectTool={handleSelectTool} />
            </div>

            <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[28px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] shadow-[0_18px_44px_rgba(52,76,104,0.08)]">
              <CanvasStage
                initialDoc={initialDoc}
                generatedImageRequest={generatedImageRequest}
                onDocChange={queueSave}
                onSnapshotProvider={(getter) => {
                  snapshotGetterRef.current = getter;
                }}
              />
            </div>

            <HistoryDrawer
              isOpen={isHistoryOpen}
              historyItems={historyItems}
              onToggle={() => setIsHistoryOpen((prev) => !prev)}
              onDeleteItem={handleDeleteHistoryItem}
              onSelectItem={handleSelectHistoryItem}
            />
          </section>
        )}
      </main>
    </div>
  );
}
