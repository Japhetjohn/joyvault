import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import AnimatedBackground from '@/components/AnimatedBackground'

export const metadata: Metadata = {
  title: 'JoyVault - Your secrets. On-chain.',
  description: 'On-chain encrypted vault where users store secrets using only their memory',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AnimatedBackground />
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  )
}
