'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  pearls: number
}

export function PearlCounter({ pearls }: Props) {
  const [displayed, setDisplayed] = useState(pearls)
  const [popping, setPopping] = useState(false)
  const prevRef = useRef(pearls)

  useEffect(() => {
    if (pearls === prevRef.current) return
    prevRef.current = pearls

    // Tick up from old value to new value
    const diff = pearls - displayed
    if (diff <= 0) { setDisplayed(pearls); return }

    const steps = Math.min(diff, 30)
    const stepSize = diff / steps
    let current = displayed
    let i = 0

    const interval = setInterval(() => {
      i++
      current += stepSize
      setDisplayed(Math.round(i === steps ? pearls : current))
      if (i >= steps) {
        clearInterval(interval)
        setPopping(true)
        setTimeout(() => setPopping(false), 400)
      }
    }, 30)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pearls])

  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
      <span
        className={`text-2xl transition-transform ${popping ? 'animate-pearl-pop' : ''}`}
        style={{ display: 'inline-block' }}
      >
        🪙
      </span>
      <span className="text-white font-bold text-lg tabular-nums">{displayed}</span>
      <span className="text-zinc-400 text-sm">Pearls</span>
    </div>
  )
}
