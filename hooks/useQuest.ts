'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { ENTROPY_ABI, generateUserRandomness, ENTROPY_PROVIDER_ADDRESS } from '@/lib/entropy'
import { ENTROPY_CONTRACT_ADDRESS } from '@/constants'
import type { QuestResult, BonusTier } from '@/types'

// ─── Daily Claim ─────────────────────────────────────────────────────────────

export type ClaimPhase = 'idle' | 'claiming' | 'done' | 'error'

export function useDailyClaim(onComplete?: (baseReward: number, totalPearls: number) => void) {
  const { address } = useAccount()
  const [phase, setPhase] = useState<ClaimPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number | null>(null)

  const claim = useCallback(async () => {
    if (!address || phase !== 'idle') return
    setError(null)

    try {
      setPhase('claiming')
      const res = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      const body = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setCooldownMs(body.remainingMs ?? null)
          setPhase('idle')
          return
        }
        throw new Error(body.error ?? 'Quest failed')
      }

      setPhase('done')
      onComplete?.(body.baseReward, body.totalPearls)
    } catch (err) {
      console.error('[useDailyClaim]', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }, [address, phase, onComplete])

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
    setCooldownMs(null)
  }, [])

  return { claim, phase, error, cooldownMs, reset }
}

// ─── Bonus Quest (Entropy roll) ───────────────────────────────────────────────

export type QuestPhase =
  | 'idle'
  | 'signing'        // waiting for user to sign Entropy tx
  | 'resolving'      // POST /api/entropy, polling for Revealed
  | 'done'           // result ready
  | 'error'

export function useBonusQuest(onComplete?: (result: QuestResult) => void) {
  const { address } = useAccount()
  const [phase, setPhase] = useState<QuestPhase>('idle')
  const [result, setResult] = useState<QuestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number | null>(null)

  const { writeContractAsync } = useWriteContract()

  const { data: entropyFee } = useReadContract({
    address: ENTROPY_CONTRACT_ADDRESS,
    abi: ENTROPY_ABI,
    functionName: 'getFee',
    args: [ENTROPY_PROVIDER_ADDRESS],
  })

  // Check bonus cooldown on mount / when address changes
  useEffect(() => {
    if (!address) return
    fetch(`/api/entropy?wallet=${address}`)
      .then(r => r.json())
      .then(data => { if (data.remainingMs > 0) setCooldownMs(data.remainingMs) })
      .catch(() => {})
  }, [address])

  const roll = useCallback(async () => {
    if (!address || phase !== 'idle') return
    setError(null)
    setResult(null)

    try {
      // Sign the Entropy request tx
      setPhase('signing')
      const userRandomness = generateUserRandomness()
      const fee = entropyFee ?? parseEther('0.0001')

      const txHash = await writeContractAsync({
        address: ENTROPY_CONTRACT_ADDRESS,
        abi: ENTROPY_ABI,
        functionName: 'request',
        args: [ENTROPY_PROVIDER_ADDRESS, userRandomness, false],
        value: fee as bigint,
      })

      // Resolve entropy on server (polls for Revealed event)
      setPhase('resolving')
      const res = await fetch('/api/entropy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, walletAddress: address }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setCooldownMs(data.remainingMs ?? null)
          setPhase('idle')
          return
        }
        throw new Error(data.error ?? 'Entropy resolution failed')
      }

      const questResult: QuestResult = {
        baseReward: 0,
        bonusTier: data.bonusTier as BonusTier,
        bonusAmount: data.bonusAmount,
        totalPearls: data.totalPearls,
        entropyTxHash: txHash,
      }

      setResult(questResult)
      setPhase('done')
      onComplete?.(questResult)
    } catch (err) {
      console.error('[useBonusQuest]', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }, [address, phase, entropyFee, writeContractAsync, onComplete])

  const reset = useCallback(() => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setCooldownMs(null)
  }, [])

  return { roll, phase, result, error, cooldownMs, reset }
}

// Re-export for any existing code that imports useQuest
export function useQuest(onComplete?: (result: QuestResult) => void) {
  return useBonusQuest(onComplete)
}
