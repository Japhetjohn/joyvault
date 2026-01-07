'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { validateLifePhrase, deriveKeyFromLifePhrase } from '@/lib/crypto'
import { useVault } from '@/lib/hooks/useVault'

export default function CreateVault() {
  const router = useRouter()
  const { connected, publicKey } = useWallet()
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
      const derived = await deriveKeyFromLifePhrase(lifePhrase)
      const success = await createVault(derived.masterKey)

      if (success) {
        sessionStorage.setItem('masterKeyHex', derived.hashHex)
        sessionStorage.setItem('vaultInitialized', 'true')
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
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">Create New Vault</h1>
            <span className="text-gray-400 text-sm">Step {step} of 3</span>
          </div>

          {/* Progress Steps */}
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Enter Life Phrase */}
        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2">
                Enter Your Life Phrase
              </label>
              <p className="text-gray-400 text-sm mb-4">
                Create a memorable sentence that only you know. This will be your key to unlock your vault.
              </p>

              {/* Example */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                <div className="flex gap-2 mb-2">
                  <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-white text-sm font-medium mb-1">Example:</div>
                    <div className="text-gray-400 text-sm font-mono">
                      "My dog Max was born in Lagos on Christmas 2015"
                    </div>
                  </div>
                </div>
              </div>

              <textarea
                value={lifePhrase}
                onChange={handleLifePhraseChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none h-32"
                placeholder="Enter your Life Phrase..."
              />
            </div>

            {/* Validation */}
            {validation && (
              <div className="space-y-4">
                {/* Strength Meter */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Strength:</span>
                    <span className={`font-semibold ${
                      validation.strength >= 80 ? 'text-green-400' :
                      validation.strength >= 60 ? 'text-yellow-400' :
                      validation.strength >= 40 ? 'text-orange-400' : 'text-red-400'
                    }`}>
                      {getStrengthText(validation.strength)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 transition-all duration-500 ${getStrengthColor(validation.strength)}`}
                      style={{ width: `${validation.strength}%` }}
                    />
                  </div>
                </div>

                {/* Errors */}
                {validation.errors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <div className="flex gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-red-400 text-sm font-semibold">Requirements:</div>
                    </div>
                    <ul className="text-red-300 text-sm space-y-1 ml-7">
                      {validation.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success */}
                {validation.isValid && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Life Phrase meets all requirements!</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={!validation?.isValid}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 rounded-2xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Confirm Life Phrase */}
        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2">
                Confirm Your Life Phrase
              </label>
              <p className="text-gray-400 text-sm mb-4">
                Type your Life Phrase again to confirm you remember it correctly.
              </p>
              <textarea
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none h-32"
                placeholder="Re-enter your Life Phrase..."
              />
            </div>

            {/* Match Status */}
            {confirmPhrase && (
              <div>
                {lifePhrase === confirmPhrase ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Life Phrases match!</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="font-semibold">Life Phrases do not match</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-800 text-white font-semibold py-4 rounded-2xl hover:bg-gray-750 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={lifePhrase !== confirmPhrase}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 rounded-2xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Warning & Create */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Warning Card */}
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500/50 rounded-3xl p-8">
              <div className="flex gap-4 mb-6">
                <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    CRITICAL WARNING
                  </h2>
                  <p className="text-red-200 text-sm">
                    Please read this carefully before proceeding
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-white">
                <div className="bg-black/30 rounded-2xl p-6">
                  <p className="font-bold text-lg mb-3">
                    If you forget your Life Phrase, your vault CANNOT be recovered.
                  </p>
                  <ul className="space-y-2 text-sm text-red-100">
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Not by you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Not by JoyVault</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Not by anyone, ever</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-black/30 rounded-2xl p-6">
                  <p className="font-bold text-lg">
                    There is NO recovery mechanism. Your Life Phrase is your ONLY access.
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Status */}
            {!connected ? (
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-white font-bold mb-2">Wallet Required</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Please connect your wallet to create a vault
                </p>
                <WalletMultiButton />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Wallet Connected</div>
                      <div className="text-white font-mono text-sm">
                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                disabled={loading || isProcessing}
                className="flex-1 bg-gray-800 text-white font-semibold py-4 rounded-2xl hover:bg-gray-750 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCreateVault}
                disabled={loading || isProcessing || !connected}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 rounded-2xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading || isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Vault...
                  </span>
                ) : (
                  'I Understand, Create Vault'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
