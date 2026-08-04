import { useCallback, useEffect, useState } from 'react'

import { getSources } from '@/lib/api'
import type { SourceStatus } from '@/lib/types'

export function useSources() {
  const [sources, setSources] = useState<SourceStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const data = await getSources()
      setSources(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { sources, loading, refetch }
}
