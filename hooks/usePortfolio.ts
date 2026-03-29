'use client'

import { useMemo } from 'react'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { TRACKED_TOKENS } from '@/constants'
import type { Asset, PriceMap } from '@/types'

// Build one asset entry per tracked token, merging on-chain balance with live price
export function usePortfolio(prices: PriceMap): Asset[] {
  const { address } = useAccount()

  // ETH native balance
  const { data: ethBalance } = useBalance({ address })

  // USDC balance
  const { data: usdcBalance } = useReadContract({
    address: TRACKED_TOKENS[1].address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // cbBTC balance
  const { data: cbBtcBalance } = useReadContract({
    address: TRACKED_TOKENS[2].address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // DEGEN balance
  const { data: degenBalance } = useReadContract({
    address: TRACKED_TOKENS[3].address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // BRETT balance
  const { data: brettBalance } = useReadContract({
    address: TRACKED_TOKENS[4].address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const rawBalances = [
    ethBalance?.value ?? 0n,
    usdcBalance ?? 0n,
    cbBtcBalance ?? 0n,
    degenBalance ?? 0n,
    brettBalance ?? 0n,
  ]

  return useMemo(() => {
    if (!address) return []

    return TRACKED_TOKENS.map((token, i) => {
      const balance = rawBalances[i] as bigint
      const humanBalance = Number(balance) / Math.pow(10, token.decimals)
      // Look up price by symbol — DEGEN/BRETT have no Pyth feed so usdValue = 0
      const priceData = prices[token.symbol]
      const usdValue = priceData ? humanBalance * priceData.price : 0

      return {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        balance,
        decimals: token.decimals,
        usdValue,
        logoPath: token.logoPath,
      } satisfies Asset
    }).filter(a => a.balance > 0n || a.usdValue > 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, prices, ...rawBalances])
}
