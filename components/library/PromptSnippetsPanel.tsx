"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getPromptSnippets, savePromptSnippets } from "@/lib/library/storage";
import type { PromptSnippet } from "@/lib/library/types";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PromptSnippetsPanel() {
  const [snippets, setSnippets] = useState<PromptSnippet[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    setSnippets(getPromptSnippets());
  }, []);

  useEffect(() => {
    savePromptSnippets(snippets);
  }, [snippets]);

  const sortedSnippets = useMemo(
    () => [...snippets].sort((a, b) => b.updatedAt - a.updatedAt),
    [snippets],
  );

  const addSnippet = () => {
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      return;
    }

    const now = Date.now();
    setSnippets((prev) => [
      {
        id: makeId(),
        title: nextTitle,
        content: nextContent,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
    setTitle("");
    setContent("");
  };

  const copySnippet = async (snippet: PromptSnippet) => {
    try {
      await navigator.clipboard.writeText(`${snippet.title}\n${snippet.content}`);
      setToastText("已复制片段");
    } catch {
      setToastText("复制失败");
    }

    window.setTimeout(() => setToastText(null), 1200);
  };

  return (
    <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.84)]">
      <CardContent className="flex h-full min-h-0 flex-col gap-4 p-5">
        <div className="space-y-2 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.72)] p-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="片段标题"
            className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm outline-none"
          />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[100px]"
            placeholder="Prompt 内容"
          />
          <div className="flex justify-end">
            <Button onClick={addSnippet}>
              <Plus className="mr-1.5 h-4 w-4" />
              添加片段
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          {sortedSnippets.length === 0 ? (
            <div className="rounded-2xl border border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.7)] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              还没有 Prompt 片段，先从知识图谱复制一个。
            </div>
          ) : (
            sortedSnippets.map((snippet) => (
              <article
                key={snippet.id}
                className="space-y-2 rounded-2xl border border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.74)] p-3"
              >
                <input
                  value={snippet.title}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setSnippets((prev) =>
                      prev.map((item) =>
                        item.id === snippet.id
                          ? { ...item, title: nextTitle, updatedAt: Date.now() }
                          : item,
                      ),
                    );
                  }}
                  className="h-9 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 text-sm outline-none"
                />
                <Textarea
                  value={snippet.content}
                  onChange={(event) => {
                    const nextContent = event.target.value;
                    setSnippets((prev) =>
                      prev.map((item) =>
                        item.id === snippet.id
                          ? { ...item, content: nextContent, updatedAt: Date.now() }
                          : item,
                      ),
                    );
                  }}
                  className="min-h-[92px]"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => void copySnippet(snippet)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    复制
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[hsl(var(--muted-foreground))]"
                    onClick={() => setSnippets((prev) => prev.filter((item) => item.id !== snippet.id))}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    删除
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        {toastText ? (
          <div className="rounded-xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.75)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
            {toastText}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
