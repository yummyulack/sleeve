import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { BASE_QUEST_REWARD } from '@/constants'

function isValidAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { walletAddress } = body

  if (!walletAddress || !isValidAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const db = createServerSupabaseClient()

  // Fetch the one daily quest
  const { data: quest, error: questErr } = await db
    .from('quests')
    .select('id, base_reward, cooldown_hours')
    .eq('name', 'Daily Quest')
    .single()

  if (questErr || !quest) {
    console.error('[api/quest] quest not found', questErr)
    return NextResponse.json({ error: 'Quest not found' }, { status: 500 })
  }

  // Ensure user row exists (no-op if already created)
  await db
    .from('users')
    .upsert(
      { wallet_address: walletAddress, pearls: 0, level: 1 },
      { onConflict: 'wallet_address', ignoreDuplicates: true }
    )

  // Cooldown check
  const { data: lastEntry } = await db
    .from('user_quests')
    .select('completed_at')
    .eq('wallet_address', walletAddress)
    .eq('quest_id', quest.id)
    .single()

  if (lastEntry && quest.cooldown_hours > 0) {
    const elapsed = Date.now() - new Date(lastEntry.completed_at).getTime()
    const cooldownMs = quest.cooldown_hours * 60 * 60 * 1000
    if (elapsed < cooldownMs) {
      return NextResponse.json(
        { error: 'Quest on cooldown', remainingMs: cooldownMs - elapsed },
        { status: 409 }
      )
    }
  }

  // Mark quest as used (upsert updates completed_at for repeats)
  await db.from('user_quests').upsert(
    {
      wallet_address: walletAddress,
      quest_id: quest.id,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'wallet_address,quest_id' }
  )

  // Award base Pearls
  const { data: user } = await db
    .from('users')
    .select('pearls')
    .eq('wallet_address', walletAddress)
    .single()

  const totalPearls = (user?.pearls ?? 0) + BASE_QUEST_REWARD
  await db
    .from('users')
    .update({ pearls: totalPearls })
    .eq('wallet_address', walletAddress)

  return NextResponse.json({ baseReward: BASE_QUEST_REWARD, totalPearls })
}
