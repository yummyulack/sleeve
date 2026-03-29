'use client'

import { ConnectButton } from '@/components/ui/ConnectButton'
import { useAccount } from 'wagmi'
import { usePrices } from '@/hooks/usePrices'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useQuest } from '@/hooks/useQuest'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { prices, loading: pricesLoading } = usePrices()
  const portfolio = usePortfolio(prices)
  const { entries: leaderboard } = useLeaderboard()
  const { runQuest, phase, result, error, cooldownMs } = useQuest()

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-black text-white p-8 font-mono text-sm">
      <h1 className="text-2xl font-bold">Phase 4 Debug</h1>

      <ConnectButton />

      {/* Prices */}
      <section>
        <h2 className="text-zinc-400 mb-1">usePrices {pricesLoading && '(loading...)'}</h2>
        <pre className="bg-zinc-900 p-3 rounded">{JSON.stringify(prices, null, 2)}</pre>
      </section>

      {/* Portfolio */}
      {isConnected && (
        <section>
          <h2 className="text-zinc-400 mb-1">usePortfolio ({address?.slice(0, 8)}...)</h2>
          <pre className="bg-zinc-900 p-3 rounded">
            {portfolio.length === 0
              ? 'No assets found (zero balances hidden)'
              : JSON.stringify(portfolio.map(a => ({
                  symbol: a.symbol,
                  balance: a.balance.toString(),
                  usdValue: a.usdValue.toFixed(2),
                })), null, 2)}
          </pre>
        </section>
      )}

      {/* Quest */}
      {isConnected && (
        <section>
          <h2 className="text-zinc-400 mb-1">useQuest</h2>
          <div className="bg-zinc-900 p-3 rounded flex flex-col gap-2">
            <p>Phase: <span className="text-yellow-400">{phase}</span></p>
            {cooldownMs && <p className="text-red-400">On cooldown — {Math.ceil(cooldownMs / 60000)}m remaining</p>}
            {error && <p className="text-red-400">Error: {error}</p>}
            {result && (
              <pre className="text-green-400">{JSON.stringify(result, null, 2)}</pre>
            )}
            <button
              onClick={runQuest}
              disabled={phase !== 'idle' && phase !== 'error'}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded w-fit"
            >
              {phase === 'idle' || phase === 'error' ? 'Run Quest' : `${phase}...`}
            </button>
          </div>
        </section>
      )}

      {/* Leaderboard */}
      <section>
        <h2 className="text-zinc-400 mb-1">useLeaderboard</h2>
        <pre className="bg-zinc-900 p-3 rounded">
          {leaderboard.length === 0 ? '[]' : JSON.stringify(leaderboard, null, 2)}
        </pre>
      </section>
    </div>
  )
}
