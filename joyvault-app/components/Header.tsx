'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Header() {
  return (
    <header className="w-full border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">JoyVault</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <WalletMultiButton />
          </nav>
        </div>
      </div>
    </header>
  )
}
