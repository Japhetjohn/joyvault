import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  initializeVault,
  fetchVault,
  addSecret,
  updateSecret,
  deleteSecret,
  upgradeTier,
  rotateWallet,
  fetchVaultSecrets,
  VaultTier,
  SecretType,
} from '@/lib/solana/program'
import { deriveVaultSeed } from '@/lib/crypto/vaultAddress'
import { encrypt, decrypt } from '@/lib/crypto/encryption'
import { PublicKey } from '@solana/web3.js'

export interface VaultData {
  owner: string
  tier: VaultTier
  secretCount: number
}

export interface Secret {
  index: number
  secretType: SecretType
  title: string
  content: string
  createdAt: number
}

export function useVault() {
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Create a new vault
   */
  const createVault = useCallback(
    async (masterKey: Uint8Array): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const vaultSeed = await deriveVaultSeed(masterKey)
        await initializeVault(wallet, vaultSeed)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create vault'
        setError(message)
        console.error('Create vault error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [wallet]
  )

  /**
   * Get vault information
   */
  const getVault = useCallback(async (masterKey: Uint8Array): Promise<VaultData | null> => {
    setLoading(true)
    setError(null)

    try {
      const vaultSeed = await deriveVaultSeed(masterKey)
      const vault = await fetchVault(vaultSeed)

      if (!vault) return null

      return {
        owner: vault.owner.toBase58(),
        tier: vault.tier,
        secretCount: vault.secretCount,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch vault'
      setError(message)
      console.error('Get vault error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Add a new secret
   */
  const addVaultSecret = useCallback(
    async (
      masterKey: Uint8Array,
      secretType: SecretType,
      title: string,
      content: string
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const vaultSeed = await deriveVaultSeed(masterKey)

        // Encrypt the secret
        const secretData = JSON.stringify({ title, content })
        const { ciphertext, nonce } = await encrypt(masterKey, secretData)

        await addSecret(wallet, vaultSeed, secretType, ciphertext, nonce)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add secret'
        setError(message)
        console.error('Add secret error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [wallet]
  )

  /**
   * Update an existing secret
   */
  const updateVaultSecret = useCallback(
    async (
      masterKey: Uint8Array,
      secretIndex: number,
      title: string,
      content: string
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const vaultSeed = await deriveVaultSeed(masterKey)

        // Encrypt the updated secret
        const secretData = JSON.stringify({ title, content })
        const { ciphertext, nonce } = await encrypt(masterKey, secretData)

        await updateSecret(wallet, vaultSeed, secretIndex, ciphertext, nonce)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update secret'
        setError(message)
        console.error('Update secret error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [wallet]
  )

  /**
   * Delete a secret
   */
  const deleteVaultSecret = useCallback(
    async (masterKey: Uint8Array, secretIndex: number): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const vaultSeed = await deriveVaultSeed(masterKey)
        await deleteSecret(wallet, vaultSeed, secretIndex)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete secret'
        setError(message)
        console.error('Delete secret error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [wallet]
  )

  /**
   * Upgrade vault tier
   */
  const upgradeVaultTier = useCallback(
    async (masterKey: Uint8Array, newTier: VaultTier): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const vaultSeed = await deriveVaultSeed(masterKey)
        await upgradeTier(wallet, vaultSeed, newTier)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upgrade tier'
        setError(message)
        console.error('Upgrade tier error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [wallet]
  )

  /**
   * Rotate wallet (change vault owner)
   */
  const rotateVaultWallet = useCallback(
    async (masterKey: Uint8Array, newOwner: string): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const vaultSeed = await deriveVaultSeed(masterKey)
        const newOwnerPubkey = new PublicKey(newOwner)
        await rotateWallet(wallet, vaultSeed, newOwnerPubkey)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rotate wallet'
        setError(message)
        console.error('Rotate wallet error:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [wallet]
  )

  /**
   * Get all secrets and decrypt them
   */
  const getVaultSecrets = useCallback(async (masterKey: Uint8Array): Promise<Secret[]> => {
    setLoading(true)
    setError(null)

    try {
      const vaultSeed = await deriveVaultSeed(masterKey)
      const encryptedSecrets = await fetchVaultSecrets(vaultSeed)

      const decryptedSecrets: Secret[] = []

      for (const secret of encryptedSecrets) {
        try {
          const decrypted = await decrypt(masterKey, secret.ciphertext, secret.nonce)
          const { title, content } = JSON.parse(decrypted)

          decryptedSecrets.push({
            index: secret.index,
            secretType: secret.secretType,
            title,
            content,
            createdAt: secret.createdAt,
          })
        } catch (decryptError) {
          console.error(`Failed to decrypt secret ${secret.index}:`, decryptError)
        }
      }

      return decryptedSecrets
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch secrets'
      setError(message)
      console.error('Get secrets error:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createVault,
    getVault,
    addVaultSecret,
    updateVaultSecret,
    deleteVaultSecret,
    upgradeVaultTier,
    rotateVaultWallet,
    getVaultSecrets,
  }
}
