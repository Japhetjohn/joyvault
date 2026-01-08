'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'

// Dynamically import WalletMultiButton with no SSR to prevent hydration issues
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export default function Header() {

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.jpeg"
              alt="JoyVault Logo"
              width={40}
              height={40}
              className="rounded-lg group-hover:scale-110 transition-transform"
              priority
            />
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
