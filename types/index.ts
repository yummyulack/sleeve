export type BonusTier = 'none' | 'small' | 'rare' | 'jackpot'

export interface PriceData {
  price: number
  change24h: string  // formatted percentage e.g. "+1.24%" or "-0.87%"
}

export type PriceMap = Record<string, PriceData>

export interface Asset {
  symbol: string
  name: string
  address: string | null  // null = native ETH
  balance: bigint
  decimals: number
  usdValue: number
  logoPath: string
}

export interface QuestResult {
  baseReward: number
  bonusTier: BonusTier
  bonusAmount: number
  totalPearls: number
  entropyTxHash: string
}

export interface LeaderboardEntry {
  wallet_address: string
  pearls: number
  level: number
}
