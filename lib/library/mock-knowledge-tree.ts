import type { KnowledgeTreeSourceNode } from "@/lib/library/types";

export const mockKnowledgeTree: KnowledgeTreeSourceNode[] = [
  {
    name: "构图",
    children: [
      {
        name: "构成核心目标",
        children: [
          {
            name: "主题传递",
            children: [
              {
                name: "叙事性_情节引导",
                description: "题材类型、情绪类型与叙事节奏如何引导观看路径。",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "色彩",
    children: [
      {
        name: "色相组织",
        children: [
          {
            name: "冷暖对比",
            description: "通过冷暖关系建立空间层次、情绪张力和视觉焦点。",
          },
          {
            name: "主色调统一",
            description: "以清晰主色调统领画面，降低色彩噪声并强化风格识别。",
          },
        ],
      },
    ],
  },
];
