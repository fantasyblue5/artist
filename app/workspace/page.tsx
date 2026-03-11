"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ActivityDrawer } from "@/components/workspace/ActivityDrawer";
import { FiltersBar, type SortBy, type TimeRange } from "@/components/workspace/FiltersBar";
import { NewProjectModal } from "@/components/workspace/NewProjectModal";
import { ProjectCard } from "@/components/workspace/ProjectCard";
import { TemplateModal } from "@/components/workspace/TemplateModal";
import { Topbar } from "@/components/workspace/Topbar";
import { addActivity, listActivity, type ActivityItem } from "@/lib/storage/activity";
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  toCompressedCoverThumb,
  touchOpened,
  updateProject,
  type CreateProjectInput,
  type Project,
  type ProjectPreset,
} from "@/lib/storage/projects";
import { ArrowRight, FolderPlus, Import, LayoutGrid, PlusCircle, Sparkles } from "lucide-react";

const quickPresets: Array<{ key: ProjectPreset; label: string; tag: string }> = [
  { key: "1:1", label: "社交封面", tag: "封面" },
  { key: "4:3", label: "演示视觉", tag: "演示" },
  { key: "16:9", label: "横版叙事", tag: "横版" },
  { key: "A4", label: "文档排版", tag: "文档" },
];

const mockGenerates: ActivityItem[] = [
  { id: "g1", kind: "generate", title: "山水配色方案草稿", createdAt: Date.now() - 1000 * 60 * 80 },
  { id: "g2", kind: "generate", title: "构图分析建议", createdAt: Date.now() - 1000 * 60 * 220 },
  { id: "g3", kind: "generate", title: "风格迁移预览", createdAt: Date.now() - 1000 * 60 * 380 },
];

