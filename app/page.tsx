'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { usePrices } from '@/hooks/usePrices'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useQuest } from '@/hooks/useQuest'
import { AquariumScene } from '@/components/aquarium/AquariumScene'
import { PearlCounter } from '@/components/hud/PearlCounter'
import { WalletBadge } from '@/components/hud/WalletBadge'
import { Leaderboard } from '@/components/hud/Leaderboard'
import { QuestButton } from '@/components/quest/QuestButton'
import { RollAnimation } from '@/components/quest/RollAnimation'
import { RewardReveal } from '@/components/quest/RewardReveal'
import type { QuestResult } from '@/types'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { prices } = usePrices()
  const portfolio = usePortfolio(prices)
  const { entries: leaderboard, refresh: refreshLeaderboard } = useLeaderboard()
  const [pearls, setPearls] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [lastResult, setLastResult] = useState<QuestResult | null>(null)

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

  const { runQuest, phase, result, error, cooldownMs, reset } = useQuest((questResult) => {
    setLastResult(questResult)
    setPearls(questResult.totalPearls)
    setShowReward(true)
    refreshLeaderboard()
  })

  const handleDismiss = () => {
    setShowReward(false)
    reset()
  }

  const isRolling = phase === 'signing' || phase === 'resolving'

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#03060f]">

      {/* Full-screen aquarium */}
      <AquariumScene assets={portfolio} />

      {/* HUD — top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <WalletBadge />
          {isConnected && <PearlCounter pearls={pearls} />}
        </div>
        <Leaderboard entries={leaderboard} />
      </div>

      {/* Quest panel — bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
        {isRolling && <RollAnimation />}
        {!isRolling && isConnected && (
          <QuestButton phase={phase} cooldownMs={cooldownMs} onRun={runQuest} />
        )}
        {!isConnected && (
          <p className="text-zinc-600 text-sm">Connect wallet to play</p>
        )}
        {error && (
          <p className="text-red-400 text-xs max-w-[240px] text-center">{error}</p>
        )}
      </div>

      {/* Reward reveal overlay */}
      {showReward && lastResult && (
        <RewardReveal result={lastResult} onDismiss={handleDismiss} />
      )}
    </div>
  )
}
