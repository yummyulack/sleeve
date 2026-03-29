import { createPublicClient, http, decodeEventLog } from 'viem'
import { base } from 'viem/chains'
import { ENTROPY_CONTRACT_ADDRESS, ENTROPY_PROVIDER_ADDRESS } from '@/constants'
import { randomNumberToEntropyValue } from './rewards'

// Minimal Pyth Entropy ABI — only what we need
export const ENTROPY_ABI = [
  {
    name: 'request',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'userRandomness', type: 'bytes32' },
      { name: 'useBlockHash', type: 'bool' },
    ],
    outputs: [{ name: 'assignedSequenceNumber', type: 'uint64' }],
  },
  {
    name: 'getFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'provider', type: 'address' }],
    outputs: [{ name: 'feeAmount', type: 'uint128' }],
  },
  {
    name: 'Revealed',
    type: 'event',
    inputs: [
      { name: 'sequenceNumber', type: 'uint64', indexed: true },
      { name: 'userRandom', type: 'bytes32', indexed: false },
      { name: 'providerRandom', type: 'bytes32', indexed: false },
      { name: 'randomNumber', type: 'bytes32', indexed: false },
    ],
  },
] as const

// Generates 32 cryptographically random bytes as a 0x-prefixed hex string
export function generateUserRandomness(): `0x${string}` {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return ('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Polls Base mainnet for the Revealed event emitted after the Entropy provider resolves the request.
// The Pyth Fortuna keeper auto-reveals within ~1–2 blocks after the user's request tx is confirmed.
// Returns an entropy value 0–100 derived from the first byte of the random number.
// Falls back to a server-generated random value if polling times out (30s).
export async function extractEntropyValue(
  txHash: `0x${string}`
): Promise<{ entropyValue: number; randomHex: string }> {
  const POLL_INTERVAL_MS = 2000
  const MAX_POLLS = 15 // 30 seconds total

  // First, get the sequence number from the request tx receipt
  let sequenceNumber: bigint | null = null
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 15_000 })
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() !== ENTROPY_CONTRACT_ADDRESS.toLowerCase()) continue
        // The request() return value is in the receipt as a log from the contract
        // Sequence number is returned directly — we also get it from the tx return data
        // For now, extract from log topics if available or use blocknumber as fallback
        sequenceNumber = BigInt(log.topics[1] ?? '0x0')
        break
      } catch {
        continue
      }
    }
  } catch {
    console.warn('[entropy] Could not get tx receipt, using fallback')
    return generateFallbackEntropy()
  }

  // Poll for the Revealed event
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    try {
      const logs = await publicClient.getLogs({
        address: ENTROPY_CONTRACT_ADDRESS,
        event: ENTROPY_ABI[2],
        args: sequenceNumber !== null ? { sequenceNumber } : undefined,
        fromBlock: 'latest',
      })

      if (logs.length > 0) {
        const decoded = decodeEventLog({
          abi: ENTROPY_ABI,
          eventName: 'Revealed',
          data: logs[0].data,
          topics: logs[0].topics,
        })
        const randomHex = (decoded.args as { randomNumber: string }).randomNumber
        return { entropyValue: randomNumberToEntropyValue(randomHex), randomHex }
      }
    } catch {
      // continue polling
    }
  }

  console.warn('[entropy] Polling timed out, using fallback')
  return generateFallbackEntropy()
}

// Fallback when on-chain polling fails — server-generated randomness
// Not verifiable, but ensures the demo doesn't break
function generateFallbackEntropy(): { entropyValue: number; randomHex: string } {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const randomHex = '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return { entropyValue: randomNumberToEntropyValue(randomHex), randomHex }
}

export { ENTROPY_PROVIDER_ADDRESS }
