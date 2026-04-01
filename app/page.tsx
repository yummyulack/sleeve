'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { usePrices } from '@/hooks/usePrices'
import { usePortfolio } from '@/hooks/usePortfolio'
import { AquariumScene } from '@/components/aquarium/AquariumScene'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { TopBar } from '@/components/hud/TopBar'
import { QuestPanel } from '@/components/quest/QuestPanel'
import { TRACKED_TOKENS, DEMO_ASSET_BALANCES } from '@/constants'
import type { Asset, QuestResult } from '@/types'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { prices } = usePrices()
  const assets = usePortfolio(prices)
  const [pearls, setPearls] = useState(0)

  // Load pearl count from Supabase when wallet connects
  useEffect(() => {
    if (!address) return
    supabase
      .from('users')
      .select('pearls')
      .eq('wallet_address', address)
      .single()
      .then(({ data }) => { if (data) setPearls(data.pearls) })
  }, [address])

  // Demo fallback: when wallet is connected but holds none of the tracked tokens,
  // show plausible fake balances so the aquarium never looks empty during a demo.
  const displayAssets = useMemo<Asset[]>(() => {
    if (!isConnected || assets.length > 0) return assets
    const demo: Asset[] = []
    for (const token of TRACKED_TOKENS) {
      const bal = DEMO_ASSET_BALANCES[token.symbol]
      if (!bal) continue
      const humanBalance = Number(bal.balance) / Math.pow(10, bal.decimals)
      const priceData = prices[token.symbol]
      const usdValue = priceData ? humanBalance * priceData.price : 0
      demo.push({
        symbol: token.symbol,
        name: token.name,
        address: token.address as string | null,
        balance: bal.balance,
        decimals: bal.decimals,
        usdValue,
        logoPath: token.logoPath,
      })
    }
    return demo
  }, [isConnected, assets, prices])

  const handleQuestComplete = useCallback((result: QuestResult) => {
    setPearls(result.totalPearls)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#03060f]">

      {/* Full-screen aquarium — error boundary prevents PixiJS crash from white-screening */}
      <ErrorBoundary>
        <AquariumScene prices={prices} assets={displayAssets} />
      </ErrorBoundary>

      {/* HUD — top bar */}
      <TopBar />

      {/* Quest panel — bottom-right corner */}
      <QuestPanel
        pearls={pearls}
        isConnected={isConnected}
        onQuestComplete={handleQuestComplete}
      />

    </div>
  )
}
