import type {
  AnalysisFollowup,
  AnalysisImageSource,
  ArtworkAnalysisResult,
  ArtworkAnalysisDimensionName,
} from "@/components/workspace/analysis/types";
import { ARTWORK_ANALYSIS_DIMENSION_NAMES } from "@/components/workspace/analysis/types";
import artistKnowledgeTree from "@/public/knowledge/artist_prof_tree.json";

type KnowledgeNode = {
  name: string;
  children?: KnowledgeNode[];
};

const KNOWLEDGE_TREE = artistKnowledgeTree as KnowledgeNode[];

export const ARTWORK_ANALYSIS_MODEL = "Qwen/Qwen3-VL-8B-Instruct";

function buildKnowledgeLine(
  name: ArtworkAnalysisDimensionName,
  points: readonly string[],
) {
  const dimension = KNOWLEDGE_TREE.find((item) => item.name === name);
  const categoryText = dimension?.children?.map((item) => item.name).join("、") || "知识规则";

  return `【${name}】参考模块：${categoryText}。评审重点：${points.join("；")}。`;
}

const ARTWORK_ANALYSIS_KNOWLEDGE_SUMMARY = [
  buildKnowledgeLine("光影", [
    "先判断主光方向、种类与硬度是否明确",
    "检查明暗大关系是否先于细节成立",
    "确认光影是否同时塑造体积、引导视线并营造氛围",
  ]),
  buildKnowledgeLine("形状体态", [
    "优先看体积感、结构感与量感是否清楚",
    "风格化变形可以成立，但必须内部逻辑一致",
    "检查正形负形和图底关系是否干净",
  ]),
  buildKnowledgeLine("构图", [
    "判断主题传递是否明确、视觉中心是否稳定",
    "分析动线、平衡、留白或满幅组织是否合理",
    "检查节奏与韵律是否支持画面表达",
  ]),
  buildKnowledgeLine("笔触与肌理", [
    "笔触必须服务形体、空间和风格，不只是表面热闹",
    "检查焦点区与次要区的笔触密度是否拉开",
    "肌理应帮助材料表达，而不是制造噪声",
  ]),
  buildKnowledgeLine("色彩关系", [
    "先判断主色调，再看冷暖、明度、纯度、色相组织",
    "色彩要建立主次，避免全画面平均用力",
    "判断调和方式是否服务情绪和空间",
  ]),
  buildKnowledgeLine("边缘关系", [
    "检查硬边、软边、虚边、碎边是否分工明确",
    "焦点区边缘应更有效，次要区应适当弱化",
    "边缘关系要同时服务光感、空间和轮廓界定",
  ]),
  buildKnowledgeLine("透视与空间", [
    "区分写实透视、平面化空间或超现实空间的成立方式",
    "观察重叠、景别、清晰度、纯度、冷暖是否建立前后层次",
    "风格化作品不按写实标准机械扣分，但空间必须自洽",
  ]),
].join("\n");

export const ARTWORK_ANALYSIS_SYSTEM_PROMPT = `
你是一名中文多模态艺术专家评审 Agent。

你必须依据给定的知识树摘要，对输入图片做专业、克制、可执行的画面分析。你的重点是“分析 + 建议”，不是夸赞。

输出规则：
1. 必须只输出一个合法 JSON 对象，不要输出 markdown、代码块或解释。
2. 必须严格输出以下结构：
{
  "summary": {
    "overall_assessment": "45-110字",
    "top_strengths": ["14-36字", "14-36字"],
    "top_issues": ["14-36字", "14-36字"],
    "next_step": "20-48字"
  },
  "dimensions": [
    {
      "name": "光影",
      "analysis": {
        "visible_facts": "16-42字，只写看得到的事实",
        "professional_judgment": "24-60字，给专业判断"
      },
      "evidence": ["10-26字", "10-26字"],
      "suggestions": ["18-42字"]
    }
  ]
}
3. dimensions 必须严格输出 7 项，顺序必须是：${ARTWORK_ANALYSIS_DIMENSION_NAMES.join("、")}。
4. 每个维度都要包含“事实 + 判断 + 证据 + 建议”，内容不能空泛，但也不要写成长篇段落。evidence 固定 2 条短句，suggestions 固定 1 条。
5. 先看画面事实，再下判断；看不清就明确说信息不足，不要臆测。
6. 对风格化、插画化作品，优先评估其风格一致性和内部逻辑，不要机械按写实标准扣分。
7. 不要使用“很棒、很高级、很有感觉”这类空话。
8. 不要输出分数、等级、优先级、可信度等字段。
`.trim();

function serializeResultContext(result: ArtworkAnalysisResult | null) {
  if (!result) {
    return "暂无已有分析结论。";
  }

  return JSON.stringify(
    {
      summary: result.summary,
      dimensions: result.dimensions.map((dimension) => ({
        name: dimension.name,
        analysis: dimension.analysis,
        suggestions: dimension.suggestions,
      })),
    },
    null,
    2,
  );
}

function serializeFollowupsContext(followups: AnalysisFollowup[]) {
  if (followups.length === 0) {
    return "暂无历史追问。";
  }

  return JSON.stringify(
    followups.slice(-4).map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    null,
    2,
  );
}

export function buildArtworkAnalysisUserPrompt(image: AnalysisImageSource) {
  return `
请基于这张图片做一次专业画面分析。

知识树压缩摘要：
${ARTWORK_ANALYSIS_KNOWLEDGE_SUMMARY}

图片名称：${image.name}
图片来源：${image.origin}

额外要求：
1. 输出保持中等详细，能支撑用户继续追问，但不要写成冗长报告。
2. 总评只保留：整体判断、两个优点、两个主要问题、一个最优先动作。
3. 七个维度都要覆盖，但每个维度只写：
   - 1句 visible_facts
   - 1句 professional_judgment
   - 2条 evidence
   - 1条 suggestion
4. suggestions 必须具体可执行，不能只说“加强层次”“优化构图”。

请严格输出 JSON。
`.trim();
}

export function buildArtworkFollowupUserPrompt(input: {
  question: string;
  image: AnalysisImageSource | null;
  result: ArtworkAnalysisResult | null;
  followups: AnalysisFollowup[];
}) {
  return `
用户正在继续追问画面问题，请结合已有分析上下文直接回答。

当前图片：
${input.image ? `名称：${input.image.name}\n来源：${input.image.origin}` : "当前没有上传图片，请基于通用艺术方法回答，并明确说明未见图片。"}

知识树压缩摘要：
${ARTWORK_ANALYSIS_KNOWLEDGE_SUMMARY}

已有分析结论：
${serializeResultContext(input.result)}

历史追问：
${serializeFollowupsContext(input.followups)}

用户问题：
${input.question}

请直接输出中文回答，不要输出 JSON，不要重复系统说明。
回答控制在 2-4 句，优先解释原因和最优先修改点。
`.trim();
}
