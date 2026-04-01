'use client'

import { useEffect, useRef, useState } from 'react'
import type { Asset } from '@/types'

interface Props {
  asset: Asset
  x: number   // % from left
  y: number   // % from top
  prevUsdValue?: number
}

// Map USD value to orb diameter in px (min 60, max 220)
function valueToDiameter(usd: number): number {
  if (usd <= 0) return 60
  return Math.min(220, Math.max(60, 60 + Math.log10(usd + 1) * 48))
}

const GLOW_COLORS: Record<string, string> = {
  ETH:   '#6366f1',
  USDC:  '#22d3ee',
  cbBTC: '#f59e0b',
  DEGEN: '#a855f7',
  BRETT: '#3b82f6',
}

export function AssetOrb({ asset, x, y, prevUsdValue }: Props) {
  const diameter = valueToDiameter(asset.usdValue)
  const glow = GLOW_COLORS[asset.symbol] ?? '#6366f1'
  const prevDiam = valueToDiameter(prevUsdValue ?? asset.usdValue)
  const growing = diameter > prevDiam
  const shrinking = diameter < prevDiam

  const [animKey, setAnimKey] = useState(0)
  const prevRef = useRef(asset.usdValue)

  useEffect(() => {
    if (asset.usdValue !== prevRef.current) {
      prevRef.current = asset.usdValue
      setAnimKey(k => k + 1)
    }
  }, [asset.usdValue])

  const humanBalance = Number(asset.balance) / Math.pow(10, asset.decimals)

  return (
    <div
      className="absolute animate-float"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        animationDelay: `${(x * 0.1) % 3}s`,
        animationDuration: `${5 + (y * 0.05) % 3}s`,
      }}
    >
      {/* Outer glow ring */}
      <div
        key={animKey}
        className="rounded-full animate-orb-pulse flex items-center justify-center transition-all duration-700"
        style={{
          width: diameter,
          height: diameter,
          '--glow-color': `${glow}88`,
          background: `radial-gradient(circle at 35% 35%, ${glow}55, ${glow}22 60%, transparent)`,
          border: `2px solid ${glow}66`,
          boxShadow: `0 0 ${growing ? 40 : shrinking ? 10 : 20}px 4px ${glow}66`,
        } as React.CSSProperties}
      >
        {/* Inner content */}
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span
            className="font-bold text-white drop-shadow"
            style={{ fontSize: Math.max(10, diameter * 0.18) }}
          >
            {asset.symbol}
          </span>
          {diameter > 90 && (
            <span
              className="text-white/70 tabular-nums"
              style={{ fontSize: Math.max(9, diameter * 0.12) }}
            >
              ${asset.usdValue < 1 ? asset.usdValue.toFixed(4) : asset.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          )}
          {diameter > 120 && (
            <span
              className="text-white/50 tabular-nums"
              style={{ fontSize: Math.max(8, diameter * 0.1) }}
            >
              {humanBalance < 0.001 ? humanBalance.toExponential(2) : humanBalance.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
