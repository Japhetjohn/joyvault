'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

// Dynamically import WalletMultiButton with no SSR to prevent hydration issues
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export default function Header() {
  const [logoError, setLogoError] = useState(false)

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 group">
            {!logoError ? (
              <Image
                src="/logo.png"
                alt="JoyVault Logo"
                width={40}
                height={40}
                className="group-hover:scale-110 transition-transform"
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                </svg>
              </div>
            )}
            <h1 className="text-2xl font-bold gradient-text">JoyVault</h1>
          </Link>
          <nav className="flex items-center space-x-4">
            <WalletMultiButton />
          </nav>
        </div>
      </div>
    </header>
  )
}
