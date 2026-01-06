'use client'

import { FC, ReactNode, useMemo } from 'react'
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

// Import available wallet adapters
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
  LedgerWalletAdapter,
  Coin98WalletAdapter,
} from '@solana/wallet-adapter-wallets'

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet

  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Create wallet adapters - only in browser environment
  const wallets = useMemo(() => {
    if (typeof window === 'undefined') {
      return []
    }

    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TorusWalletAdapter(),
      new TrustWalletAdapter(),
      new Coin98WalletAdapter(),
      new LedgerWalletAdapter(),
    ]
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
