"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { getProjectById, touchOpened } from "@/lib/storage/projects";

export default function EditorPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [projectName, setProjectName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!projectId) {
      document.title = "创作项目 - 艺术家 Workspace";
      setProjectName(undefined);
      return;
    }

    let active = true;

    const load = async () => {
      await touchOpened(projectId);
      const result = await getProjectById(projectId);
      if (!active) {
        return;
      }

      if (result.ok) {
        setProjectName(result.data.project.name);
        document.title = `${result.data.project.name} - 创作项目`;
      } else {
        setProjectName(undefined);
        document.title = "创作项目 - 艺术家 Workspace";
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <AuthGuard>
      <WorkspaceLayout key={projectId ?? "editor"} projectName={projectName} projectId={projectId ?? undefined} />
    </AuthGuard>
  );
}
