import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor'
import { WalletContextState } from '@solana/wallet-adapter-react'
import IDL from './joyvault_contract.json'

// Program ID
export const PROGRAM_ID = new PublicKey('8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB')

// RPC Endpoint
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com'

// Vault Tiers
export enum VaultTier {
  Free = 0,
  Starter = 1,
  Pro = 2,
  Ultra = 3,
}

// Secret Types
export enum SecretType {
  Password = 0,
  ApiKey = 1,
  SeedPhrase = 2,
  PrivateKey = 3,
  Note = 4,
  Custom = 5,
}

// Tier Info (One-Time Payment)
export const TIER_INFO = {
  [VaultTier.Free]: { name: 'Free', maxSecrets: 1, price: 0 },
  [VaultTier.Starter]: { name: 'Starter', maxSecrets: 10, price: 5 },
  [VaultTier.Pro]: { name: 'Pro', maxSecrets: 100, price: 20 },
  [VaultTier.Ultra]: { name: 'Ultra', maxSecrets: 500, price: 50 },
}

/**
 * Get Solana connection
 */
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, 'confirmed')
}

/**
 * Get Anchor program instance
 */
export function getProgram(wallet: WalletContextState) {
  const connection = getConnection()

  // Create a dummy wallet if no wallet connected (for read-only operations)
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  )

  return new Program(IDL as any, provider)
}

/**
 * Derive Config PDA
 */
export function deriveConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)
}

/**
 * Derive Vault PDA from vault seed
 */
export function deriveVaultPDA(vaultSeed: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), Buffer.from(vaultSeed)],
    PROGRAM_ID
  )
}

/**
 * Derive Secret PDA
 */
export function deriveSecretPDA(vaultAddress: PublicKey, secretIndex: number): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(secretIndex)

  return PublicKey.findProgramAddressSync(
    [Buffer.from('secret'), vaultAddress.toBuffer(), indexBuffer],
    PROGRAM_ID
  )
}

/**
 * Initialize a vault on-chain
 */
