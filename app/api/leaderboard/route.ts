import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('users')
    .select('wallet_address, pearls, level')
    .order('pearls', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[api/leaderboard]', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  return NextResponse.json(data)
}
