"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { FiltersBar, type SortBy, type TimeRange } from "@/components/workspace/FiltersBar";
import { NewProjectModal } from "@/components/workspace/NewProjectModal";
import { ProjectCard } from "@/components/workspace/ProjectCard";
import { TemplateModal } from "@/components/workspace/TemplateModal";
import { Topbar } from "@/components/workspace/Topbar";
import { addActivity } from "@/lib/storage/activity";
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
} from "@/lib/storage/projects";
import { FolderPlus, Import, LayoutGrid, PlusCircle, Sparkles } from "lucide-react";

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

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

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

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

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

  const hasProjects = projects.length > 0;

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

        <main className="h-[calc(100vh-64px)] overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          <div className="mx-auto max-w-[1360px] space-y-6">
            <section className="space-y-3">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-[hsl(var(--foreground))]">快速开始</h1>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  直接进入新建、模板或导入流程。
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Button
                  className="h-12 rounded-2xl px-6 shadow-[0_10px_24px_rgba(73,111,156,0.22)]"
                  onClick={() => setNewModalOpen(true)}
                >
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  新建项目
                </Button>

                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 justify-center rounded-2xl bg-[hsl(var(--card)/0.82)]"
                    onClick={() => setTemplateModalOpen(true)}
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    从模板创建
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 justify-center rounded-2xl bg-[hsl(var(--card)/0.82)]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Import className="mr-1.5 h-4 w-4" />
                    导入图片/文件
                  </Button>
                </div>

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
            </section>

            <section className="space-y-4 border-t border-[hsl(var(--border)/0.75)] pt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">我的项目</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    按最近编辑排序，支持搜索、筛选与快速管理。
                  </p>
                </div>

                {hasProjects ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.76)] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {filteredProjects.length} 个结果
                  </div>
                ) : null}
              </div>

              {hasProjects ? (
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
              ) : null}

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
                <Card className="rounded-[24px] border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.74)] shadow-none">
                  <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                    <FolderPlus className="h-7 w-7 text-[hsl(var(--muted-foreground))]" />
                    <p className="max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {hasProjects
                        ? "当前筛选条件下没有匹配项目。可以清空筛选，或直接新建一个项目继续工作。"
                        : "还没有项目。从空白项目、模板或图片导入开始，首页只保留关键工作流入口。"}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button onClick={() => setNewModalOpen(true)}>
                        <PlusCircle className="mr-1.5 h-4 w-4" />
                        新建项目
                      </Button>
                      {hasProjects ? (
                        <Button variant="outline" onClick={clearFilters}>
                          清空筛选
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => setTemplateModalOpen(true)}>
                            <Sparkles className="mr-1.5 h-4 w-4" />
                            选择模板
                          </Button>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Import className="mr-1.5 h-4 w-4" />
                            导入图片
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </main>

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