export async function initializeVault(
  wallet: WalletContextState,
  vaultSeed: Uint8Array
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const program = getProgram(wallet)
  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  // Check if vault already exists
  const vaultInfo = await connection.getAccountInfo(vaultPDA)
  if (vaultInfo) {
    throw new Error('Vault already exists for this Life Phrase')
  }

  // Convert vaultSeed to array format for Anchor
  const vaultSeedArray = Array.from(vaultSeed)

  const tx = await program.methods
    .initializeVault(vaultSeedArray)
    .accounts({
      vault: vaultPDA,
      owner: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc()

  return tx
}

/**
 * Fetch vault data
 */
export async function fetchVault(vaultSeed: Uint8Array): Promise<{
  owner: PublicKey
  tier: VaultTier
  secretCount: number
} | null> {
  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  try {
    const vaultInfo = await connection.getAccountInfo(vaultPDA)
    if (!vaultInfo) return null

    // Parse vault data using Anchor's account layout
    const data = vaultInfo.data

    // Anchor discriminator (8 bytes) + owner (32 bytes) + vault_seed (32 bytes) + tier (1 byte) + secret_count (4 bytes) + bump (1 byte)
    const owner = new PublicKey(data.slice(8, 40))
    // vault_seed is at 40-72 (we skip it)
    const tierByte = data[72]
    const secretCount = data.readUInt32LE(73)

    // Map tier byte to enum
    let tier: VaultTier
    if (tierByte === 0) tier = VaultTier.Free
    else if (tierByte === 1) tier = VaultTier.Starter
    else if (tierByte === 2) tier = VaultTier.Pro
    else if (tierByte === 3) tier = VaultTier.Ultra
    else tier = VaultTier.Free

    return { owner, tier, secretCount }
  } catch (error) {
    console.error('Error fetching vault:', error)
    return null
  }
}

/**
 * Add a secret to the vault
 */
export async function addSecret(
  wallet: WalletContextState,
  vaultSeed: Uint8Array,
  secretType: SecretType,
  ciphertext: Uint8Array,
  nonce: Uint8Array
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const program = getProgram(wallet)
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  // Get current secret count
  const vault = await fetchVault(vaultSeed)
  if (!vault) {
    throw new Error('Vault not found')
  }

  const [secretPDA] = deriveSecretPDA(vaultPDA, vault.secretCount)

  // Convert secret type to Anchor enum format
  let secretTypeEnum
  if (secretType === SecretType.Password) secretTypeEnum = { password: {} }
  else if (secretType === SecretType.ApiKey) secretTypeEnum = { apiKey: {} }
  else if (secretType === SecretType.SeedPhrase) secretTypeEnum = { seedPhrase: {} }
  else if (secretType === SecretType.PrivateKey) secretTypeEnum = { privateKey: {} }
  else if (secretType === SecretType.Note) secretTypeEnum = { note: {} }
  else secretTypeEnum = { custom: {} }

  const tx = await program.methods
    .addSecret(
      secretTypeEnum,
      Buffer.from(ciphertext),
      Array.from(nonce)
    )
    .accounts({
      vault: vaultPDA,
      secret: secretPDA,
      owner: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc()

  return tx
}

/**
 * Update an existing secret
 */
export async function updateSecret(
  wallet: WalletContextState,
  vaultSeed: Uint8Array,
  secretIndex: number,
  ciphertext: Uint8Array,
  nonce: Uint8Array
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const program = getProgram(wallet)
  const [vaultPDA] = deriveVaultPDA(vaultSeed)
  const [secretPDA] = deriveSecretPDA(vaultPDA, secretIndex)

  const tx = await program.methods
    .updateSecret(
      Buffer.from(ciphertext),
      Array.from(nonce)
    )
    .accounts({
      vault: vaultPDA,
      secret: secretPDA,
      owner: wallet.publicKey,
    })
    .rpc()

  return tx
}

/**
 * Delete a secret (NOTE: This may not exist in the contract anymore)
 */
export async function deleteSecret(
  wallet: WalletContextState,
  vaultSeed: Uint8Array,
  secretIndex: number
): Promise<string> {
  throw new Error('Delete secret functionality has been removed from the contract for permanent storage')
}

/**
 * Upgrade vault tier
 */
export async function upgradeTier(
  wallet: WalletContextState,
  vaultSeed: Uint8Array,
  newTier: VaultTier
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const program = getProgram(wallet)
  const connection = getConnection()
  const [configPDA] = deriveConfigPDA()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  // Fetch config to get treasury wallet
  const configAccount = await connection.getAccountInfo(configPDA)
  if (!configAccount) {
    throw new Error('Global config not initialized')
  }

  // Parse treasury wallet from config (discriminator 8 bytes + admin 32 bytes + treasury 32 bytes)
  const treasuryWallet = new PublicKey(configAccount.data.slice(40, 72))

  // Convert tier to Anchor enum format
  let tierEnum
  if (newTier === VaultTier.Free) tierEnum = { free: {} }
  else if (newTier === VaultTier.Starter) tierEnum = { starter: {} }
  else if (newTier === VaultTier.Pro) tierEnum = { pro: {} }
  else if (newTier === VaultTier.Ultra) tierEnum = { ultra: {} }
  else tierEnum = { free: {} }

  const tx = await program.methods
    .upgradeTier(tierEnum)
    .accounts({
      config: configPDA,
      vault: vaultPDA,
      payer: wallet.publicKey,
      owner: wallet.publicKey,
      treasury: treasuryWallet,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc()

  return tx
}

/**
 * Rotate wallet (change vault owner)
 */
export async function rotateWallet(
  wallet: WalletContextState,
  vaultSeed: Uint8Array,
  newOwner: PublicKey
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const program = getProgram(wallet)
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  const tx = await program.methods
    .rotateWallet(newOwner)
    .accounts({
      vault: vaultPDA,
      owner: wallet.publicKey,
    })
    .rpc()

  return tx
}

/**
 * Fetch all secrets for a vault
 */
export async function fetchVaultSecrets(
  vaultSeed: Uint8Array
): Promise<
  Array<{
    index: number
    secretType: SecretType
    ciphertext: Uint8Array
    nonce: Uint8Array
    createdAt: number
  }>
> {
  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  const vault = await fetchVault(vaultSeed)
  if (!vault) return []

  const secrets = []

  for (let i = 0; i < vault.secretCount; i++) {
    const [secretPDA] = deriveSecretPDA(vaultPDA, i)

    try {
      const secretInfo = await connection.getAccountInfo(secretPDA)
      if (secretInfo) {
        // Parse secret data
        // Anchor discriminator (8 bytes) + vault (32 bytes) + secret_type (1 byte) + ciphertext_len (4 bytes) + ciphertext + nonce (12 bytes) + created_at (8 bytes) + bump (1 byte)
        const data = secretInfo.data
        const secretTypeByte = data[40]
        const ciphertextLen = data.readUInt32LE(41)
        // Create new Uint8Arrays to avoid buffer sharing issues
        const ciphertext = new Uint8Array(data.slice(45, 45 + ciphertextLen))
        const nonce = new Uint8Array(data.slice(45 + ciphertextLen, 45 + ciphertextLen + 12))
        const createdAt = Number(
          new DataView(data.buffer, data.byteOffset + 57 + ciphertextLen, 8).getBigInt64(0, true)
        )

        // Map secret type byte to enum
        let secretType: SecretType
        if (secretTypeByte === 0) secretType = SecretType.Password
        else if (secretTypeByte === 1) secretType = SecretType.ApiKey
        else if (secretTypeByte === 2) secretType = SecretType.SeedPhrase
        else if (secretTypeByte === 3) secretType = SecretType.PrivateKey
        else if (secretTypeByte === 4) secretType = SecretType.Note
        else if (secretTypeByte === 5) secretType = SecretType.Custom
        else secretType = SecretType.Custom

        secrets.push({
          index: i,
          secretType,
          ciphertext,
          nonce,
          createdAt,
        })
      }
    } catch (error) {
      console.error(`Error fetching secret ${i}:`, error)
    }
  }

  return secrets
}
