export type AnalysisViewState = "empty" | "image_ready" | "analyzing" | "analyzed";

export type AnalysisImageOrigin = "local" | "generation" | "shortcut";

export const ARTWORK_ANALYSIS_DIMENSION_NAMES = [
  "光影",
  "形状体态",
  "构图",
  "笔触与肌理",
  "色彩关系",
  "边缘关系",
  "透视与空间",
] as const;

export type ArtworkAnalysisDimensionName = (typeof ARTWORK_ANALYSIS_DIMENSION_NAMES)[number];

export type AnalysisImageSource = {
  src: string;
  name: string;
  origin: AnalysisImageOrigin;
  sourceType: "data-url" | "url";
  importedAt: number;
};

export type AnalysisFollowup = {
  id: string;
  question: string;
  answer: string;
};

export type AnalysisPendingMessage = {
  id: string;
  question: string;
};

export type ArtworkAnalysisSummary = {
  overall_assessment: string;
  top_strengths: string[];
  top_issues: string[];
  next_step: string;
};

export type ArtworkAnalysisDimension = {
  name: ArtworkAnalysisDimensionName;
  analysis: {
    visible_facts: string;
    professional_judgment: string;
  };
  evidence: string[];
  suggestions: string[];
};

export type SavedAnalysisConversation = {
  id: string;
  imageSrc: string;
  imageName: string;
  origin: AnalysisImageOrigin;
  sourceType: "data-url" | "url";
  updatedAt: number;
  result: ArtworkAnalysisResult | null;
  followups: AnalysisFollowup[];
};

export type ArtworkAnalysisResult = {
  summary: ArtworkAnalysisSummary;
  dimensions: ArtworkAnalysisDimension[];
  followups: AnalysisFollowup[];
  updatedAt: number;
};
