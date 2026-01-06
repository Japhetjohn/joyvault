'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import { validateLifePhrase, deriveKeyFromLifePhrase } from '@/lib/crypto'

export default function CreateVault() {
  const router = useRouter()
  const { connected } = useWallet()
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
      const derived = await deriveKeyFromLifePhrase(lifePhrase)

      sessionStorage.setItem('masterKeyHex', derived.hashHex)
      sessionStorage.setItem('vaultInitialized', 'true')

      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to create vault:', error)
      alert('Failed to create vault. Please try again.')
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
        <div className="max-w-2xl w-full">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Create Your Vault</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Step {step} of 3
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter Your Life Phrase
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This is a memorable sentence only you know. Example: "John born in Aba mango tree 2003"
                </p>
                <textarea
                  value={lifePhrase}
                  onChange={handleLifePhraseChange}
                  className="w-full h-32 p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800"
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
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirm Your Life Phrase
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Type your Life Phrase again to confirm
                </p>
                <textarea
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800"
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
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  disabled={lifePhrase !== confirmPhrase}
                  className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6">
                <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 mb-3">
                  ⚠️ CRITICAL WARNING
                </h2>
                <div className="text-yellow-800 dark:text-yellow-400 space-y-2">
                  <p className="font-semibold">
                    If you forget your Life Phrase, your vault CANNOT be recovered.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Not by you</li>
                    <li>Not by JoyVault</li>
                    <li>Not by anyone</li>
                  </ul>
                  <p className="font-semibold mt-4">
                    There is NO recovery mechanism. Your Life Phrase is your ONLY access.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateVault}
                  disabled={isProcessing || !connected}
                  className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {isProcessing ? 'Creating Vault...' : !connected ? 'Connect Wallet First' : 'I Understand, Create Vault'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
