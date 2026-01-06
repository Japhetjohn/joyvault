import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'

export const metadata: Metadata = {
  title: 'JoyVault - Your secrets. On-chain.',
  description: 'On-chain encrypted vault where users store secrets using only their memory',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  )
}
