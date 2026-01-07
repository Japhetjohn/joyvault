'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { deriveKeyFromLifePhrase } from '@/lib/crypto'
import { useVault } from '@/lib/hooks/useVault'

export default function UnlockVault() {
  const router = useRouter()
  const { connected, publicKey } = useWallet()
  const { getVault, loading } = useVault()
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
      const vault = await getVault(derived.masterKey)

      if (!vault) {
        setError('No vault found for this Life Phrase. Please create a vault first.')
        setIsUnlocking(false)
        return
      }

      sessionStorage.setItem('masterKeyHex', derived.hashHex)
      sessionStorage.setItem('vaultInitialized', 'true')
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to unlock vault:', err)
      setError(err instanceof Error ? err.message : 'Failed to unlock vault. Please check your Life Phrase.')
    } finally {
      setIsUnlocking(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/app')}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">JoyVault</span>
          </button>

          <WalletMultiButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12 min-h-[calc(100vh-80px)] flex items-center">
        <div className="w-full space-y-8">
          {/* Hero Section */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Unlock Your Vault</h1>
            <p className="text-gray-400">
              Enter your Life Phrase to access your encrypted secrets
            </p>
          </div>

          {/* Unlock Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 space-y-6">
            {/* Life Phrase Input */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Life Phrase
              </label>
              <p className="text-gray-400 text-sm mb-4">
                Enter the same Life Phrase you used when creating your vault
              </p>
              <textarea
                value={lifePhrase}
                onChange={(e) => {
                  setLifePhrase(e.target.value)
                  setError('')
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-32"
                placeholder="Enter your Life Phrase..."
                disabled={isUnlocking}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleUnlock()
                  }
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">Enhanced Security</p>
                  <p className="text-blue-200">
                    Your key is derived using 600,000 iterations of PBKDF2 for maximum protection.
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Status */}
            {!connected ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-2">Connect Your Wallet</p>
                <p className="text-gray-400 text-sm mb-4">
                  You need to connect your wallet to unlock your vault
                </p>
                <WalletMultiButton />
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-xs text-green-400">Wallet Connected</div>
                      <div className="text-white font-mono text-sm">
                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Unlock Button */}
            <button
              onClick={handleUnlock}
              disabled={isUnlocking || loading || !connected || !lifePhrase.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-2xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isUnlocking || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loading ? 'Verifying Vault...' : 'Deriving Key...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock Vault
                </span>
              )}
            </button>

            {/* Keyboard Shortcut Hint */}
            <p className="text-center text-xs text-gray-500">
              Press Ctrl + Enter to unlock
            </p>
          </div>

          {/* Help Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
            <h3 className="text-white font-semibold mb-3">Need Help?</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Make sure you're using the exact same Life Phrase (including capitalization and spacing)</p>
              </div>
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Check that you're connected with the correct wallet</p>
              </div>
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>If you don't have a vault yet, create one first</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <button
                onClick={() => router.push('/create-vault')}
                className="w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-750 transition-colors text-sm"
              >
                Create a New Vault
              </button>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center">
            <button
              onClick={() => router.push('/app')}
              className="text-gray-500 hover:text-gray-400 transition-colors text-sm inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to App
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
