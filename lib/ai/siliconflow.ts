import type {
  AnalysisFollowup,
  AnalysisImageSource,
  ArtworkAnalysisResult,
  ArtworkAnalysisDimensionName,
} from "@/components/workspace/analysis/types";
import { ARTWORK_ANALYSIS_DIMENSION_NAMES } from "@/components/workspace/analysis/types";
import {
  ARTWORK_ANALYSIS_MODEL,
  ARTWORK_ANALYSIS_SYSTEM_PROMPT,
  buildArtworkAnalysisUserPrompt,
  buildArtworkFollowupUserPrompt,
} from "@/lib/ai/prompts/artwork-analysis";

const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_TEXT_MODEL = "Qwen/Qwen3-8B";
const DEFAULT_IMAGE_MODEL = "Qwen/Qwen-Image";
const DEFAULT_IMAGE_EDIT_MODEL = "Qwen/Qwen-Image-Edit-2509";
const SILICONFLOW_DEFAULT_TIMEOUT_MS = 45000;
const SILICONFLOW_VISION_TIMEOUT_MS = 120000;
const SILICONFLOW_VISION_FOLLOWUP_TIMEOUT_MS = 90000;
const SILICONFLOW_MAX_RETRIES = 2;

type SiliconFlowChatResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type SiliconFlowChatMessage =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "system" | "user" | "assistant";
      content: Array<
        | {
            type: "text";
            text: string;
          }
        | {
            type: "image_url";
            image_url: {
              url: string;
            };
          }
      >;
    };

type SiliconFlowImageResponse = {
  data?: SiliconFlowImageItem[];
  images?: SiliconFlowImageItem[];
  output?: {
    data?: SiliconFlowImageItem[];
    images?: SiliconFlowImageItem[];
  };
  revised_prompt?: string;
  error?: {
    message?: string;
  };
};

type SiliconFlowImageItem = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
  mime_type?: string;
  content_type?: string;
  format?: string;
};

function getConfig() {
  const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SILICONFLOW_API_KEY 未配置");
  }

  return {
    apiKey,
    baseUrl: process.env.SILICONFLOW_BASE_URL?.trim() || DEFAULT_BASE_URL,
    textModel: process.env.SILICONFLOW_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    imageModel: process.env.SILICONFLOW_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
    imageEditModel: process.env.SILICONFLOW_IMAGE_EDIT_MODEL?.trim() || DEFAULT_IMAGE_EDIT_MODEL,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      name: "UnknownError",
      message: String(error),
      cause: undefined,
    };
  }

  const cause =
    error.cause && typeof error.cause === "object"
      ? {
          ...(error.cause as Record<string, unknown>),
        }
      : error.cause;

  return {
    name: error.name,
    message: error.message,
    cause,
  };
}

function isRetryableFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "AbortError") {
    return false;
  }

  if (error.message === "fetch failed") {
    return true;
  }

  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const code = "code" in cause ? String(cause.code) : "";
    return [
      "ECONNRESET",
      "ECONNREFUSED",
      "EHOSTUNREACH",
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_SOCKET",
      "ENOTFOUND",
      "EAI_AGAIN",
    ].includes(code);
  }

  return false;
}

