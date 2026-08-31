export type SourceType =
  | 'selenium_code'
  | 'playwright_code'
  | 'test_case'
  | 'jira_ticket'
  | 'company_doc'
  | 'meeting_note'
  | 'lucidchart'
  | 'prd_doc'
  | 'jenkins_log'
  | 'figma_design'

export interface HealthResponse {
  status: string
  vector_backend: string
  collection: {
    exists: boolean
    points_count?: number
    status?: string
  }
  llm_provider: string
}

export interface SourceStatus {
  source_type: SourceType
  folder: string
  chunk_count: number
  last_ingested_at: string | null
  status: 'ingested' | 'not_ingested' | 'not_implemented_phase2'
}

export type ChatStageName = 'rewrite' | 'retrieve' | 'rerank' | 'generate'

export interface ChatStageEvent {
  stage: ChatStageName
  rewrites?: string[]
  candidate_count?: number
  kept?: number
}

export interface Citation {
  source_type: SourceType
  label: string
  score: number
  source_id: string
}

export interface ChatGenerateEvent {
  answer: string
  citations: Citation[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations?: Citation[]
  error?: boolean
}

export interface IngestStageEvent {
  stage: 'read' | 'build' | 'chunk' | 'embed' | 'index' | 'done' | 'error' | 'all_done'
  source_type?: SourceType
  folder?: string
  document_count?: number
  chunk_count?: number
  message?: string
}
