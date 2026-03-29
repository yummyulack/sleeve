import type { BonusTier } from '@/types'

export const SUPPORTED_CHAIN_ID = 8453 // Base mainnet

export const ENTROPY_CONTRACT_ADDRESS = '0x6e7d74fa7d5c90fef9f0512987605a6d546181bb' as const

// Pyth Entropy provider address on Base mainnet
export const ENTROPY_PROVIDER_ADDRESS = '0x52DeaA1c84233F7bb8C8A45baeDE41091c616506' as const

export const TRACKED_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: null,
    decimals: 18,
    logoPath: '/assets/coins/eth.png',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as const,
    decimals: 6,
    logoPath: '/assets/coins/usdc.png',
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase BTC',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf' as const,
    decimals: 8,
    logoPath: '/assets/coins/cbbtc.png',
  },
  {
    symbol: 'DEGEN',
    name: 'Degen',
    address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed' as const,
    decimals: 18,
    logoPath: '/assets/coins/degen.png',
  },
  {
    symbol: 'BRETT',
    name: 'Brett',
    address: '0x532f27101965dd16442e59d40670faf5ebb142e4' as const,
    decimals: 18,
    logoPath: '/assets/coins/brett.png',
  },
] as const

// Pyth price feed IDs (hex) for Hermes/Lazer
export const PYTH_PRICE_IDS: Record<string, string> = {
  ETH:   '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  USDC:  '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  cbBTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  // DEGEN + BRETT do not have official Pyth price feeds — USD value shown as 0
}

export const BONUS_TIERS: Record<BonusTier, { min: number; max: number; amount: number; label: string }> = {
  none:    { min: 0,   max: 60,  amount: 0,  label: 'No Bonus' },
  small:   { min: 61,  max: 90,  amount: 5,  label: '+5 Pearls' },
  rare:    { min: 91,  max: 99,  amount: 20, label: '+20 Pearls' },
  jackpot: { min: 100, max: 100, amount: 50, label: 'JACKPOT! +50 Pearls' },
}

export const BASE_QUEST_REWARD = 10