async function requestSiliconFlow<T>(
  path: string,
  body: Record<string, unknown>,
  options?: { timeoutMs?: number },
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const timeoutMs = options?.timeoutMs ?? SILICONFLOW_DEFAULT_TIMEOUT_MS;
  const requestMeta = {
    path,
    model: body.model,
    hasPrompt: typeof body.prompt === "string" && body.prompt.length > 0,
    promptLength: typeof body.prompt === "string" ? body.prompt.length : 0,
    hasReferenceImage: typeof body.image === "string" && body.image.length > 0,
    responseFormat: body.response_format,
    timeoutMs,
    maxRetries: SILICONFLOW_MAX_RETRIES,
  };
  console.info("[SiliconFlow] request", requestMeta);

  for (let attempt = 1; attempt <= SILICONFLOW_MAX_RETRIES + 1; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[SiliconFlow] request failed", {
          path,
          attempt,
          status: response.status,
          bodyPreview: text.slice(0, 600),
        });
        throw new Error(text || `SiliconFlow 请求失败 (${response.status})`);
      }

      const json = (await response.json()) as T;
      console.info("[SiliconFlow] response received", {
        path,
        attempt,
        status: response.status,
        topLevelKeys: json && typeof json === "object" ? Object.keys(json as Record<string, unknown>) : [],
      });
      return json;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[SiliconFlow] request timeout", {
          path,
          attempt,
          timeoutMs,
        });
        throw new Error(`SiliconFlow 请求超时（${Math.round(timeoutMs / 1000)} 秒）`);
      }

      const details = extractErrorDetails(error);
      console.error("[SiliconFlow] fetch exception", {
        path,
        attempt,
        ...details,
      });

      if (!isRetryableFetchError(error) || attempt > SILICONFLOW_MAX_RETRIES) {
        throw new Error(
          details.message === "fetch failed"
            ? "SiliconFlow 网络连接失败，请检查当前网络或稍后重试"
            : details.message || "SiliconFlow 请求失败",
        );
      }

      const delayMs = 800 * attempt;
      console.warn("[SiliconFlow] retrying request", {
        path,
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
      });
      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("SiliconFlow 请求失败");
}

export function formatSiliconFlowError(error: unknown) {
  const details = extractErrorDetails(error);
  return {
    name: details.name,
    message: details.message,
    cause: details.cause,
    isRetryable: isRetryableFetchError(error),
  };
}

function readChatMessageContent(
  content:
    | string
    | Array<{
        type?: string;
        text?: string;
      }>
    | undefined,
) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text.trim() : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

function extractJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型没有返回有效 JSON");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

function normalizeShortText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringList(value: unknown, minLength = 1) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length >= minLength)
    : [];
}

function normalizeDimensionName(value: unknown, fallbackIndex: number): ArtworkAnalysisDimensionName {
  const raw = typeof value === "string" ? value.trim() : "";
  const matched = ARTWORK_ANALYSIS_DIMENSION_NAMES.find((item) => item === raw);
  if (matched) {
    return matched;
  }

  const aliasMap: Record<string, ArtworkAnalysisDimensionName> = {
    色彩: "色彩关系",
    笔触肌理: "笔触与肌理",
    边缘: "边缘关系",
    透视空间: "透视与空间",
  };

  if (raw in aliasMap) {
    return aliasMap[raw];
  }

  return ARTWORK_ANALYSIS_DIMENSION_NAMES[fallbackIndex] ?? "构图";
}

function getFallbackDimensionContent(name: ArtworkAnalysisDimensionName) {
  switch (name) {
    case "光影":
      return {
        visible_facts: "主次受光关系基本可读，但局部仍需细看。",
        professional_judgment: "光影逻辑已有基础，可继续收紧体积转折和焦点明暗。",
        evidence: ["亮暗主次已建立", "局部转折仍偏概括"],
        suggestions: ["优先拉开主体关键部位的明暗层次。"],
      };
    case "形状体态":
      return {
        visible_facts: "主体大形可辨，局部形状仍有概括空间。",
        professional_judgment: "体态方向成立，但结构归纳和主次分配还可更明确。",
        evidence: ["主体外形可识别", "局部小形略多"],
        suggestions: ["先收束大形，再补关键结构细节。"],
      };
    case "构图":
      return {
        visible_facts: "主体位置明确，画面重心相对稳定。",
        professional_judgment: "构图基本成立，但视觉动线和主次组织还可更集中。",
        evidence: ["主题位置清楚", "次级节奏略弱"],
        suggestions: ["优先强化视觉中心周围的组织关系。"],
      };
    case "笔触与肌理":
      return {
        visible_facts: "画面已有明确笔触痕迹和材质倾向。",
        professional_judgment: "笔触语言具备方向，但强弱层级还可再拉开。",
        evidence: ["笔触风格可见", "局部密度略平均"],
        suggestions: ["让焦点区和次要区的笔触密度更分明。"],
      };
    case "色彩关系":
      return {
        visible_facts: "整体色调已形成，冷暖关系基本可读。",
        professional_judgment: "色彩方向成立，但主次和局部色温控制还可更精准。",
        evidence: ["主色调清晰", "局部色彩竞争存在"],
        suggestions: ["优先压住次要区域色彩竞争，让主体更突出。"],
      };
    case "边缘关系":
      return {
        visible_facts: "轮廓边缘可读，焦点边缘仍可进一步区分。",
        professional_judgment: "边缘分工还不够充分，画面容易显得平均用力。",
        evidence: ["轮廓关系明确", "软硬边差异不足"],
        suggestions: ["保留焦点硬边，弱化次要区域边缘清晰度。"],
      };
    case "透视与空间":
      return {
        visible_facts: "前后关系基本存在，但空间退让仍不够充分。",
        professional_judgment: "空间组织方向成立，可继续拉开远近层次和呼吸感。",
        evidence: ["前后关系可见", "空间后撤偏弱"],
        suggestions: ["通过清晰度和对比度递减加强空间层次。"],
      };
    default:
      return {
        visible_facts: "当前维度信息有限，仍可做保守判断。",
        professional_judgment: "该维度暂缺更强证据，建议结合原图继续确认。",
        evidence: ["可见信息有限", "判断需保持保守"],
        suggestions: ["优先回到主体焦点区域继续核对。"],
      };
  }
}

