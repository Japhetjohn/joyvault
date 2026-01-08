'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { hexToBuffer } from '@/lib/crypto'
import { useVault, Secret } from '@/lib/hooks/useVault'
import { VaultTier, SecretType, TIER_INFO } from '@/lib/solana/program'
import { payWithUsdc, getTierPriceInUsdc, formatUsdc, getUsdcBalance } from '@/lib/solana/usdc'
import Sidebar from '@/components/Sidebar'

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
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard')
  const [editingSecret, setEditingSecret] = useState<{ index: number; secret: Secret } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const masterKeyHex = sessionStorage.getItem('masterKeyHex')
    const vaultInitialized = sessionStorage.getItem('vaultInitialized')

    if (masterKeyHex && vaultInitialized) {
      const key = hexToBuffer(masterKeyHex)
      setMasterKey(key)
    }
  }, [])

  useEffect(() => {
    if (masterKey && connected) {
      loadVaultData()
    }
  }, [masterKey, connected])

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

  return (
    <div className="flex h-screen bg-white">
      {/* BLACK SIDEBAR - EXACTLY LIKE REFERENCE */}
      <Sidebar
        onDashboard={() => setCurrentView('dashboard')}
        onAddSecret={() => setIsAddingSecret(true)}
        onEditSecret={() => {
          if (secrets.length === 0) {
            alert('No secrets to edit. Add a secret first.')
          } else {
            setCurrentView('dashboard')
            alert('Select a secret from your dashboard to edit it using the edit button.')
          }
        }}
        onUpgrade={() => setShowUpgrade(true)}
        onSettings={() => setCurrentView('settings')}
        currentView={currentView}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* WHITE MAIN CONTENT - EXACTLY LIKE REFERENCE */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button - Mobile Only */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <h1 className="text-xl md:text-2xl font-bold text-black">
                  {currentView === 'settings' ? 'Settings' : 'Dashboard'}
                </h1>
                {connected && publicKey && (
                  <p className="text-xs md:text-sm text-gray-600 font-mono">
                    {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {mounted && <WalletMultiButton />}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 md:p-8">
          {!connected ? (
            /* CONNECT WALLET UI - SHOWN IN MAIN AREA */
            <div className="max-w-md mx-auto mt-8 md:mt-20">
              <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-black mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600 mb-6">
                  Connect your Solana wallet to access your vault
                </p>
                <div className="text-sm text-gray-500">
                  Click the "Select Wallet" button above to get started
                </div>
              </div>
            </div>
          ) : currentView === 'settings' ? (
            /* SETTINGS VIEW */
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 mb-6">
                <h2 className="text-2xl font-bold text-black mb-6">Life Phrase Security</h2>

                <div className="space-y-6">
                  {/* Current Life Phrase Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Your Life Phrase</h3>
                        <p className="text-sm text-gray-600">
                          This is your master key to access your vault. Never share it with anyone.
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>

                    {/* Security Strength Indicator */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Security Strength</span>
                        <span className="text-sm font-semibold text-black">Strong</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-full bg-black rounded-full transition-all" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Change Life Phrase Button */}
                  <button
                    onClick={() => {
                      alert('Change Life Phrase functionality coming soon')
                    }}
                    className="w-full bg-black text-white px-6 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Life Phrase
                  </button>

                  {/* Security Tips */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">Security Best Practices</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700">Use at least 6-8 random words (50+ characters)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700">Avoid common phrases, song lyrics, or quotes</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700">Include numbers and special characters</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700">Never share your Life Phrase with anyone</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-700">Store it securely offline if needed</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DASHBOARD CONTENT */
            <>
          {/* Stats Cards - WHITE CARDS WITH BLACK TEXT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Tier Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Current Tier</div>
              <div className="text-3xl font-bold text-black mb-2">
                {TIER_INFO[vaultTier].name}
              </div>
              <button
                onClick={() => setShowUpgrade(true)}
                className="text-sm text-black hover:text-gray-600 transition-colors"
              >
                Upgrade →
              </button>
            </div>

            {/* Secrets Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Secrets</div>
              <div className="text-3xl font-bold text-black mb-2">
                {secretCount} / {TIER_INFO[vaultTier].maxSecrets}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${(secretCount / TIER_INFO[vaultTier].maxSecrets) * 100}%` }}
                />
              </div>
            </div>

            {/* Security */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Security</div>
              <div className="text-3xl font-bold text-black mb-2">256-bit</div>
              <span className="text-xs text-gray-500">AES Encryption</span>
            </div>
          </div>

          {/* Add Secret Button */}
          <div className="mb-8">
            <button
              onClick={() => setIsAddingSecret(true)}
              className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Secret
            </button>
          </div>

          {/* Secrets List */}
          <div>
            <h2 className="text-xl font-bold text-black mb-4">Your Secrets ({secrets.length})</h2>

            {secrets.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-black font-semibold mb-2">No secrets yet</h3>
                <p className="text-gray-600 mb-6">Start by adding your first encrypted secret</p>
                <button
                  onClick={() => setIsAddingSecret(true)}
                  className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                >
                  Add First Secret
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {secrets.map((secret, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {getSecretTypeIcon(secret.secretType)}
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-black font-semibold">{secret.title}</h3>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                              {getSecretTypeLabel(secret.secretType)}
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            {decryptedSecrets.has(index) ? (
                              <p className="text-black font-mono text-sm break-all">
                                {secret.content}
                              </p>
                            ) : (
                              <p className="text-gray-400 text-sm">
                                ••••••••••••••••••••
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleDecrypt(index)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title={decryptedSecrets.has(index) ? "Hide" : "Show"}
                        >
                          {decryptedSecrets.has(index) ? (
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => setEditingSecret({ index, secret })}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
        )}
        </div>
      </div>

      {/* Upgrade Modal - BLACK AND WHITE */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-black">Upgrade Your Vault</h2>
              <button
                onClick={() => setShowUpgrade(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(VaultTier).filter(v => typeof v === 'number').map((tier) => {
                const tierInfo = TIER_INFO[tier as VaultTier]
                const isCurrentTier = tier === vaultTier
                const price = getTierPriceInUsdc(tier as VaultTier)

                return (
                  <div
                    key={tier}
                    className={`border-2 rounded-2xl p-6 transition-all ${
                      isCurrentTier
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-2xl font-bold text-black mb-2">{tierInfo.name}</h3>
                      <div className="text-3xl font-bold text-black mb-1">
                        {price === 0 ? 'Free' : `$${price}`}
                      </div>
                      {price > 0 && <div className="text-sm text-gray-600">one-time payment</div>}
                    </div>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Up to {tierInfo.maxSecrets} secrets</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">AES-256 encryption</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Permanent on-chain storage</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Access from any wallet</span>
                      </li>
                    </ul>

                    <button
                      onClick={() => {
                        if (!isCurrentTier && tier as VaultTier > vaultTier) {
                          handleUpgradeTier(tier as VaultTier)
                        }
                      }}
                      disabled={isCurrentTier || (tier as VaultTier) < vaultTier}
                      className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                        isCurrentTier
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : (tier as VaultTier) < vaultTier
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {isCurrentTier ? 'Current Tier' : (tier as VaultTier) < vaultTier ? 'Lower Tier' : 'Upgrade'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Secret Modal - BLACK AND WHITE */}
      {isAddingSecret && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-black">Add New Secret</h2>
              <button
                onClick={() => setIsAddingSecret(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-black font-semibold mb-3">Secret Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.values(SecretType).filter(v => typeof v === 'number').map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewSecret({ ...newSecret, type: type as SecretType })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        newSecret.type === type
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-black font-medium">{getSecretTypeLabel(type as SecretType)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-black font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={newSecret.title}
                  onChange={(e) => setNewSecret({ ...newSecret, title: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
                  placeholder="e.g., My Gmail Password"
                />
              </div>

              <div>
                <label className="block text-black font-semibold mb-2">Secret Content</label>
                <textarea
                  value={newSecret.content}
                  onChange={(e) => setNewSecret({ ...newSecret, content: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors resize-none h-32"
                  placeholder="Enter your secret here..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsAddingSecret(false)}
                  className="flex-1 bg-gray-100 text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSecret}
                  disabled={loading || !newSecret.title.trim() || !newSecret.content.trim()}
                  className="flex-1 bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Save Secret'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Secret Modal - BLACK AND WHITE */}
      {editingSecret && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-black">Edit Secret</h2>
              <button
                onClick={() => setEditingSecret(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-black font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={editingSecret.secret.title}
                  onChange={(e) => setEditingSecret({
                    ...editingSecret,
                    secret: { ...editingSecret.secret, title: e.target.value }
                  })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
                  placeholder="e.g., My Gmail Password"
                />
              </div>

              <div>
                <label className="block text-black font-semibold mb-2">Secret Content</label>
                <textarea
                  value={editingSecret.secret.content}
                  onChange={(e) => setEditingSecret({
                    ...editingSecret,
                    secret: { ...editingSecret.secret, content: e.target.value }
                  })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors resize-none h-32"
                  placeholder="Enter your secret here..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditingSecret(null)}
                  className="flex-1 bg-gray-100 text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!masterKey || !editingSecret.secret.title.trim() || !editingSecret.secret.content.trim()) {
                      alert('Please fill in all fields')
                      return
                    }

                    // Delete old secret and add new one
                    try {
                      const deleteSuccess = await deleteVaultSecret(masterKey, editingSecret.index)
                      if (!deleteSuccess) {
                        alert('Failed to update secret')
                        return
                      }

                      const addSuccess = await addVaultSecret(
                        masterKey,
                        editingSecret.secret.secretType,
                        editingSecret.secret.title,
                        editingSecret.secret.content
                      )

                      if (addSuccess) {
                        setEditingSecret(null)
                        await loadVaultData()
                      } else {
                        alert('Failed to update secret')
                      }
                    } catch (err) {
                      console.error('Failed to update secret:', err)
                      alert(err instanceof Error ? err.message : 'Failed to update secret')
                    }
                  }}
                  disabled={loading || !editingSecret.secret.title.trim() || !editingSecret.secret.content.trim()}
                  className="flex-1 bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
