'use client'

import { useEffect, useState, useCallback } from 'react'
import type { LeaderboardEntry } from '@/types'

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (!res.ok) return
      const data: LeaderboardEntry[] = await res.json()
      setEntries(data)
    } catch {
      // silently fail — leaderboard is non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { entries, loading, refresh }
}
