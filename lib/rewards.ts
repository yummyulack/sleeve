import { BONUS_TIERS } from '@/constants'
import type { BonusTier } from '@/types'

export function calculateBonusTier(entropyValue: number): BonusTier {
  if (entropyValue <= 60) return 'none'
  if (entropyValue <= 90) return 'small'
  if (entropyValue <= 99) return 'rare'
  return 'jackpot'
}

export function getBonusAmount(tier: BonusTier): number {
  return BONUS_TIERS[tier].amount
}

// Maps a bytes32 random number (hex string) to an integer 0–100
export function randomNumberToEntropyValue(randomHex: string): number {
  const firstByte = parseInt(randomHex.slice(2, 4), 16) // 0–255
  return Math.round((firstByte / 255) * 100)
}
