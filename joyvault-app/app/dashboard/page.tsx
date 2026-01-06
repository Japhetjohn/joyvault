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
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Vault</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Wallet: {publicKey?.toBase58().slice(0, 8)}...
              {publicKey?.toBase58().slice(-8)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Current Tier
              </h3>
              <p className="text-2xl font-bold">
                {VaultTier[currentTier]}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Secrets Stored
              </h3>
              <p className="text-2xl font-bold">
                {secrets.length} / {TIER_LIMITS[currentTier]}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Status
              </h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                Unlocked
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Secrets</h2>
              <button
                onClick={() => setIsAddingSecret(true)}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                + Add Secret
              </button>
            </div>

            {isAddingSecret && (
              <div className="mb-6 p-4 border-2 border-purple-500 rounded-lg">
                <h3 className="font-semibold mb-4">Add New Secret</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      value={newSecret.type}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, type: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                    >
                      <option value="password">Password</option>
                      <option value="seed_phrase">Seed Phrase</option>
                      <option value="private_key">Private Key</option>
                      <option value="note">Note</option>
                      <option value="api_key">API Key</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Content</label>
                    <textarea
                      value={newSecret.content}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, content: e.target.value })
                      }
                      className="w-full h-24 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                      placeholder="Enter secret content..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max 1024 characters
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsAddingSecret(false)
                        setNewSecret({ type: 'password', content: '' })
                      }}
                      className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSecret}
                      disabled={!newSecret.content.trim()}
                      className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Encrypt & Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {secrets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="text-lg">No secrets stored yet</p>
                <p className="text-sm mt-2">Click "Add Secret" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {secrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
                          {secret.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {secret.encrypted ? (
                          <button
                            onClick={() => handleDecrypt(secret)}
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Decrypt
                          </button>
                        ) : (
                          <button
                            onClick={() => handleHide(secret)}
                            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            Hide
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(secret.id)}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      {secret.encrypted ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          🔒 Encrypted
                        </p>
                      ) : (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-mono break-all">
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

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                sessionStorage.clear()
                router.push('/')
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Lock Vault & Exit
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
