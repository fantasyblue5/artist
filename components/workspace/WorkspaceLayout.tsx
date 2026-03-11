"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type WorkspaceLayoutProps = {
  projectName?: string;
  projectId?: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

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

export function WorkspaceLayout({ projectName, projectId }: WorkspaceLayoutProps) {
  const [activeTool, setActiveTool] = useState<ToolKey>("analysis");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyItems] = useState<HistoryItem[]>([]);

  const [initialDoc, setInitialDoc] = useState<CanvasDocState>(createEmptyCanvasDoc());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const versionRef = useRef(0);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(true);
  const savingRef = useRef(false);
  const latestDocRef = useRef<CanvasDocState>(createEmptyCanvasDoc());
  const skipNextDocSyncRef = useRef(true);
  const debounceTimerRef = useRef<number | null>(null);
  const snapshotGetterRef = useRef<(() => string | null) | null>(null);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (!projectId || !dirtyRef.current || savingRef.current) {
      return;
    }

    const snapshotDoc = latestDocRef.current;
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
        setSaveState("error");
        return;
      }

      versionRef.current = result.data.canvas.version;
      if (latestDocRef.current === snapshotDoc) {
        dirtyRef.current = false;
      }
      setSaveState("saved");
      setLastSavedAt(Date.now());
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

      if (loadingRef.current || !projectId) {
        return;
      }

      dirtyRef.current = true;
      setSaveState((prev) => (prev === "saving" ? prev : "idle"));
      clearDebounce();
      debounceTimerRef.current = window.setTimeout(() => {
        void flushSave();
      }, 800);
    },
    [clearDebounce, flushSave, projectId],
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
        const empty = createEmptyCanvasDoc();
        skipNextDocSyncRef.current = true;
        latestDocRef.current = empty;
        versionRef.current = 0;
        setInitialDoc(empty);
        setSaveState("idle");
        loadingRef.current = false;
        return;
      }

      const result = await getProjectCanvas(projectId);
      if (!active) {
        return;
      }

      if (result.ok) {
        skipNextDocSyncRef.current = true;
        latestDocRef.current = result.data.canvas.doc;
        versionRef.current = result.data.canvas.version;
        setInitialDoc(result.data.canvas.doc);
        setSaveState("saved");
        setLastSavedAt(result.data.canvas.updatedAt || Date.now());
      } else {
        const empty = createEmptyCanvasDoc();
        skipNextDocSyncRef.current = true;
        latestDocRef.current = empty;
        versionRef.current = 0;
        setInitialDoc(empty);
        setSaveState("error");
      }

      loadingRef.current = false;
    };

    void load();

    return () => {
      active = false;
    };
  }, [clearDebounce, projectId]);

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

  const handleSelectTool = (tool: ToolKey) => {
    setActiveTool(tool);
    setIsLeftPanelOpen(true);
  };

  const saveStatusText = useMemo(() => formatSaveStatus(saveState, lastSavedAt), [saveState, lastSavedAt]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Topbar projectName={projectName} saveStatusText={saveStatusText} />

      <main className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[hsl(var(--muted)/0.45)]">
        <section className="flex h-full w-full min-w-0 gap-3 p-3">
          <div className="flex h-full shrink-0 gap-3">
            <LeftPanel
              activeTool={activeTool}
              isOpen={isLeftPanelOpen}
              onCollapse={() => setIsLeftPanelOpen(false)}
            />
            <ToolRail activeTool={activeTool} onSelectTool={handleSelectTool} />
          </div>

          <div className="relative h-full min-w-0 flex-1 overflow-hidden">
            <CanvasStage
              initialDoc={initialDoc}
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
          />
        </section>
      </main>
    </div>
  );
}
