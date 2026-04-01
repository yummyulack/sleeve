'use client'

import { useRef } from 'react'
import { AssetOrb } from './AssetOrb'
import { AmbientLife } from './AmbientLife'
import { SeabedLayer } from './SeabedLayer'
import type { Asset } from '@/types'

interface Props {
  assets: Asset[]
}

// Deterministic positions per symbol so orbs don't jump around on re-render
const POSITIONS: Record<string, { x: number; y: number }> = {
  ETH:   { x: 30, y: 35 },
  USDC:  { x: 55, y: 50 },
  cbBTC: { x: 70, y: 28 },
  DEGEN: { x: 20, y: 55 },
  BRETT: { x: 80, y: 55 },
}

function fallbackPosition(index: number) {
  return { x: 20 + (index * 18) % 65, y: 25 + (index * 13) % 45 }
}

export function AquariumScene({ assets }: Props) {
  const prevValues = useRef<Record<string, number>>({})

  return (
    <div className="absolute inset-0 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0a1628 0%, #03060f 60%)',
      }}
    >
      {/* Caustic light rays from top */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(105deg, transparent 0%, transparent 8%, rgba(99,102,241,0.03) 9%, transparent 10%)',
        }}
      />

      <AmbientLife />

      {/* Asset orbs */}
      {assets.map((asset, i) => {
        const pos = POSITIONS[asset.symbol] ?? fallbackPosition(i)
        const prev = prevValues.current[asset.symbol]
        prevValues.current[asset.symbol] = asset.usdValue
        return (
          <AssetOrb
            key={asset.symbol}
            asset={asset}
            x={pos.x}
            y={pos.y}
            prevUsdValue={prev}
          />
        )
      })}

      {/* Empty state */}
      {assets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-zinc-600 text-sm">Connect wallet to see your assets</p>
        </div>
      )}

      <SeabedLayer />
    </div>
  )
}
