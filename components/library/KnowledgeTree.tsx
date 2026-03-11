"use client";

import { useMemo, type KeyboardEvent } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeNode } from "@/lib/library/types";

type KnowledgeTreeProps = {
  tree: KnowledgeNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  matchedNodeIds: Set<string>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
  onlyLeaf: boolean;
  onlyWithDescription: boolean;
  onOnlyLeafChange: (next: boolean) => void;
  onOnlyWithDescriptionChange: (next: boolean) => void;
  resultCount: number;
  loading?: boolean;
  error?: string | null;
};

function hasDescription(node: KnowledgeNode) {
  return Boolean(node.description?.trim());
}

export function KnowledgeTree({
  tree,
  selectedNodeId,
  expandedNodeIds,
  matchedNodeIds,
  searchQuery,
  onSearchChange,
  onSelectNode,
  onToggleNode,
  onlyLeaf,
  onlyWithDescription,
  onOnlyLeafChange,
  onOnlyWithDescriptionChange,
  resultCount,
  loading,
  error,
}: KnowledgeTreeProps) {
  const hasData = useMemo(() => tree.length > 0, [tree.length]);

  const onNodeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, node: KnowledgeNode) => {
    const hasChildren = node.children.length > 0;
    const expanded = expandedNodeIds.has(node.id);

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectNode(node.id);
      return;
    }

    if (event.key === "ArrowRight" && hasChildren && !expanded) {
      event.preventDefault();
      onToggleNode(node.id);
      return;
    }

    if (event.key === "ArrowLeft" && hasChildren && expanded) {
      event.preventDefault();
      onToggleNode(node.id);
    }
  };

  const renderNode = (node: KnowledgeNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const expanded = hasChildren && expandedNodeIds.has(node.id);
    const selected = node.id === selectedNodeId;
    const matched = matchedNodeIds.has(node.id);

    return (
      <li key={node.id} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-1 rounded-xl border border-transparent pr-2 transition",
            selected && "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)]",
            !selected && "hover:bg-[hsl(var(--accent)/0.85)]",
          )}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleNode(node.id)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
              aria-label={expanded ? "收起" : "展开"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="inline-flex h-7 w-7" aria-hidden="true" />
          )}

          <button
            type="button"
            role="treeitem"
            aria-expanded={hasChildren ? expanded : undefined}
            onClick={() => onSelectNode(node.id)}
            onKeyDown={(event) => onNodeKeyDown(event, node)}
            className={cn(
              "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm outline-none",
              "focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.35)]",
            )}
          >
            <span className="truncate text-[hsl(var(--foreground))]">{node.name}</span>
            {hasChildren ? (
              <span className="rounded-md bg-[hsl(var(--accent))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                {node.children.length}
              </span>
            ) : null}
            {hasDescription(node) ? (
              <span className="rounded-md bg-[hsl(var(--accent))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                备注
              </span>
            ) : null}
            {matched ? <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" /> : null}
          </button>
        </div>

        {hasChildren && expanded ? (
          <ul role="group" className="space-y-1 py-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.72)] shadow-[0_16px_34px_rgba(46,72,102,0.1)] backdrop-blur">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 18%, rgba(112,148,190,0.15), transparent 34%), radial-gradient(circle at 82% 78%, rgba(164,190,221,0.14), transparent 36%), linear-gradient(to right, rgba(122,148,178,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(122,148,178,0.08) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 22px 22px, 22px 22px",
        }}
      />

      <div className="relative z-10 space-y-3 border-b border-[hsl(var(--border)/0.75)] px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">知识图谱</h2>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{resultCount} 命中</span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索节点名称"
            className="h-10 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.9)] pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.82)] px-2 py-1">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
              checked={onlyLeaf}
              onChange={(event) => onOnlyLeafChange(event.target.checked)}
            />
            <span>仅叶子</span>
          </label>
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.82)] px-2 py-1">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
              checked={onlyWithDescription}
              onChange={(event) => onOnlyWithDescriptionChange(event.target.checked)}
            />
            <span>仅有描述</span>
          </label>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-auto px-2 py-3">
        {loading ? <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">正在加载知识图谱...</p> : null}
        {error ? <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">{error}</p> : null}
        {!loading && !error && !hasData ? (
          <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">没有可展示的节点。</p>
        ) : null}
        {!loading && !error && hasData ? (
          <ul role="tree" className="space-y-1">
            {tree.map((node) => renderNode(node, 0))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
