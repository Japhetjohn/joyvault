'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import { validateLifePhrase, deriveKeyFromLifePhrase } from '@/lib/crypto'
import { useVault } from '@/lib/hooks/useVault'

export default function CreateVault() {
  const router = useRouter()
  const { connected } = useWallet()
  const { createVault, loading, error } = useVault()
  const [step, setStep] = useState(1)
  const [lifePhrase, setLifePhrase] = useState('')
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [validation, setValidation] = useState<{
    isValid: boolean
    errors: string[]
    strength: number
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleLifePhraseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const phrase = e.target.value
    setLifePhrase(phrase)

    if (phrase.length > 0) {
      const result = validateLifePhrase(phrase)
      setValidation(result)
    } else {
      setValidation(null)
    }
  }

  const handleContinue = () => {
    if (step === 1 && validation?.isValid) {
      setStep(2)
    } else if (step === 2 && lifePhrase === confirmPhrase) {
      setStep(3)
    }
  }

  const handleCreateVault = async () => {
    if (!connected) {
      alert('Please connect your wallet first')
      return
    }

    setIsProcessing(true)
    try {
      // Derive master key from Life Phrase
      const derived = await deriveKeyFromLifePhrase(lifePhrase)

      // Create vault on-chain
      const success = await createVault(derived.masterKey)

      if (success) {
        // Store master key hash for session
        sessionStorage.setItem('masterKeyHex', derived.hashHex)
        sessionStorage.setItem('vaultInitialized', 'true')

        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        alert(error || 'Failed to create vault. Please try again.')
      }
    } catch (err) {
      console.error('Failed to create vault:', err)
      alert(err instanceof Error ? err.message : 'Failed to create vault. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'bg-green-500'
    if (strength >= 60) return 'bg-yellow-500'
    if (strength >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStrengthText = (strength: number) => {
    if (strength >= 80) return 'Strong'
    if (strength >= 60) return 'Good'
    if (strength >= 40) return 'Fair'
    return 'Weak'
  }

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center p-6 md:p-12">
        <div className="max-w-2xl w-full fade-in">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">Create Your Vault</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Step {step} of 3
            </p>
          </div>

          {step === 1 && (
            <div className="modern-card space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Enter Your Life Phrase
                </label>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  This is a memorable sentence only you know. Example: "John born in Aba mango tree 2003"
                </p>
                <textarea
                  value={lifePhrase}
                  onChange={handleLifePhraseChange}
                  className="modern-input h-32"
                  placeholder="Enter your Life Phrase..."
                />
              </div>

              {validation && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Strength:</span>
                      <span className="font-semibold">{getStrengthText(validation.strength)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getStrengthColor(validation.strength)}`}
                        style={{ width: `${validation.strength}%` }}
                      />
                    </div>
                  </div>

                  {validation.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
                        Requirements:
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                        {validation.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={!validation?.isValid}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="modern-card space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Confirm Your Life Phrase
                </label>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Type your Life Phrase again to confirm
                </p>
                <textarea
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="modern-input h-32"
                  placeholder="Re-enter your Life Phrase..."
                />
              </div>

              {confirmPhrase && lifePhrase !== confirmPhrase && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Life Phrases do not match
                </p>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  disabled={lifePhrase !== confirmPhrase}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="modern-card" style={{
                background: 'linear-gradient(135deg, rgba(255, 56, 92, 0.1) 0%, rgba(255, 168, 0, 0.1) 100%)',
                borderColor: 'var(--accent-pink)'
              }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                      CRITICAL WARNING
                    </h2>
                    <div className="space-y-2" style={{ color: 'var(--text-primary)' }}>
                      <p className="font-semibold">
                        If you forget your Life Phrase, your vault CANNOT be recovered.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <li>Not by you</li>
                        <li>Not by JoyVault</li>
                        <li>Not by anyone</li>
                      </ul>
                      <p className="font-semibold mt-4">
                        There is NO recovery mechanism. Your Life Phrase is your ONLY access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="btn-secondary flex-1"
                  disabled={loading || isProcessing}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateVault}
                  disabled={loading || isProcessing || !connected}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || isProcessing ? 'Creating Vault...' : !connected ? 'Connect Wallet First' : 'I Understand, Create Vault'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
