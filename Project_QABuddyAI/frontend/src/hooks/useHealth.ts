import { useEffect, useState } from 'react'

import { getHealth } from '@/lib/api'
import type { HealthResponse } from '@/lib/types'

export function useHealth(pollMs = 30_000) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchHealth = async () => {
      try {
        const data = await getHealth()
        if (!cancelled) {
          setHealth(data)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('unreachable')
      }
    }

    fetchHealth()
    const id = setInterval(fetchHealth, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs])

  return { health, error }
}
