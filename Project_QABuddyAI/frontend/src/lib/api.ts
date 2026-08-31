import { streamPost } from '@/lib/sse'
import type {
  ChatGenerateEvent,
  ChatStageEvent,
  HealthResponse,
  IngestStageEvent,
  SourceStatus,
  SourceType,
} from '@/lib/types'

const BASE = '/api'

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

export const getHealth = () => getJSON<HealthResponse>('/health')
export const getSources = () => getJSON<SourceStatus[]>('/sources')

export async function uploadSourceFiles(
  sourceType: SourceType,
  files: FileList | File[],
): Promise<{ source_type: SourceType; saved_files: string[] }> {
  const form = new FormData()
  for (const file of Array.from(files)) {
    form.append('files', file)
  }
  const res = await fetch(`${BASE}/sources/${sourceType}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Upload failed (${res.status})`)
  }
  return res.json()
}

interface ChatEvents {
  stage: ChatStageEvent
  generate: ChatGenerateEvent
  error: { message: string }
  done: Record<string, never>
}

export function streamChat(
  question: string,
  sourceTypes: SourceType[] | null,
  handlers: Partial<{ [K in keyof ChatEvents]: (data: ChatEvents[K]) => void }>,
) {
  return streamPost<ChatEvents>(`${BASE}/chat`, {
    question,
    source_types: sourceTypes && sourceTypes.length > 0 ? sourceTypes : null,
  }, handlers)
}

interface IngestEvents {
  stage: IngestStageEvent
  done: { source_type?: SourceType }
}

export function streamIngestSource(
  sourceType: SourceType,
  handlers: Partial<{ [K in keyof IngestEvents]: (data: IngestEvents[K]) => void }>,
) {
  return streamPost<IngestEvents>(`${BASE}/ingest/${sourceType}`, {}, handlers)
}

export function streamIngestAll(
  handlers: Partial<{ [K in keyof IngestEvents]: (data: IngestEvents[K]) => void }>,
) {
  return streamPost<IngestEvents>(`${BASE}/ingest`, {}, handlers)
}
