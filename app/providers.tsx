'use client'

import { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const wagmiConfig = getDefaultConfig({
  appName: 'Sleeve',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base],
})

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures a single QueryClient instance per component lifecycle,
  // preventing shared state across server renders
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
