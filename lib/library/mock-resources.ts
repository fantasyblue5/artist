import type { KnowledgeGraphNode, KnowledgeResource } from "@/lib/library/types";

const resourceTypes = ["构图模板", "色彩方案", "笔触纹理", "光影参考", "风格参考"] as const;

function slug(input: string) {
  return input.replace(/\s+/g, "-");
}

function previewGradient(type: KnowledgeResource["type"], label: string) {
  const presets: Record<KnowledgeResource["type"], string> = {
    构图模板: "linear-gradient(135deg, rgba(83,126,176,0.94), rgba(189,210,233,0.94))",
    色彩方案: "linear-gradient(135deg, rgba(103,147,191,0.92), rgba(234,242,251,0.98))",
    笔触纹理: "linear-gradient(135deg, rgba(214,225,239,0.96), rgba(139,167,199,0.92))",
    光影参考: "linear-gradient(135deg, rgba(72,92,122,0.96), rgba(183,204,228,0.92))",
    风格参考: "linear-gradient(135deg, rgba(242,246,252,0.98), rgba(134,164,197,0.9))",
  };

  return `${presets[type]}, radial-gradient(circle at 70% 30%, rgba(255,255,255,0.28), transparent 30%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2), transparent 26%) ${label}`;
}

export function buildMockResources(nodes: KnowledgeGraphNode[]) {
  const resources: KnowledgeResource[] = [];
  const usefulNodes = nodes.filter((node) => node.level > 0);

  usefulNodes.slice(0, 30).forEach((node, index) => {
    const type = resourceTypes[index % resourceTypes.length];
    resources.push({
      id: `resource:${slug(node.id)}:${index}`,
      title: `${node.label}${type === "风格参考" ? "风格样本" : type}`,
      type,
      image: previewGradient(type, node.label),
      tags: [type, node.label, ...node.pathLabels.slice(1, 3)].filter(Boolean),
      linkedNodeIds: [node.id, node.rootId].filter(Boolean),
      favorite: false,
    });
  });

  return resources;
}

export function getResourcesForNode(resources: KnowledgeResource[], node: KnowledgeGraphNode | null) {
  if (!node) {
    return resources.slice(0, 8);
  }

  const ids = new Set([node.id, node.rootId, ...(node.pathIds ?? [])]);
  const matched = resources.filter((resource) => resource.linkedNodeIds.some((id) => ids.has(id)));
  return matched.length > 0 ? matched.slice(0, 12) : resources.slice(0, 8);
}
