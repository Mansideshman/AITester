import { useCallback, useState } from 'react'

import { streamIngestSource } from '@/lib/api'
import type { SourceType } from '@/lib/types'

export type IngestStatus = 'idle' | 'running' | 'done' | 'error'

export function useIngestSource(sourceType: SourceType) {
  const [status, setStatus] = useState<IngestStatus>('idle')
  const [stageLabel, setStageLabel] = useState<string | null>(null)
  const [chunkCount, setChunkCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setStatus('running')
    setError(null)
    setChunkCount(null)
    try {
      await streamIngestSource(sourceType, {
        stage: (data) => {
          if (data.stage === 'error') {
            setStatus('error')
            setError(data.message ?? 'Ingestion failed')
            return
          }
          setStageLabel(data.stage)
          if (typeof data.chunk_count === 'number') setChunkCount(data.chunk_count)
        },
        done: () => setStatus((s) => (s === 'error' ? s : 'done')),
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Ingestion failed')
    }
  }, [sourceType])

  return { status, stageLabel, chunkCount, error, run }
}
