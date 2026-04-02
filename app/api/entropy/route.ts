import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { extractEntropyValue } from '@/lib/entropy'
import { calculateBonusTier, getBonusAmount } from '@/lib/rewards'

const BONUS_COOLDOWN_HOURS = 24

function isValidAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')

  if (!wallet || !isValidAddress(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const db = createServerSupabaseClient()
  const { data: lastReward } = await db
    .from('rewards_log')
    .select('created_at')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (lastReward) {
    const elapsed = Date.now() - new Date(lastReward.created_at).getTime()
    const cooldownMs = BONUS_COOLDOWN_HOURS * 60 * 60 * 1000
    if (elapsed < cooldownMs) {
      return NextResponse.json({ remainingMs: cooldownMs - elapsed })
    }
  }

  return NextResponse.json({ remainingMs: 0 })
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

  const db = createServerSupabaseClient()

  // Cooldown check — one bonus roll per 24h per wallet
  const { data: lastReward } = await db
    .from('rewards_log')
    .select('created_at')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (lastReward) {
    const elapsed = Date.now() - new Date(lastReward.created_at).getTime()
    const cooldownMs = BONUS_COOLDOWN_HOURS * 60 * 60 * 1000
    if (elapsed < cooldownMs) {
      return NextResponse.json(
        { error: 'Bonus on cooldown', remainingMs: cooldownMs - elapsed },
        { status: 409 }
      )
    }
  }

  const { entropyValue } = await extractEntropyValue(txHash as `0x${string}`)
  const bonusTier = calculateBonusTier(entropyValue)
  const bonusAmount = getBonusAmount(bonusTier)

  // Ensure user row exists
  await db
    .from('users')
    .upsert(
      { wallet_address: walletAddress, pearls: 0, level: 1 },
      { onConflict: 'wallet_address', ignoreDuplicates: true }
    )

  const { data: user } = await db
    .from('users')
    .select('pearls')
    .eq('wallet_address', walletAddress)
    .single()

  const newPearls = (user?.pearls ?? 0) + bonusAmount
  await db.from('users').update({ pearls: newPearls }).eq('wallet_address', walletAddress)

  await db.from('rewards_log').insert({
    wallet_address: walletAddress,
    base_reward: 0,
    bonus_tier: bonusTier,
    bonus_amount: bonusAmount,
    entropy_tx_hash: txHash,
  })

  return NextResponse.json({ entropyValue, bonusTier, bonusAmount, totalPearls: newPearls })
}
