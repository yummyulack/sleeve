import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { extractEntropyValue } from '@/lib/entropy'
import { calculateBonusTier, getBonusAmount } from '@/lib/rewards'
import { BASE_QUEST_REWARD } from '@/constants'

function isValidAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { txHash, walletAddress } = body

  if (!walletAddress || !isValidAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: 'Invalid tx hash' }, { status: 400 })
  }

  const { entropyValue, randomHex } = await extractEntropyValue(txHash as `0x${string}`)
  const bonusTier = calculateBonusTier(entropyValue)
  const bonusAmount = getBonusAmount(bonusTier)

  const db = createServerSupabaseClient()

  // Add bonus Pearls on top of base already awarded in /api/quest
  const { data: user } = await db
    .from('users')
    .select('pearls')
    .eq('wallet_address', walletAddress)
    .single()

  const newPearls = (user?.pearls ?? 0) + bonusAmount
  await db.from('users').update({ pearls: newPearls }).eq('wallet_address', walletAddress)

  // Full reward log entry
  await db.from('rewards_log').insert({
    wallet_address: walletAddress,
    base_reward: BASE_QUEST_REWARD,
    bonus_tier: bonusTier,
    bonus_amount: bonusAmount,
    entropy_tx_hash: txHash,
  })

  return NextResponse.json({ entropyValue, bonusTier, bonusAmount, totalPearls: newPearls })
}
