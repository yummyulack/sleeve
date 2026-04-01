'use client'

import { useAccount } from 'wagmi'
import { ConnectButton as RainbowConnect } from '@rainbow-me/rainbowkit'

export function WalletBadge() {
  const { address, isConnected } = useAccount()

  if (!isConnected || !address) {
    return <RainbowConnect />
  }

  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_#34d39988]" />
      <span className="text-white font-mono text-sm">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <span className="text-zinc-500 text-xs">Base</span>
    </div>
  )
}
