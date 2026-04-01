'use client'

import { useEffect, useState } from 'react'
import type { QuestResult } from '@/types'

interface Props {
  result: QuestResult
  onDismiss: () => void
}

const TIER_CONFIG = {
  none: {
    label: 'Quest Complete',
    sub: 'No bonus this time',
    color: '#94a3b8',
    glow: '#94a3b855',
    emoji: '🎯',
    bg: 'from-slate-900 to-slate-800',
  },
  small: {
    label: 'Small Bonus!',
    sub: '+5 Pearls',
    color: '#22d3ee',
    glow: '#22d3ee55',
    emoji: '✨',
    bg: 'from-cyan-950 to-slate-900',
  },
  rare: {
    label: 'Rare Drop!',
    sub: '+20 Pearls',
    color: '#a855f7',
    glow: '#a855f766',
    emoji: '💎',
    bg: 'from-purple-950 to-slate-900',
  },
  jackpot: {
    label: 'JACKPOT!',
    sub: '+50 Pearls',
    color: '#f59e0b',
    glow: '#f59e0b88',
    emoji: '🏆',
    bg: 'from-yellow-950 to-slate-900',
  },
}

export function RewardReveal({ result, onDismiss }: Props) {
  const cfg = TIER_CONFIG[result.bonusTier]
  const total = result.baseReward + result.bonusAmount
  const [particles, setParticles] = useState<number[]>([])

  useEffect(() => {
    if (result.bonusTier !== 'none') {
      setParticles(Array.from({ length: result.bonusTier === 'jackpot' ? 16 : 8 }, (_, i) => i))
    }
  }, [result.bonusTier])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm"
      onClick={onDismiss}
    >
      {/* Particle burst */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {particles.map(i => (
          <div
            key={i}
            className="absolute animate-particle text-xl"
            style={{
              animationDelay: `${i * 0.06}s`,
              transform: `rotate(${i * (360 / particles.length)}deg) translateY(-80px)`,
            }}
          >
            {cfg.emoji}
          </div>
        ))}
      </div>

      {/* Card */}
      <div
        className={`relative animate-slam bg-gradient-to-b ${cfg.bg} border rounded-3xl p-8 flex flex-col items-center gap-4 min-w-[280px]`}
        style={{ borderColor: cfg.color + '44', boxShadow: `0 0 60px 10px ${cfg.glow}` }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={result.bonusTier === 'jackpot' ? 'animate-jackpot text-6xl' : 'text-6xl'}
        >
          {cfg.emoji}
        </div>

        <div className="text-center">
          <p className="font-bold text-2xl" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-zinc-400 text-sm mt-1">{cfg.sub}</p>
        </div>

        <div className="flex flex-col items-center gap-1 bg-black/30 rounded-2xl px-6 py-3 w-full text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-widest">Total earned</p>
          <p className="text-white font-bold text-3xl tabular-nums">+{total} 🪙</p>
          <p className="text-zinc-400 text-xs">{result.totalPearls} total Pearls</p>
        </div>

        <button
          onClick={onDismiss}
          className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
        >
          Awesome!
        </button>
      </div>
    </div>
  )
}