function normalizeArtworkAnalysisResult(raw: unknown): ArtworkAnalysisResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("分析结果格式错误");
  }

  const data = raw as {
    summary?: unknown;
    dimensions?: unknown;
  };

  const rawSummary = data.summary && typeof data.summary === "object" ? (data.summary as Record<string, unknown>) : null;
  const rawDimensions = Array.isArray(data.dimensions) ? data.dimensions : [];
  const dimensionMap = new Map<ArtworkAnalysisDimensionName, Record<string, unknown>>();

  rawDimensions.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const value = item as Record<string, unknown>;
    const name = normalizeDimensionName(value.name, index);
    if (!dimensionMap.has(name)) {
      dimensionMap.set(name, value);
    }
  });

  const normalizedDimensions = ARTWORK_ANALYSIS_DIMENSION_NAMES.map((name, index) => {
    const value = dimensionMap.get(name);
    const fallback = getFallbackDimensionContent(name);
    const rawAnalysis = value?.analysis && typeof value.analysis === "object"
      ? (value.analysis as Record<string, unknown>)
      : null;
    const fallbackFacts = fallback.visible_facts;
    const fallbackJudgment = fallback.professional_judgment;

    const evidence = normalizeStringList(value?.evidence, 2).slice(0, 2);
    const suggestions = normalizeStringList(value?.suggestions, 4).slice(0, 1);

    return {
      name: normalizeDimensionName(value?.name, index),
      analysis: {
        visible_facts: normalizeShortText(rawAnalysis?.visible_facts, fallbackFacts),
        professional_judgment: normalizeShortText(rawAnalysis?.professional_judgment, fallbackJudgment),
      },
      evidence: evidence.length > 0 ? evidence : fallback.evidence,
      suggestions: suggestions.length > 0 ? suggestions : fallback.suggestions,
    };
  });

  return {
    summary: {
      overall_assessment: normalizeShortText(
        rawSummary?.overall_assessment,
        "这张作品已有明确视觉方向，但主体聚焦和整体完成度仍有收束空间。",
      ),
      top_strengths: (() => {
        const next = normalizeStringList(rawSummary?.top_strengths, 2).slice(0, 2);
        return next.length > 0 ? next : ["主体方向明确", "整体风格较统一"];
      })(),
      top_issues: (() => {
        const next = normalizeStringList(rawSummary?.top_issues, 2).slice(0, 2);
        return next.length > 0 ? next : ["主次关系仍可拉开", "局部细节略显平均"];
      })(),
      next_step: normalizeShortText(
        rawSummary?.next_step,
        "先收紧主体焦点区的光影和边缘，再弱化次要区域。",
      ),
    },
    dimensions: normalizedDimensions,
    followups: [],
    updatedAt: Date.now(),
  };
}

