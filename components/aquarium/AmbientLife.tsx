'use client'

import { useMemo } from 'react'

const FISH_EMOJIS = ['🐠', '🐟', '🐡', '🦈', '🐙']

interface Fish {
  id: number
  emoji: string
  y: number        // % from top
  duration: number // seconds
  delay: number
  direction: 'right' | 'left'
  size: number
}

interface Bubble {
  id: number
  x: number
  duration: number
  delay: number
  size: number
}

export function AmbientLife() {
  const fish = useMemo<Fish[]>(() => (
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      emoji: FISH_EMOJIS[i % FISH_EMOJIS.length],
      y: 15 + (i * 11) % 55,
      duration: 18 + (i * 7) % 20,
      delay: -(i * 5),
      direction: i % 2 === 0 ? 'right' : 'left',
      size: 20 + (i * 6) % 16,
    }))
  ), [])

  const bubbles = useMemo<Bubble[]>(() => (
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 5 + (i * 8) % 90,
      duration: 8 + (i * 3) % 8,
      delay: -(i * 2),
      size: 6 + (i * 3) % 10,
    }))
  ), [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Fish */}
      {fish.map(f => (
        <div
          key={f.id}
          className={f.direction === 'right' ? 'animate-swim-right' : 'animate-swim-left'}
          style={{
            position: 'absolute',
            top: `${f.y}%`,
            fontSize: f.size,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Bubbles */}
      {bubbles.map(b => (
        <div
          key={b.id}
          className="animate-bubble absolute rounded-full border border-white/20 bg-white/5"
          style={{
            left: `${b.x}%`,
            bottom: 80,
            width: b.size,
            height: b.size,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
