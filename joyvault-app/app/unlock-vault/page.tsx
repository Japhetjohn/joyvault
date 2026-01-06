'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import { deriveKeyFromLifePhrase } from '@/lib/crypto'

export default function UnlockVault() {
  const router = useRouter()
  const { connected } = useWallet()
  const [lifePhrase, setLifePhrase] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState('')

  const handleUnlock = async () => {
    if (!connected) {
      setError('Please connect your wallet first')
      return
    }

    if (!lifePhrase.trim()) {
      setError('Please enter your Life Phrase')
      return
    }

    setIsUnlocking(true)
    setError('')

    try {
      const derived = await deriveKeyFromLifePhrase(lifePhrase)

      sessionStorage.setItem('masterKeyHex', derived.hashHex)
      sessionStorage.setItem('vaultInitialized', 'true')

      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to unlock vault:', err)
      setError('Failed to derive key. Please check your Life Phrase.')
    } finally {
      setIsUnlocking(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <div className="mb-8 text-center">
            <div className="text-6xl mb-4">🔓</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Unlock Vault</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your Life Phrase to access your vault
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Life Phrase
              </label>
              <textarea
                value={lifePhrase}
                onChange={(e) => {
                  setLifePhrase(e.target.value)
                  setError('')
                }}
                className="w-full h-32 p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                placeholder="Enter your Life Phrase..."
                disabled={isUnlocking}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                <strong>Note:</strong> Deriving your key will take 2-3 seconds. This is intentional
                for security.
              </p>
            </div>

            <button
              onClick={handleUnlock}
              disabled={isUnlocking || !connected}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isUnlocking ? 'Deriving Key...' : !connected ? 'Connect Wallet First' : 'Unlock Vault'}
            </button>

            <div className="text-center">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
