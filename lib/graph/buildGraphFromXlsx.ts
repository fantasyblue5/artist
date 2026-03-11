import "server-only";

import { existsSync } from "node:fs";
import path from "path";
import * as xlsx from "xlsx";
import type { GraphData, GraphEdge, GraphLoadResult, GraphNode } from "@/lib/graph/types";

type MutableNode = {
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
  childIds: Set<string>;
  path: string[];
  remarks: Set<string>;
};

const LEVEL_HEADERS = ["一级目录", "二级目录", "三级目录", "四级目录", "五级目录"] as const;
const REMARK_HEADERS = ["备注", "描述", "说明"] as const;
const PRIMARY_RELATIVE_PATH = "data/knowledge/artist_prof.xlsx";
const FALLBACK_RELATIVE_PATH = "data/artist_prof.xlsx";
const NOT_FOUND_ERROR = "Knowledge graph file not found in /data/knowledge/artist_prof.xlsx";

function normalizeKey(input: string): string {
  return input.replace(/[\s\u3000]/g, "").trim();
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function candidatePaths() {
  const candidates = [
    path.join(process.cwd(), PRIMARY_RELATIVE_PATH),
    path.join(process.cwd(), FALLBACK_RELATIVE_PATH),
  ];

  return candidates
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));
}

function resolveXlsxPath(): { path: string | null; checkedPaths: string[] } {
  const checked = candidatePaths();
  for (const current of checked) {
    if (existsSync(current)) {
      return { path: current, checkedPaths: checked };
    }
  }
  return { path: null, checkedPaths: checked };
}

function getRowValue(row: Record<string, unknown>, headers: readonly string[]) {
  const entries = Object.entries(row);
  const normalized = new Map(entries.map(([key, value]) => [normalizeKey(key), value]));

  for (const header of headers) {
    const byName = normalized.get(normalizeKey(header));
    if (byName !== undefined) {
      return normalizeText(byName);
    }
  }

  return "";
}

export function createNodeId(pathItems: string[]) {
  return `node:${pathItems.join(">")}`;
}

function buildGraphFromRows(rows: Record<string, unknown>[], sourcePath: string): GraphData {
  const nodes = new Map<string, MutableNode>();
  const edges = new Map<string, GraphEdge>();

  let rowCount = 0;

  for (const row of rows) {
    const levels = LEVEL_HEADERS.map((header) => getRowValue(row, [header])).filter(Boolean);
    if (levels.length === 0) {
      continue;
    }

    rowCount += 1;

    let parentId: string | null = null;

    levels.forEach((title, index) => {
      const pathItems = levels.slice(0, index + 1);
      const nodeId = createNodeId(pathItems);

      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          title,
          depth: index + 1,
          parentId,
          childIds: new Set<string>(),
          path: [...pathItems],
          remarks: new Set<string>(),
        });
      }

      const current = nodes.get(nodeId)!;
      if (current.parentId === null && parentId) {
        current.parentId = parentId;
      }

      if (parentId) {
        const parent = nodes.get(parentId);
        if (parent) {
          parent.childIds.add(nodeId);
        }

        const edgeId = `edge:${parentId}->${nodeId}`;
        if (!edges.has(edgeId)) {
          edges.set(edgeId, {
            id: edgeId,
            source: parentId,
            target: nodeId,
          });
        }
      }

      parentId = nodeId;
    });

    const remark = getRowValue(row, REMARK_HEADERS);
    if (remark && parentId) {
      const leaf = nodes.get(parentId);
      leaf?.remarks.add(remark);
    }
  }

  const graphNodes: GraphNode[] = Array.from(nodes.values())
    .map((item) => {
      const childIds = Array.from(item.childIds).sort((a, b) => {
        const nodeA = nodes.get(a)?.title ?? "";
        const nodeB = nodes.get(b)?.title ?? "";
        return nodeA.localeCompare(nodeB, "zh-Hans");
      });

      const remarks = Array.from(item.remarks);

      return {
        id: item.id,
        title: item.title,
        depth: item.depth,
        parentId: item.parentId,
        childIds,
        path: [...item.path],
        remarks,
        hasRemark: remarks.length > 0,
        isLeaf: childIds.length === 0,
      };
    })
    .sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      return a.path.join(">").localeCompare(b.path.join(">"), "zh-Hans");
    });

  const graphEdges = Array.from(edges.values()).sort((a, b) => a.id.localeCompare(b.id, "zh-Hans"));

  const rootIds = graphNodes.filter((item) => item.parentId === null).map((item) => item.id);
  const levelOneNodeIds = graphNodes.filter((item) => item.depth === 1).map((item) => item.id);

  return {
    nodes: graphNodes,
    edges: graphEdges,
    rootIds,
    levelOneNodeIds,
    sourcePath,
    rowCount,
  };
}

export function loadGraphFromXlsx(): GraphLoadResult {
  const { path: xlsxPath, checkedPaths } = resolveXlsxPath();
  if (!xlsxPath) {
    return {
      ok: false,
      error: NOT_FOUND_ERROR,
      checkedPaths,
    };
  }

  try {
    const workbook = xlsx.readFile(xlsxPath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        ok: false,
        error: "xlsx 中没有可读取的工作表。",
        checkedPaths,
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });

    const data = buildGraphFromRows(rows, xlsxPath);
    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "解析 xlsx 失败",
      checkedPaths,
    };
  }
}
