'use client'

import type { LeaderboardEntry } from '@/types'

interface Props {
  entries: LeaderboardEntry[]
}

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard({ entries }: Props) {
  if (entries.length === 0) return null

  const top3 = entries.slice(0, 3)

  return (
    <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-3 min-w-[180px]">
      <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2 px-1">Leaderboard</p>
      <div className="flex flex-col gap-1">
        {top3.map((entry, i) => (
          <div key={entry.wallet_address} className="flex items-center justify-between gap-3 px-1">
            <span className="text-base">{MEDALS[i]}</span>
            <span className="text-white font-mono text-xs flex-1 truncate">
              {entry.wallet_address.slice(0, 6)}…{entry.wallet_address.slice(-4)}
            </span>
            <span className="text-yellow-400 text-xs font-bold">{entry.pearls}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
