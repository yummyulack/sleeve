'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { ENTROPY_ABI, generateUserRandomness, ENTROPY_PROVIDER_ADDRESS } from '@/lib/entropy'
import { ENTROPY_CONTRACT_ADDRESS } from '@/constants'
import type { QuestResult, BonusTier } from '@/types'

export type QuestPhase =
  | 'idle'
  | 'claiming'       // POST /api/quest in progress
  | 'signing'        // waiting for user to sign Entropy tx
  | 'resolving'      // POST /api/entropy, polling for Revealed
  | 'done'           // result ready
  | 'error'

export function useQuest(onComplete?: (result: QuestResult) => void) {
  const { address } = useAccount()
  const [phase, setPhase] = useState<QuestPhase>('idle')
  const [result, setResult] = useState<QuestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number | null>(null)

  const { writeContractAsync } = useWriteContract()

  // Read the entropy fee from the contract so we know how much ETH to send
  const { data: entropyFee } = useReadContract({
    address: ENTROPY_CONTRACT_ADDRESS,
    abi: ENTROPY_ABI,
    functionName: 'getFee',
    args: [ENTROPY_PROVIDER_ADDRESS],
  })

  const runQuest = useCallback(async () => {
    if (!address || phase !== 'idle') return
    setError(null)
    setResult(null)

    try {
      // Step 1: validate cooldown + award base Pearls server-side
      setPhase('claiming')
      const questRes = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      if (!questRes.ok) {
        const body = await questRes.json()
        if (questRes.status === 409) {
          setCooldownMs(body.remainingMs ?? null)
          setPhase('idle')
          return
        }
        throw new Error(body.error ?? 'Quest failed')
      }

      // Step 2: sign the Entropy request tx
      setPhase('signing')
      const userRandomness = generateUserRandomness()
      const fee = entropyFee ?? parseEther('0.0001') // fallback 0.0001 ETH

      const txHash = await writeContractAsync({
        address: ENTROPY_CONTRACT_ADDRESS,
        abi: ENTROPY_ABI,
        functionName: 'request',
        args: [ENTROPY_PROVIDER_ADDRESS, userRandomness, false],
        value: fee as bigint,
      })

      // Step 3: resolve entropy on server (polls for Revealed event)
      setPhase('resolving')
      const entropyRes = await fetch('/api/entropy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, walletAddress: address }),
      })

      if (!entropyRes.ok) {
        const body = await entropyRes.json()
        throw new Error(body.error ?? 'Entropy resolution failed')
      }

      const data = await entropyRes.json()
      const questResult: QuestResult = {
        baseReward: 10,
        bonusTier: data.bonusTier as BonusTier,
        bonusAmount: data.bonusAmount,
        totalPearls: data.totalPearls,
        entropyTxHash: txHash,
      }

      setResult(questResult)
      setPhase('done')
      onComplete?.(questResult)
    } catch (err) {
      console.error('[useQuest]', err)
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

  return { runQuest, reset, phase, result, error, cooldownMs }
}
