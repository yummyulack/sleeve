import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

function isValidAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')

  if (!wallet || !isValidAddress(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const db = createServerSupabaseClient()
  const { data } = await db
    .from('users')
    .select('pearls')
    .eq('wallet_address', wallet)
    .single()

  return NextResponse.json({ pearls: data?.pearls ?? 0 })
}
