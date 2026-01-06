'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from '@/components/Header'
import { hexToBuffer } from '@/lib/crypto'
import { useVault, Secret } from '@/lib/hooks/useVault'
import { VaultTier, SecretType, TIER_INFO } from '@/lib/solana/program'
import { payWithUsdc, getTierPriceInUsdc, formatUsdc, getUsdcBalance } from '@/lib/solana/usdc'

export default function Dashboard() {
  const router = useRouter()
  const { connected, publicKey } = useWallet()
  const wallet = useWallet()

  const {
    getVault,
    getVaultSecrets,
    addVaultSecret,
    deleteVaultSecret,
    upgradeVaultTier,
    loading,
    error
  } = useVault()

  const [masterKey, setMasterKey] = useState<Uint8Array | null>(null)
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [vaultTier, setVaultTier] = useState<VaultTier>(VaultTier.Free)
  const [secretCount, setSecretCount] = useState(0)

  const [isAddingSecret, setIsAddingSecret] = useState(false)
  const [newSecret, setNewSecret] = useState({
    type: SecretType.Password,
    title: '',
    content: ''
  })

  const [showUpgrade, setShowUpgrade] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [decryptedSecrets, setDecryptedSecrets] = useState<Set<number>>(new Set())

  // Load master key and fetch vault data
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

  // Fetch vault info when master key is available
  useEffect(() => {
    if (masterKey && connected) {
      loadVaultData()
    }
  }, [masterKey, connected])

  // Load USDC balance
  useEffect(() => {
    if (publicKey) {
      loadUsdcBalance()
    }
  }, [publicKey])

  const loadVaultData = async () => {
    if (!masterKey) return

    try {
      // Fetch vault info
      const vault = await getVault(masterKey)
      if (vault) {
        setVaultTier(vault.tier)
        setSecretCount(vault.secretCount)
      }

      // Fetch all secrets
      const vaultSecrets = await getVaultSecrets(masterKey)
      setSecrets(vaultSecrets)
    } catch (err) {
      console.error('Failed to load vault data:', err)
    }
  }

  const loadUsdcBalance = async () => {
    if (!publicKey) return
    try {
      const balance = await getUsdcBalance(publicKey)
      setUsdcBalance(balance)
    } catch (err) {
      console.error('Failed to load USDC balance:', err)
    }
  }

  const handleAddSecret = async () => {
    if (!masterKey || !newSecret.content.trim() || !newSecret.title.trim()) {
      alert('Please fill in all fields')
      return
    }

    const maxSecrets = TIER_INFO[vaultTier].maxSecrets
    if (secretCount >= maxSecrets) {
      alert(`Vault capacity reached (${maxSecrets} secrets). Upgrade to store more.`)
      return
    }

    try {
      const success = await addVaultSecret(
        masterKey,
        newSecret.type,
        newSecret.title,
        newSecret.content
      )

      if (success) {
        setNewSecret({ type: SecretType.Password, title: '', content: '' })
        setIsAddingSecret(false)
        await loadVaultData() // Reload vault data
      } else {
        alert(error || 'Failed to add secret')
      }
    } catch (err) {
      console.error('Failed to add secret:', err)
      alert(err instanceof Error ? err.message : 'Failed to add secret')
    }
  }

  const handleDelete = async (secretIndex: number) => {
    if (!masterKey) return

    if (confirm('Are you sure you want to delete this secret?')) {
      try {
        const success = await deleteVaultSecret(masterKey, secretIndex)

        if (success) {
          await loadVaultData() // Reload vault data
        } else {
          alert(error || 'Failed to delete secret')
        }
      } catch (err) {
        console.error('Failed to delete secret:', err)
        alert(err instanceof Error ? err.message : 'Failed to delete secret')
      }
    }
  }

  const toggleDecrypt = (index: number) => {
    const newDecrypted = new Set(decryptedSecrets)
    if (newDecrypted.has(index)) {
      newDecrypted.delete(index)
    } else {
      newDecrypted.add(index)
    }
    setDecryptedSecrets(newDecrypted)
  }

  const handleUpgradeTier = async (newTier: VaultTier) => {
    if (!masterKey) return

    if (newTier <= vaultTier) {
      alert('Cannot downgrade tier')
      return
    }

    const price = getTierPriceInUsdc(newTier)

    if (price > 0) {
      // Pay with USDC
      const paymentResult = await payWithUsdc(wallet, newTier)

      if (!paymentResult.success) {
        alert(paymentResult.error || 'Payment failed')
        return
      }
    }

    try {
      const success = await upgradeVaultTier(masterKey, newTier)

      if (success) {
        setShowUpgrade(false)
        await loadVaultData()
        await loadUsdcBalance()
        alert(`Successfully upgraded to ${TIER_INFO[newTier].name} tier!`)
      } else {
        alert(error || 'Failed to upgrade tier')
      }
    } catch (err) {
      console.error('Failed to upgrade tier:', err)
      alert(err instanceof Error ? err.message : 'Failed to upgrade tier')
    }
  }

  const getSecretTypeLabel = (type: SecretType): string => {
    const labels = {
      [SecretType.Password]: 'Password',
      [SecretType.ApiKey]: 'API Key',
      [SecretType.SeedPhrase]: 'Seed Phrase',
      [SecretType.PrivateKey]: 'Private Key',
      [SecretType.Note]: 'Note',
      [SecretType.Custom]: 'Custom',
    }
    return labels[type] || 'Unknown'
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
      <main className="min-h-[calc(100vh-4rem)] p-6 md:p-12 relative z-10">
        <div className="max-w-6xl mx-auto fade-in">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">Your Vault</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Wallet: {publicKey?.toBase58().slice(0, 8)}...
              {publicKey?.toBase58().slice(-8)}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="modern-card">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Current Tier
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {TIER_INFO[vaultTier].name}
                </p>
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="text-xs px-3 py-1 rounded-lg border-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                  style={{ color: 'var(--accent-purple)' }}
                >
                  Upgrade
                </button>
              </div>
            </div>

            <div className="modern-card">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Secrets Stored
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {secretCount} / {TIER_INFO[vaultTier].maxSecrets}
              </p>
            </div>

            <div className="modern-card">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                USDC Balance
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {usdcBalance.toFixed(2)}
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

          {/* Upgrade Tier Modal */}
          {showUpgrade && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
              <div className="modern-card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold gradient-text">Upgrade Vault Tier</h2>
                  <button
                    onClick={() => setShowUpgrade(false)}
                    className="text-2xl hover:text-red-500"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[VaultTier.Starter, VaultTier.Pro, VaultTier.Ultra].map((tier) => {
                    const info = TIER_INFO[tier]
                    const isCurrentTier = tier === vaultTier
                    const canUpgrade = tier > vaultTier

                    return (
                      <div
                        key={tier}
                        className={`modern-card ${
                          isCurrentTier ? 'border-purple-500' : canUpgrade ? 'border-white/20' : 'opacity-50'
                        }`}
                        style={{ borderWidth: '2px' }}
                      >
                        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                          {info.name}
                        </h3>
                        <p className="text-3xl font-bold mb-4 gradient-text">
                          {formatUsdc(info.price)}
                        </p>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          Store up to {info.maxSecrets} secrets
                        </p>

                        {isCurrentTier ? (
                          <div className="px-4 py-2 rounded-lg text-center font-semibold" style={{
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: 'var(--accent-purple)'
                          }}>
                            Current Tier
                          </div>
                        ) : canUpgrade ? (
                          <button
                            onClick={() => handleUpgradeTier(tier)}
                            disabled={loading}
                            className="btn-primary w-full disabled:opacity-50"
                          >
                            {loading ? 'Upgrading...' : 'Upgrade Now'}
                          </button>
                        ) : (
                          <div className="px-4 py-2 rounded-lg text-center text-sm" style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary)'
                          }}>
                            Lower Tier
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 modern-card" style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderColor: 'var(--accent-blue)'
                }}>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <strong>Note:</strong> Payments are processed with USDC on Solana. Your current balance: {formatUsdc(usdcBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Secrets Section */}
          <div className="modern-card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Secrets</h2>
              <button
                onClick={() => setIsAddingSecret(true)}
                disabled={secretCount >= TIER_INFO[vaultTier].maxSecrets}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                        setNewSecret({ ...newSecret, type: parseInt(e.target.value) as SecretType })
                      }
                      className="modern-input"
                    >
                      <option value={SecretType.Password}>Password</option>
                      <option value={SecretType.SeedPhrase}>Seed Phrase</option>
                      <option value={SecretType.PrivateKey}>Private Key</option>
                      <option value={SecretType.ApiKey}>API Key</option>
                      <option value={SecretType.Note}>Note</option>
                      <option value={SecretType.Custom}>Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Title</label>
                    <input
                      type="text"
                      value={newSecret.title}
                      onChange={(e) =>
                        setNewSecret({ ...newSecret, title: e.target.value })
                      }
                      className="modern-input"
                      placeholder="e.g., Gmail Password, Ethereum Wallet, etc."
                      maxLength={50}
                    />
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
                      maxLength={1000}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {newSecret.content.length} / 1000 characters
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setIsAddingSecret(false)
                        setNewSecret({ type: SecretType.Password, title: '', content: '' })
                      }}
                      className="btn-secondary flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSecret}
                      disabled={!newSecret.content.trim() || !newSecret.title.trim() || loading}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Encrypt & Save On-Chain'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading && !isAddingSecret ? (
              <div className="text-center py-12">
                <div className="spinner w-12 h-12 border-4 mx-auto mb-4"></div>
                <p style={{ color: 'var(--text-secondary)' }}>Loading secrets...</p>
              </div>
            ) : secrets.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-lg">No secrets stored yet</p>
                <p className="text-sm mt-2">Click "Add Secret" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {secrets.map((secret, index) => (
                  <div
                    key={index}
                    className="secret-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {secret.title}
                        </h3>
                        <span className="tier-badge">
                          {getSecretTypeLabel(secret.secretType)}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleDecrypt(index)}
                          className="text-sm font-semibold hover:underline"
                          style={{ color: 'var(--accent-blue)' }}
                        >
                          {decryptedSecrets.has(index) ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          disabled={loading}
                          className="text-sm font-semibold hover:underline disabled:opacity-50"
                          style={{ color: 'var(--accent-pink)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      {decryptedSecrets.has(index) ? (
                        <div className="modern-card" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                          <p className="text-sm font-mono break-all" style={{ color: 'var(--text-primary)' }}>
                            {secret.content}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                          </svg>
                          <p className="text-sm font-mono">••••••••••••</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Added: {new Date(secret.createdAt * 1000).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lock Vault Button */}
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
