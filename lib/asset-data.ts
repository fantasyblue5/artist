import type { AssetCategory, AssetRecord, AssetSortMode, AssetType, GraphData } from "@/lib/resource-types";

const STYLES = ["东方写意", "现代抽象", "印象派", "古典写实", "实验混合"] as const;

const COVER_IMAGES: Partial<Record<AssetType, string[]>> = {
  构图模板: ["/assets/resources/composition-frame.svg"],
  色彩方案: ["/assets/resources/color-palette.svg"],
  光影参考: ["/assets/resources/light-study.svg"],
  笔触纹理: ["/assets/resources/brush-texture.svg"],
  风格样本: ["/assets/resources/style-collage.svg"],
  透视空间: ["/assets/resources/perspective-grid.svg"],
};

const COVER_VARIANTS = ["atlas", "studio", "nocturne", "gallery"] as const;

function assetTypeFromNodeLabel(label: string): AssetType {
  if (label.includes("构图")) {
    return "构图模板";
  }
  if (label.includes("色")) {
    return "色彩方案";
  }
  if (label.includes("光")) {
    return "光影参考";
  }
  if (label.includes("笔触") || label.includes("肌理")) {
    return "笔触纹理";
  }
  if (label.includes("透视") || label.includes("空间")) {
    return "透视空间";
  }
  return "风格样本";
}

export function buildAssetMockData(graph: GraphData) {
  const nodes = graph.nodes.filter((node) => node.level > 0);

  return nodes.slice(0, 42).map((node, index) => {
    const type = assetTypeFromNodeLabel(node.label);
    const imagePool = COVER_IMAGES[type] ?? [];
    const useRealCover = index % 4 === 0 && imagePool.length > 0;
    const tags = Array.from(new Set([node.label, type, ...node.path.slice(1, 3)].filter(Boolean)));

    return {
      id: `asset:${node.id}:${index}`,
      title: `${node.label}${index % 2 === 0 ? "参考板" : "灵感样本"}`,
      description: node.description ?? "适用于 AI 艺术创作的结构参考、视觉语言与风格灵感。",
      type,
      tags,
      relatedNodeIds: [node.id, ...(node.parent ? [node.parent] : [])],
      coverImage: useRealCover ? imagePool[index % imagePool.length] : undefined,
      coverVariant: useRealCover ? undefined : COVER_VARIANTS[index % COVER_VARIANTS.length],
      isFavorite: false,
      style: STYLES[index % STYLES.length],
      hotScore: 100 - index,
      createdAt: Date.now() - index * 1000 * 60 * 60 * 24,
    } satisfies AssetRecord;
  });
}

export function filterAssets(
  assets: AssetRecord[],
  options: {
    category: AssetCategory;
    query: string;
    nodeId: string | null;
    style: string | null;
    sortMode: AssetSortMode;
  },
) {
  const normalized = options.query.trim().toLowerCase();

  let list = assets.filter((asset) => {
    if (options.category === "收藏素材" && !asset.isFavorite) {
      return false;
    }
    if (options.category !== "全部素材" && options.category !== "收藏素材" && asset.type !== options.category) {
      return false;
    }
    if (options.nodeId && !asset.relatedNodeIds.includes(options.nodeId)) {
      return false;
    }
    if (options.style && asset.style !== options.style) {
      return false;
    }
    if (normalized) {
      const target = [asset.title, asset.description, asset.tags.join(" ")].join(" ").toLowerCase();
      return target.includes(normalized);
    }
    return true;
  });

  list = [...list].sort((a, b) => {
    if (options.sortMode === "最新") {
      return b.createdAt - a.createdAt;
    }
    if (options.sortMode === "收藏") {
      return Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)) || b.hotScore - a.hotScore;
    }
    return b.hotScore - a.hotScore;
  });

  return list;
}
