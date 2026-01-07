'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
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
      const vault = await getVault(masterKey)
      if (vault) {
        setVaultTier(vault.tier)
        setSecretCount(vault.secretCount)
      }

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
        await loadVaultData()
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
          await loadVaultData()
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

  const getSecretTypeIcon = (type: SecretType) => {
    switch (type) {
      case SecretType.Password:
        return (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />)
      case SecretType.ApiKey:
        return (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />)
      case SecretType.SeedPhrase:
        return (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />)
      case SecretType.PrivateKey:
        return (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />)
      default:
        return (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Wallet Required</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to access the dashboard
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">JoyVault</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                sessionStorage.clear()
                router.push('/')
              }}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Lock & Exit
            </button>
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Vault</h1>
          <p className="text-gray-400 text-sm font-mono">
            {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Current Tier */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Current Tier</span>
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {TIER_INFO[vaultTier].name}
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
            >
              Upgrade →
            </button>
          </div>

          {/* Secrets Count */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Secrets Stored</span>
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {secretCount} / {TIER_INFO[vaultTier].maxSecrets}
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                style={{ width: `${(secretCount / TIER_INFO[vaultTier].maxSecrets) * 100}%` }}
              />
            </div>
          </div>

          {/* USDC Balance */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">USDC Balance</span>
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              ${formatUsdc(usdcBalance)}
            </div>
            <span className="text-gray-500 text-xs">Devnet USDC</span>
          </div>

          {/* Security Level */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Security</span>
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              256-bit
            </div>
            <span className="text-emerald-400 text-xs">AES Encryption</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Quick Actions</h3>
              <p className="text-gray-400 text-sm">Manage your vault secrets</p>
            </div>
            <button
              onClick={() => setIsAddingSecret(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Secret
            </button>
          </div>
        </div>

        {/* Secrets List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Your Secrets ({secrets.length})</h2>

          {secrets.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">No secrets yet</h3>
              <p className="text-gray-400 mb-6">Start by adding your first encrypted secret</p>
              <button
                onClick={() => setIsAddingSecret(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform"
              >
                Add First Secret
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {secrets.map((secret, index) => (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {getSecretTypeIcon(secret.type)}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold">{secret.title}</h3>
                          <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-md">
                            {getSecretTypeLabel(secret.type)}
                          </span>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3 mt-2">
                          {decryptedSecrets.has(index) ? (
                            <p className="text-white font-mono text-sm break-all">
                              {secret.content}
                            </p>
                          ) : (
                            <p className="text-gray-500 text-sm">
                              ••••••••••••••••••••
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleDecrypt(index)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title={decryptedSecrets.has(index) ? "Hide" : "Show"}
                      >
                        {decryptedSecrets.has(index) ? (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(index)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Secret Modal */}
      {isAddingSecret && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Secret</h2>
              <button
                onClick={() => setIsAddingSecret(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-white font-semibold mb-3">Secret Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(SecretType).filter(v => typeof v === 'number').map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewSecret({ ...newSecret, type: type as SecretType })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        newSecret.type === type
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-white font-medium">{getSecretTypeLabel(type as SecretType)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-white font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={newSecret.title}
                  onChange={(e) => setNewSecret({ ...newSecret, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g., My Gmail Password"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-white font-semibold mb-2">Secret Content</label>
                <textarea
                  value={newSecret.content}
                  onChange={(e) => setNewSecret({ ...newSecret, content: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none h-32"
                  placeholder="Enter your secret here..."
                />
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-300">
                    Your secret will be encrypted with AES-256 and stored on-chain. Only you can decrypt it with your Life Phrase.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsAddingSecret(false)}
                  className="flex-1 bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSecret}
                  disabled={loading || !newSecret.title.trim() || !newSecret.content.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Adding...' : 'Encrypt & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Tier Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Upgrade Vault Tier</h2>
              <button
                onClick={() => setShowUpgrade(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(VaultTier).filter(v => typeof v === 'number').map((tier) => {
                const tierInfo = TIER_INFO[tier as VaultTier]
                const price = getTierPriceInUsdc(tier as VaultTier)
                const isCurrent = tier === vaultTier

                return (
                  <div
                    key={tier}
                    className={`border-2 rounded-2xl p-6 ${
                      isCurrent
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{tierInfo.name}</h3>
                    <div className="text-3xl font-bold text-white mb-4">
                      {price === 0 ? 'Free' : `$${formatUsdc(price)}`}
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-gray-300 text-sm">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {tierInfo.maxSecrets} secrets
                      </li>
                      <li className="flex items-center gap-2 text-gray-300 text-sm">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        256-bit encryption
                      </li>
                      <li className="flex items-center gap-2 text-gray-300 text-sm">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        On-chain storage
                      </li>
                    </ul>
                    <button
                      onClick={() => handleUpgradeTier(tier as VaultTier)}
                      disabled={tier <= vaultTier || loading}
                      className={`w-full py-3 rounded-xl font-semibold transition-all ${
                        isCurrent
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : tier < vaultTier
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105'
                      }`}
                    >
                      {isCurrent ? 'Current Tier' : tier < vaultTier ? 'Lower Tier' : 'Upgrade Now'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-400">
                  Payments are processed with USDC on Solana. Your current balance: <span className="font-mono text-white">${formatUsdc(usdcBalance)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
