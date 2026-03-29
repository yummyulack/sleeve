'use client'

import { useEffect, useState } from 'react'
import type { PriceMap } from '@/types'

const POLL_INTERVAL_MS = 10_000

export function usePrices() {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: PriceMap = await res.json()
        if (!cancelled) {
          setPrices(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch prices')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { prices, loading, error }
}