function formatBaseName(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("invalid file result"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

export default function WorkspacePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);

  const [projects, setProjects] = useState<Project[]>([]);
  const [imports, setImports] = useState<ActivityItem[]>([]);
  const [generates, setGenerates] = useState<ActivityItem[]>([]);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated");

  const [isDragActive, setIsDragActive] = useState(false);

  const refreshProjects = useCallback(async () => {
    const result = await listProjects();
    if (!result.ok) {
      return;
    }
    setProjects(result.data.projects);
  }, []);

  const refreshActivity = useCallback(() => {
    const importItems = listActivity("import").slice(0, 10);
    const generateItems = listActivity("generate").slice(0, 10);
    setImports(importItems);
    setGenerates(generateItems.length > 0 ? generateItems : mockGenerates);
  }, []);

  useEffect(() => {
    void refreshProjects();
    refreshActivity();
  }, [refreshActivity, refreshProjects]);

  useEffect(() => {
    const onRefresh = () => {
      void refreshProjects();
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("pageshow", onRefresh);
    window.addEventListener("projects:updated", onRefresh);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("pageshow", onRefresh);
      window.removeEventListener("projects:updated", onRefresh);
    };
  }, [refreshProjects]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput.trim().toLowerCase()), 200);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const allTags = useMemo(
    () =>
      Array.from(new Set(projects.flatMap((project) => project.tags))).sort((a, b) =>
        a.localeCompare(b, "zh-CN"),
      ),
    [projects],
  );

  const recents = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
        .filter((project) => Boolean(project.lastOpenedAt))
        .slice(0, 10),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const now = Date.now();

    const withSearch = query
      ? projects.filter((project) => {
          const inName = project.name.toLowerCase().includes(query);
          const inTags = project.tags.some((tag) => tag.toLowerCase().includes(query));
          return inName || inTags;
        })
      : projects;

    const withTags =
      selectedTags.length > 0
        ? withSearch.filter((project) => selectedTags.some((tag) => project.tags.includes(tag)))
        : withSearch;

    const withRange = withTags.filter((project) => {
      if (timeRange === "all") {
        return true;
      }
      const day = timeRange === "7d" ? 7 : 30;
      return project.updatedAt >= now - day * 24 * 60 * 60 * 1000;
    });

    const next = [...withRange];

    if (sortBy === "name") {
      next.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else if (sortBy === "created") {
      next.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      next.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return next;
  }, [projects, query, selectedTags, sortBy, timeRange]);

  const openProject = useCallback(
    async (projectId: string) => {
      await touchOpened(projectId);
      await refreshProjects();
      router.push(`/editor?projectId=${projectId}`);
    },
    [refreshProjects, router],
  );

  const createAndOpen = useCallback(
    async (input: CreateProjectInput) => {
      const created = await createProject(input);
      if (!created.ok) {
        window.alert(created.error.message || "创建失败，请稍后重试");
        return;
      }
      await touchOpened(created.data.project.id);
      await refreshProjects();
      router.push(`/editor?projectId=${created.data.project.id}`);
    },
    [refreshProjects, router],
  );

  const handleRename = async (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project) {
      return;
    }

    const nextName = window.prompt("输入新的项目名", project.name);
    if (!nextName || !nextName.trim()) {
      return;
    }

    const result = await updateProject(id, { name: nextName.trim() });
    if (!result.ok) {
      window.alert(result.error.message || "重命名失败");
      return;
    }
    await refreshProjects();
  };

  const handleDuplicate = async (id: string) => {
    const result = await duplicateProject(id);
    if (!result.ok) {
      window.alert(result.error.message || "复制失败");
      return;
    }
    await refreshProjects();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确认删除该项目吗？")) {
      return;
    }

    const result = await deleteProject(id);
    if (!result.ok) {
      window.alert(result.error.message || "删除失败");
      return;
    }
    await refreshProjects();
  };

  const clearFilters = () => {
    setQueryInput("");
    setQuery("");
    setSelectedTags([]);
    setTimeRange("all");
    setSortBy("updated");
  };

  const handleImportFile = async (file: File) => {
    if (!(file.type === "image/png" || file.type === "image/jpeg")) {
      window.alert("仅支持 PNG/JPG 文件");
      return;
    }

    const cover = await readAsDataUrl(file);
    const coverThumb = await toCompressedCoverThumb(cover, { maxWidth: 512, quality: 0.7 });
    const created = await createProject({
      name: formatBaseName(file.name) || "导入项目",
      coverThumb,
      tags: ["导入"],
    });
    if (!created.ok) {
      window.alert(created.error.message || "导入失败，请稍后重试");
      return;
    }

    await touchOpened(created.data.project.id);
    addActivity("import", `导入 ${file.name}`);
    await refreshProjects();
    refreshActivity();
    router.push(`/editor?projectId=${created.data.project.id}`);
  };

  return (
    <AuthGuard>
      <div
        className="h-screen w-screen overflow-hidden bg-[hsl(var(--background))]"
        onDragEnter={(event) => {
          event.preventDefault();
          dragCounterRef.current += 1;
          setIsDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
          if (dragCounterRef.current === 0) {
            setIsDragActive(false);
          }
        }}
        onDrop={async (event) => {
          event.preventDefault();
          dragCounterRef.current = 0;
          setIsDragActive(false);

          const file = event.dataTransfer.files[0];
          if (!file) {
            return;
          }

          await handleImportFile(file);
        }}
      >
        <Topbar />

        <main className="h-[calc(100vh-64px)] overflow-y-auto px-4 py-4 md:px-6">
          <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <Card className="rounded-3xl border-[hsl(var(--border))] bg-[hsl(var(--card)/0.98)]">
                <CardHeader>
                  <CardTitle className="text-base">快速开始</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setNewModalOpen(true)}>
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      新建项目
                    </Button>
                    <Button variant="outline" onClick={() => setTemplateModalOpen(true)}>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      从模板创建
                    </Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Import className="mr-1.5 h-4 w-4" />
                      导入图片/文件
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        await handleImportFile(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() =>
                          void createAndOpen({
                            name: `${preset.label} 项目`,
                            tags: [preset.tag],
                          })
                        }
                        className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.45)] p-3 text-left transition hover:border-[hsl(var(--primary)/0.45)] hover:bg-[hsl(var(--accent))]"
                        title={preset.tag}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{preset.label}</div>
                          <span className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.7)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                            {preset.tag}
                          </span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          一键创建 <ArrowRight className="h-3 w-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-[hsl(var(--border))]">
                <CardHeader>
                  <CardTitle className="text-base">最近打开</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  {recents.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {recents.map((project) => (
                        <div key={project.id} className="min-w-[240px] max-w-[260px] flex-1">
                          <ProjectCard
                            compact
                            project={project}
                          onOpen={(id) => void openProject(id)}
                          onRename={(id) => void handleRename(id)}
                          onDuplicate={(id) => void handleDuplicate(id)}
                          onDelete={(id) => void handleDelete(id)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.4)] p-6 text-sm text-[hsl(var(--muted-foreground))]">
                      还没有最近项目，点击新建开始创作。
                    </div>
                  )}
                </CardContent>
              </Card>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">我的项目</h2>
                  <div className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {filteredProjects.length} 个结果
                  </div>
                </div>

                <FiltersBar
                  queryInput={queryInput}
                  onQueryInputChange={setQueryInput}
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onToggleTag={(tag) =>
                    setSelectedTags((prev) =>
                      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
                    )
                  }
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  onClearFilters={clearFilters}
                />

                {filteredProjects.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onOpen={(id) => void openProject(id)}
                        onRename={(id) => void handleRename(id)}
                        onDuplicate={(id) => void handleDuplicate(id)}
                        onDelete={(id) => void handleDelete(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                      <FolderPlus className="h-7 w-7 text-[hsl(var(--muted-foreground))]" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        没有匹配项目，尝试清空筛选或新建项目。
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => setNewModalOpen(true)}>新建项目</Button>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          导入图片
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>
            </div>

            <div className="hidden xl:block" />
          </div>
        </main>

        <ActivityDrawer
          open={activityOpen}
          onOpenChange={setActivityOpen}
          recentProjects={recents}
          recentImports={imports}
          recentGenerates={generates}
          onOpenProject={(id) => void openProject(id)}
        />

        <NewProjectModal open={newModalOpen} onOpenChange={setNewModalOpen} onCreate={createAndOpen} />
        <TemplateModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          onCreateFromTemplate={createAndOpen}
        />

        {isDragActive ? (
          <div className="pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-[rgba(33,49,70,0.22)]">
            <div className="rounded-3xl border-2 border-dashed border-[hsl(var(--primary)/0.55)] bg-[hsl(var(--card)/0.96)] px-8 py-10 text-center shadow-[0_18px_36px_rgba(35,55,82,0.2)]">
              <p className="text-sm font-semibold">释放鼠标导入图片创建项目</p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">支持 PNG / JPG</p>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
