export type ToolKey =
  | "inspiration"
  | "analysis"
  | "attribute"
  | "lineart"
  | "style";

export type HistoryItem = {
  id: string;
  imageSrc: string;
  prompt?: string;
  createdAt: string;
};
