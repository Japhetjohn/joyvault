'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import { hexToBuffer, encryptSecret, decryptSecret } from '@/lib/crypto'
import { VaultTier, TIER_LIMITS } from '@/lib/constants'

interface Secret {
  id: string
  type: string
  encrypted: boolean
  ciphertext?: string
  nonce?: string
  plaintext?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { connected, publicKey } = useWallet()
  const [masterKey, setMasterKey] = useState<Uint8Array | null>(null)
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [isAddingSecret, setIsAddingSecret] = useState(false)
  const [newSecret, setNewSecret] = useState({ type: 'password', content: '' })
  const [currentTier] = useState<VaultTier>(VaultTier.Free)

  useEffect(() => {
    const masterKeyHex = sessionStorage.getItem('masterKeyHex')
    const vaultInitialized = sessionStorage.getItem('vaultInitialized')

    if (!masterKeyHex || !vaultInitialized) {
      router.push('/')
      return
    }

    const key = hexToBuffer(masterKeyHex)
    setMasterKey(key)
  }, [router])

  const handleAddSecret = async () => {
    if (!masterKey || !newSecret.content.trim()) return

    if (secrets.length >= TIER_LIMITS[currentTier]) {
      alert(`Vault capacity reached (${TIER_LIMITS[currentTier]} secrets). Upgrade to store more.`)
      return
    }

    try {
      const encrypted = await encryptSecret(masterKey, newSecret.content)

      const secret: Secret = {
        id: Date.now().toString(),
        type: newSecret.type,
        encrypted: true,
        ciphertext: encrypted.ciphertextHex,
        nonce: encrypted.nonceHex,
      }

      setSecrets([...secrets, secret])
      setNewSecret({ type: 'password', content: '' })
      setIsAddingSecret(false)

      alert('Secret encrypted! In production, this would be stored on-chain.')
    } catch (error) {
      console.error('Failed to encrypt secret:', error)
      alert('Failed to encrypt secret')
    }
  }

  const handleDecrypt = async (secret: Secret) => {
    if (!masterKey || !secret.ciphertext || !secret.nonce) return

    try {
      const ciphertext = hexToBuffer(secret.ciphertext)
      const nonce = hexToBuffer(secret.nonce)
      const plaintext = await decryptSecret(masterKey, ciphertext, nonce)

      setSecrets(
        secrets.map((s) =>
          s.id === secret.id ? { ...s, plaintext, encrypted: false } : s
        )
      )
    } catch (error) {
      console.error('Failed to decrypt secret:', error)
      alert('Failed to decrypt secret - wrong key or corrupted data')
    }
  }

  const handleHide = (secret: Secret) => {
    setSecrets(
      secrets.map((s) =>
        s.id === secret.id ? { ...s, plaintext: undefined, encrypted: true } : s
      )
    )
  }

  const handleDelete = (secretId: string) => {
    if (confirm('Are you sure you want to delete this secret?')) {
      setSecrets(secrets.filter((s) => s.id !== secretId))
      alert('Secret deleted! In production, this would update the on-chain vault.')
    }
  }

  if (!connected) {
    return (
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6">
          <div className="text-center">
            <p className="text-xl mb-4">Please connect your wallet to access the dashboard</p>
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Home
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)] p-6 md:p-12">
        <div className="max-w-6xl mx-auto fade-in">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">Your Vault</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Wallet: {publicKey?.toBase58().slice(0, 8)}...
              {publicKey?.toBase58().slice(-8)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="modern-card">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Current Tier
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {VaultTier[currentTier]}
              </p>
            </div>

            <div className="modern-card">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Secrets Stored
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {secrets.length} / {TIER_LIMITS[currentTier]}
              </p>
            </div>

            <div className="modern-card">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Status
              </h3>
              <p className="text-3xl font-bold" style={{
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Unlocked
              </p>
            </div>
          </div>

          <div className="modern-card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Secrets</h2>
              <button
                onClick={() => setIsAddingSecret(true)}
                className="btn-primary"
              >
                + Add Secret
              </button>
            </div>

            {isAddingSecret && (
              <div className="mb-6 modern-card" style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(255, 56, 92, 0.05) 100%)',
                borderColor: 'var(--accent-purple)',
                borderWidth: '2px'
              }}>
                <h3 className="font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Add New Secret</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Type</label>
                    <select
                      value={newSecret.type}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, type: e.target.value })
                      }
                      className="modern-input"
                    >
                      <option value="password">Password</option>
                      <option value="seed_phrase">Seed Phrase</option>
                      <option value="private_key">Private Key</option>
                      <option value="note">Note</option>
                      <option value="api_key">API Key</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Content</label>
                    <textarea
                      value={newSecret.content}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, content: e.target.value })
                      }
                      className="modern-input h-24"
                      placeholder="Enter secret content..."
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Max 1024 characters
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setIsAddingSecret(false)
                        setNewSecret({ type: 'password', content: '' })
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSecret}
                      disabled={!newSecret.content.trim()}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Encrypt & Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {secrets.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <p className="text-lg">No secrets stored yet</p>
                <p className="text-sm mt-2">Click "Add Secret" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {secrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="secret-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="tier-badge">
                          {secret.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {secret.encrypted ? (
                          <button
                            onClick={() => handleDecrypt(secret)}
                            className="text-sm font-semibold hover:underline"
                            style={{ color: 'var(--accent-blue)' }}
                          >
                            Decrypt
                          </button>
                        ) : (
                          <button
                            onClick={() => handleHide(secret)}
                            className="text-sm font-semibold hover:underline"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Hide
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(secret.id)}
                          className="text-sm font-semibold hover:underline"
                          style={{ color: 'var(--accent-pink)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      {secret.encrypted ? (
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                          </svg>
                          <p className="text-sm font-mono">Encrypted</p>
                        </div>
                      ) : (
                        <div className="modern-card" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                          <p className="text-sm font-mono break-all" style={{ color: 'var(--text-primary)' }}>
                            {secret.plaintext}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                sessionStorage.clear()
                router.push('/')
              }}
              className="text-sm font-semibold hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Lock Vault & Exit
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
