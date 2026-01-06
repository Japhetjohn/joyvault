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
        <div className="max-w-md w-full fade-in">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">Unlock Vault</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Enter your Life Phrase to access your vault
            </p>
          </div>

          <div className="modern-card space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Life Phrase
              </label>
              <textarea
                value={lifePhrase}
                onChange={(e) => {
                  setLifePhrase(e.target.value)
                  setError('')
                }}
                className="modern-input h-32"
                placeholder="Enter your Life Phrase..."
                disabled={isUnlocking}
              />
            </div>

            {error && (
              <div className="modern-card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgb(239, 68, 68)'
              }}>
                <p className="text-sm" style={{ color: 'rgb(239, 68, 68)' }}>{error}</p>
              </div>
            )}

            <div className="modern-card" style={{
              background: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'var(--accent-blue)'
            }}>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                <strong>Note:</strong> Your key is derived using 600,000 iterations of PBKDF2 for maximum security.
              </p>
            </div>

            <button
              onClick={handleUnlock}
              disabled={isUnlocking || !connected}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnlocking ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5 border-2"></div>
                  <span>Deriving Key...</span>
                </div>
              ) : !connected ? (
                'Connect Wallet First'
              ) : (
                'Unlock Vault'
              )}
            </button>

            <div className="text-center">
              <button
                onClick={() => router.push('/')}
                className="text-sm hover:underline"
                style={{ color: 'var(--text-secondary)' }}
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
