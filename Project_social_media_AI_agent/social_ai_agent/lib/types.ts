export type ContentStatus =
  | "Pending"
  | "Writing"
  | "Imaging"
  | "Done"
  | "Error";

export interface ContentRow {
  date: string;            // ISO date string "YYYY-MM-DD"
  topic: string;
  linkedinPost: string;
  mediumArticle: string;
  igScript: string;
  ytScript: string;
  devtoArticle: string;
  status: ContentStatus;
  linkedinImage: string;
  mediumImage: string;
  igImage: string;
  lastUpdated?: string;    // ISO timestamp of last write
  errorMessage?: string;
}

export interface PipelineState {
  running: boolean;
  currentStep: string | null;
  lastRun: string | null;
  lastError: string | null;
  nextScheduled: string;
}

export interface ApiKeyHealth {
  groq: boolean;
  gemini: boolean;
}

export interface StatusResponse {
  pipeline: PipelineState;
  keys: ApiKeyHealth;
}

export const KEYWORD_POOL = [
  "QA",
  "MCP",
  "RAG",
  "LLM",
  "AI Agents",
  "n8n",
  "LangFlow",
  "Crew AI",
  "DeepEval",
  "LangChain",
  "AI Harness",
  "LLM Eval",
] as const;

export type Keyword = (typeof KEYWORD_POOL)[number];
