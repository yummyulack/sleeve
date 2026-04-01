'use client'

import { useEffect, useState } from 'react'

const SYMBOLS = ['🔮', '⚡', '💎', '🌊', '🪩', '✨', '🎲', '🌀']

export function RollAnimation() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % SYMBOLS.length)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{
          background: 'radial-gradient(circle, #6366f133, #0d1a2d)',
          border: '2px solid #6366f166',
          boxShadow: '0 0 40px 8px #6366f144',
        }}
      >
        {SYMBOLS[index]}
      </div>
      <p className="text-zinc-400 text-sm tracking-widest uppercase animate-pulse">
        Rolling...
      </p>
    </div>
  )
}
