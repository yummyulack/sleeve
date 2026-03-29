import { NextResponse } from 'next/server'
import { fetchPrices } from '@/lib/pyth'

export async function GET() {
  try {
    const prices = await fetchPrices()
    return NextResponse.json(prices)
  } catch (err) {
    console.error('[api/prices]', err)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
