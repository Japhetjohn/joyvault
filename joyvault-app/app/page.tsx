'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function Home() {
  const router = useRouter()

  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-7xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-32 fade-in relative z-10">
            <h1 className="text-7xl md:text-8xl font-bold mb-8 leading-tight" style={{
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
            }}>
              <span className="gradient-text">Your Secrets.</span><br />
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>On-Chain. Forever.</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed" style={{
              color: '#E5E5E5',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)'
            }}>
              Store critical data on Solana blockchain with military-grade encryption.<br />
              Access from anywhere using only your memory. No seed phrases. No recovery keys.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32 max-w-5xl mx-auto scale-in relative z-10">
            <button
              onClick={() => router.push('/create-vault')}
              className="modern-card glow-on-hover text-left group p-12"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl border-2 border-purple-500/30 flex items-center justify-center group-hover:scale-110 group-hover:border-purple-500 transition-all">
                  <svg className="w-9 h-9 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Create Vault
                  </h2>
                </div>
              </div>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Set up your memory-based vault with a Life Phrase. Your identity, forever stored in your mind.
              </p>
              <div className="mt-6 flex items-center gap-2 text-purple-400 group-hover:gap-4 transition-all">
                <span className="font-semibold">Get Started</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => router.push('/unlock-vault')}
              className="modern-card glow-on-hover text-left group p-12"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl border-2 border-blue-500/30 flex items-center justify-center group-hover:scale-110 group-hover:border-blue-500 transition-all">
                  <svg className="w-9 h-9 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Access Vault
                  </h2>
                </div>
              </div>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Unlock your existing vault instantly with your Life Phrase. Access your secrets from anywhere.
              </p>
              <div className="mt-6 flex items-center gap-2 text-blue-400 group-hover:gap-4 transition-all">
                <span className="font-semibold">Unlock Now</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          </div>

          {/* Features Section */}
          <div className="max-w-6xl mx-auto slide-in relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Why Choose JoyVault
              </h2>
              <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
                The most secure way to store your secrets on-chain
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="modern-card p-8">
                <div className="w-14 h-14 rounded-xl border-2 border-purple-500/30 flex items-center justify-center mb-6 transition-colors hover:border-purple-500">
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Memory-Based
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Your Life Phrase is your identity. No seed phrases to backup or lose. Access your vault from anywhere with just your memory.
                </p>
              </div>

              <div className="modern-card p-8">
                <div className="w-14 h-14 rounded-xl border-2 border-pink-500/30 flex items-center justify-center mb-6 transition-colors hover:border-pink-500">
                  <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Military-Grade Encryption
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  AES-256 encryption ensures your secrets are secure. Data stored permanently on Solana blockchain, accessible only by you.
                </p>
              </div>

              <div className="modern-card p-8">
                <div className="w-14 h-14 rounded-xl border-2 border-blue-500/30 flex items-center justify-center mb-6 transition-colors hover:border-blue-500">
                  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Wallet Agnostic
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Lost your wallet? No problem. Connect a new one with the same Life Phrase and regain access to all your secrets instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-32 max-w-4xl mx-auto relative z-10">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div className="fade-in">
                <div className="text-5xl font-bold gradient-text mb-2">256-bit</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>AES Encryption</div>
              </div>
              <div className="fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="text-5xl font-bold gradient-text mb-2">100%</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>On-Chain Storage</div>
              </div>
              <div className="fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="text-5xl font-bold gradient-text mb-2">Forever</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Immutable Data</div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <footer className="mt-32 pt-12 pb-8 border-t border-white/10 relative z-10">
            <div className="max-w-6xl mx-auto">
              {/* Social Links */}
              <div className="flex justify-center gap-6 mb-8">
                <a
                  href="https://twitter.com/joyvault"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-lg border border-white/10 flex items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://t.me/joyvault"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-lg border border-white/10 flex items-center justify-center hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </a>
              </div>

              {/* Links */}
              <div className="flex justify-center gap-8 mb-8 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
              </div>

              {/* Copyright */}
              <div className="text-center text-sm text-gray-500">
                <p>© {new Date().getFullYear()} JoyVault. All rights reserved.</p>
                <p className="mt-2 text-xs">
                  Built on Solana • Secured with AES-256 Encryption
                </p>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}
