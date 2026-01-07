'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AppEntry() {
  const { connected, publicKey } = useWallet()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">JoyVault</h1>
          <p className="text-gray-400">Secure your secrets on-chain</p>
        </div>

        {/* Wallet Connection Card */}
        {!connected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
              <p className="text-gray-400 text-sm">
                Connect your Solana wallet to get started
              </p>
            </div>

            {/* Wallet Button */}
            <div className="wallet-button-modern">
              <WalletMultiButton />
            </div>

            {/* Info */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  We support Phantom, Solflare, Coinbase, and more. Your wallet is never stored or shared.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Action Selection */
          <div className="space-y-4">
            {/* Connected Wallet Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Connected</div>
                    <div className="text-white font-mono text-sm">
                      {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                    </div>
                  </div>
                </div>
                <WalletMultiButton />
              </div>
            </div>

            {/* Action Cards */}
            <div className="space-y-3">
              {/* Create Vault */}
              <button
                onClick={() => router.push('/create-vault')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-left hover:scale-[1.02] transition-transform group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Create New Vault</h3>
                <p className="text-white/70 text-sm">
                  Set up a new encrypted vault with your Life Phrase
                </p>
              </button>

              {/* Unlock Vault */}
              <button
                onClick={() => router.push('/unlock-vault')}
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left hover:border-gray-700 hover:bg-gray-850 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Unlock Existing Vault</h3>
                <p className="text-gray-400 text-sm">
                  Access your vault with your Life Phrase
                </p>
              </button>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>256-bit AES Encryption • Solana Devnet</span>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <button
          onClick={() => router.push('/')}
          className="w-full mt-6 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-400 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
      </div>

      <style jsx>{`
        .wallet-button-modern :global(.wallet-adapter-button) {
          background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
          border: none;
          border-radius: 1rem;
          height: 56px;
          font-weight: 600;
          width: 100%;
          transition: all 0.2s;
        }

        .wallet-button-modern :global(.wallet-adapter-button:hover) {
          transform: scale(1.02);
          box-shadow: 0 20px 40px -12px rgba(124, 58, 237, 0.4);
        }

        .wallet-button-modern :global(.wallet-adapter-button-trigger) {
          background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
          border-radius: 1rem;
        }
      `}</style>
    </div>
  )
}
