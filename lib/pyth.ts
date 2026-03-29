import { PYTH_PRICE_IDS } from '@/constants'
import type { PriceMap } from '@/types'

const LAZER_WS_URL = 'wss://pyth-lazer.dourolabs.app/v1/ws'
const HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest'
const WS_TIMEOUT_MS = 5000

// Maps raw Pyth price (integer + exponent) to a float
function applyExponent(price: string, expo: number): number {
  return parseInt(price) * Math.pow(10, expo)
}

// Fetch prices via Pyth Lazer Pro WebSocket (connect → snapshot → disconnect)
// Falls back to Hermes REST if the WS connection fails within the timeout
export async function fetchPrices(): Promise<PriceMap> {
  try {
    return await fetchFromLazer()
  } catch {
    console.warn('[pyth] Lazer WS failed, falling back to Hermes REST')
    return await fetchFromHermes()
  }
}

async function fetchFromLazer(): Promise<PriceMap> {
  const apiKey = process.env.PYTH_API_KEY
  if (!apiKey) throw new Error('PYTH_API_KEY not set')

  const ids = Object.values(PYTH_PRICE_IDS)

  return new Promise<PriceMap>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Lazer WS timeout'))
    }, WS_TIMEOUT_MS)

    const ws = new WebSocket(`${LAZER_WS_URL}?api-key=${apiKey}`)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        ids,
        properties: ['price', 'exponent', 'conf'],
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string)
        // Accept the first snapshot message that contains price data
        if (data.type === 'snapshot' || (data.parsed && Array.isArray(data.parsed))) {
          clearTimeout(timeout)
          ws.close()
          resolve(parseLazerResponse(data))
        }
      } catch {
        // ignore malformed messages, wait for next
      }
    }

    ws.onerror = () => {
      clearTimeout(timeout)
      ws.close()
      reject(new Error('Lazer WS error'))
    }
  })
}

function parseLazerResponse(data: unknown): PriceMap {
  const result: PriceMap = {}
  const parsed = (data as { parsed?: unknown[] }).parsed
  if (!Array.isArray(parsed)) return result

  const symbolById = Object.fromEntries(
    Object.entries(PYTH_PRICE_IDS).map(([symbol, id]) => [id.toLowerCase(), symbol])
  )

  for (const item of parsed) {
    const entry = item as {
      id: string
      price: { price: string; expo: number; conf?: string }
      ema_price?: { price: string; expo: number }
    }
    const symbol = symbolById[entry.id?.toLowerCase()]
    if (!symbol || !entry.price) continue

    const price = applyExponent(entry.price.price, entry.price.expo)
    result[symbol] = { price, change24h: 0 }
  }

  return result
}

async function fetchFromHermes(): Promise<PriceMap> {
  const ids = Object.values(PYTH_PRICE_IDS)
  const params = ids.map((id) => `ids[]=${id}`).join('&')
  const res = await fetch(`${HERMES_URL}?${params}&parsed=true`)
  if (!res.ok) throw new Error(`Hermes fetch failed: ${res.status}`)

  const data = await res.json() as { parsed: Array<{
    id: string
    price: { price: string; expo: number }
    ema_price: { price: string; expo: number }
  }> }

  const result: PriceMap = {}
  const symbolById = Object.fromEntries(
    Object.entries(PYTH_PRICE_IDS).map(([symbol, id]) => [id.replace('0x', '').toLowerCase(), symbol])
  )

  for (const item of data.parsed) {
    const symbol = symbolById[item.id?.toLowerCase()]
    if (!symbol || !item.price) continue
    const price = applyExponent(item.price.price, item.price.expo)
    result[symbol] = { price, change24h: 0 }
  }

  return result
}