async function requestArtworkAnalysisContent(messages: SiliconFlowChatMessage[]) {
  const response = await requestSiliconFlowChatCompletion({
    model: ARTWORK_ANALYSIS_MODEL,
    temperature: 0.2,
    maxTokens: 1700,
    timeoutMs: SILICONFLOW_VISION_TIMEOUT_MS,
    messages,
  });

  const content = readChatMessageContent(response.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error(response.error?.message || "画面分析结果为空");
  }

  return content;
}

async function requestSiliconFlowChatCompletion(input: {
  model: string;
  messages: SiliconFlowChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}) {
  return requestSiliconFlow<SiliconFlowChatResponse>("/chat/completions", {
    model: input.model,
    temperature: input.temperature ?? 0.3,
    max_tokens: input.maxTokens ?? 1000,
    messages: input.messages,
  }, {
    timeoutMs: input.timeoutMs,
  });
}

function toImageDataUrl(base64OrDataUrl: string, mimeType = "image/png") {
  const normalized = base64OrDataUrl.trim();
  if (normalized.startsWith("data:image/")) {
    return normalized;
  }

  return `data:${mimeType};base64,${normalized.replace(/\s+/g, "")}`;
}

async function remoteImageToDataUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`生成图片下载失败 (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function pickSiliconFlowImageItem(response: SiliconFlowImageResponse) {
  const groups = [response.data, response.images, response.output?.data, response.output?.images];

  for (const group of groups) {
    if (Array.isArray(group) && group.length > 0) {
      return group[0];
    }
  }

  return null;
}

function inferImageMimeType(item: SiliconFlowImageItem) {
  if (item.mime_type?.trim()) {
    return item.mime_type.trim();
  }

  if (item.content_type?.trim()) {
    return item.content_type.trim();
  }

  if (item.format?.trim()) {
    const format = item.format.trim().replace(/^\./, "");
    if (format) {
      return `image/${format}`;
    }
  }

  return "image/png";
}

export async function polishPromptWithSiliconFlow(prompt: string) {
  const { textModel } = getConfig();

  const response = await requestSiliconFlow<SiliconFlowChatResponse>("/chat/completions", {
    model: textModel,
    temperature: 0.4,
    max_tokens: 420,
    messages: [
      {
        role: "system",
        content:
          "你是一名中文视觉提示词优化助手。请把用户的创作描述重写成更适合文生图模型理解的中文 prompt，只输出优化后的结果，不要解释，不要加标题。结果需保留用户意图，并补全主体、构图、光线、氛围、材质、细节与质量描述。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const polished = readChatMessageContent(response.choices?.[0]?.message?.content);
  if (!polished) {
    throw new Error(response.error?.message || "润色结果为空");
  }

  return polished;
}

export async function analyzeArtworkWithSiliconFlow(image: AnalysisImageSource) {
  const messages: SiliconFlowChatMessage[] = [
    {
      role: "system",
      content: ARTWORK_ANALYSIS_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: buildArtworkAnalysisUserPrompt(image),
        },
        {
          type: "image_url",
          image_url: {
            url: image.src,
          },
        },
      ],
    },
  ];

  const firstContent = await requestArtworkAnalysisContent(messages);

  try {
    return normalizeArtworkAnalysisResult(extractJsonObject(firstContent));
  } catch (error) {
    console.warn("[SiliconFlow] artwork analysis repair retry", {
      message: error instanceof Error ? error.message : String(error),
    });

    const repairedContent = await requestArtworkAnalysisContent([
      ...messages,
      {
        role: "assistant",
        content: firstContent,
      },
      {
        role: "user",
        content:
          "你上一条返回的 JSON 不符合要求。请仅重新输出完整 JSON，严格保留 summary 和 dimensions 两个顶层字段，dimensions 必须是七个固定维度，且不要输出任何解释。",
      },
    ]);

    return normalizeArtworkAnalysisResult(extractJsonObject(repairedContent));
  }
}

export async function answerArtworkFollowupWithSiliconFlow(input: {
  question: string;
  image: AnalysisImageSource | null;
  result: ArtworkAnalysisResult | null;
  followups: AnalysisFollowup[];
}) {
  const userPrompt = buildArtworkFollowupUserPrompt(input);
  const userMessage: SiliconFlowChatMessage = input.image
    ? {
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: input.image.src,
            },
          },
        ],
      }
    : {
        role: "user",
        content: userPrompt,
      };

  const response = await requestSiliconFlowChatCompletion({
    model: ARTWORK_ANALYSIS_MODEL,
    temperature: 0.35,
    maxTokens: 600,
    timeoutMs: SILICONFLOW_VISION_FOLLOWUP_TIMEOUT_MS,
    messages: [
      {
        role: "system",
        content: ARTWORK_ANALYSIS_SYSTEM_PROMPT,
      },
      userMessage,
    ],
  });

  const answer = readChatMessageContent(response.choices?.[0]?.message?.content);
  if (!answer) {
    throw new Error(response.error?.message || "追问回答为空");
  }

  return answer.trim();
}

export async function generateImageWithSiliconFlow(input: {
  prompt?: string;
  referenceImage?: string;
}) {
  const { imageEditModel, imageModel } = getConfig();
  const trimmedPrompt = input.prompt?.trim() || "";
  const hasPrompt = Boolean(trimmedPrompt);
  const hasReferenceImage = Boolean(input.referenceImage);
  const prompt =
    trimmedPrompt || "基于参考图生成一张高质量、构图完整、风格统一的艺术作品。";
  const mode = hasReferenceImage
    ? hasPrompt
      ? "image-edit-with-text"
      : "image-edit"
    : "text-to-image";
  const normalizedTextToImageModel = imageModel.includes("Edit") ? DEFAULT_IMAGE_MODEL : imageModel;
  const normalizedImageEditModel = imageEditModel.includes("Edit")
    ? imageEditModel
    : DEFAULT_IMAGE_EDIT_MODEL;
  const model = mode === "text-to-image" ? normalizedTextToImageModel : normalizedImageEditModel;
  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    image: input.referenceImage || undefined,
    response_format: "b64_json",
  };

  if (mode === "text-to-image") {
    requestBody.image_size = "1328x1328";
  }

  console.info("[SiliconFlow] generate image config", {
    mode,
    hasPrompt,
    hasReferenceImage,
    model,
    usesImageEditModel: mode !== "text-to-image",
    includesImageSize: "image_size" in requestBody,
    configuredImageModel: imageModel,
    configuredImageEditModel: imageEditModel,
  });

  const response = await requestSiliconFlow<SiliconFlowImageResponse>("/images/generations", requestBody);

  const item = pickSiliconFlowImageItem(response);
  if (!item) {
    throw new Error(response.error?.message || "生图结果为空");
  }

  console.info("[SiliconFlow] image payload parsed", {
    hasBase64: typeof item.b64_json === "string" && item.b64_json.length > 0,
    hasUrl: typeof item.url === "string" && item.url.length > 0,
    mimeType: inferImageMimeType(item),
  });

  if (item.b64_json) {
    const normalizedBase64 = item.b64_json.trim().replace(/^data:image\/[^;]+;base64,/, "");
    const imageDataUrl = toImageDataUrl(item.b64_json, inferImageMimeType(item));
    return {
      imageBase64: normalizedBase64,
      imageDataUrl,
      imageSrc: imageDataUrl,
      revisedPrompt: item.revised_prompt?.trim() || response.revised_prompt?.trim() || prompt,
    };
  }

  if (item.url) {
    let persistedImageSrc = item.url.trim();
    try {
      persistedImageSrc = await remoteImageToDataUrl(item.url.trim());
      console.info("[SiliconFlow] remote image converted to data url", {
        originalUrlPreview: item.url.trim().slice(0, 120),
      });
    } catch (error) {
      console.warn("[SiliconFlow] remote image conversion failed; fallback to remote url", {
        originalUrlPreview: item.url.trim().slice(0, 120),
        message: error instanceof Error ? error.message : "unknown",
      });
    }

    return {
      imageUrl: item.url.trim(),
      imageDataUrl: persistedImageSrc,
      imageSrc: persistedImageSrc,
      revisedPrompt: item.revised_prompt?.trim() || response.revised_prompt?.trim() || prompt,
    };
  }

  throw new Error("未获取到可用图片数据");
}
