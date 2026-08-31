import { useCallback, useState } from 'react'

import { streamIngestAll } from '@/lib/api'
import type { IngestStageEvent } from '@/lib/types'

export function useIngestAll() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<IngestStageEvent[]>([])

  const run = useCallback(async () => {
    setRunning(true)
    setLog([])
    try {
      await streamIngestAll({
        stage: (data) => setLog((prev) => [...prev, data]),
        done: () => setRunning(false),
      })
    } finally {
      setRunning(false)
    }
  }, [])

  return { running, log, run }
}
