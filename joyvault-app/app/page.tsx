'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function Home() {
  const router = useRouter()

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 md:p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              JoyVault
            </h1>
            <p className="text-xl md:text-2xl mb-3 text-gray-700 dark:text-gray-300">
              Your secrets. On-chain. Remembered by you.
            </p>
            <p className="text-base md:text-lg text-gray-500 dark:text-gray-400">
              Store critical data on Solana blockchain, encrypted with your memory
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <button
              onClick={() => router.push('/create-vault')}
              className="group p-8 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg"
            >
              <div className="text-4xl mb-4">🔐</div>
              <h2 className="text-2xl font-semibold mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Create Vault
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Set up your memory-based vault with a Life Phrase
              </p>
            </button>

            <button
              onClick={() => router.push('/unlock-vault')}
              className="group p-8 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg"
            >
              <div className="text-4xl mb-4">🔓</div>
              <h2 className="text-2xl font-semibold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Access Vault
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Unlock your existing vault with your Life Phrase
              </p>
            </button>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="font-semibold mb-2">Memory-Based</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your Life Phrase is your identity. No seed phrases to backup.
              </p>
            </div>
            <div className="p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold mb-2">Encrypted On-Chain</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AES-256 encryption. Data stored permanently on Solana.
              </p>
            </div>
            <div className="p-6">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-semibold mb-2">Wallet Agnostic</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lost your wallet? Connect a new one with the same Life Phrase.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
