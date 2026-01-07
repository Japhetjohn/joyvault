import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js'
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor'
import { WalletContextState } from '@solana/wallet-adapter-react'

// Program ID (update after deployment)
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

  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  // Check if vault already exists
  const vaultInfo = await connection.getAccountInfo(vaultPDA)
  if (vaultInfo) {
    throw new Error('Vault already exists for this Life Phrase')
  }

  // Create instruction
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([
      1, // instruction index for initialize_vault
      ...Array.from(vaultSeed),
    ]),
  })

  const transaction = new Transaction().add(instruction)
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  return signature
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

    // Parse vault data (simplified - adjust based on actual layout)
    const data = vaultInfo.data
    const owner = new PublicKey(data.slice(8, 40))
    const tier = data[72] as VaultTier
    const secretCount = data.readUInt32LE(73)

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

  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  // Get current secret count
  const vault = await fetchVault(vaultSeed)
  if (!vault) {
    throw new Error('Vault not found')
  }

  const [secretPDA] = deriveSecretPDA(vaultPDA, vault.secretCount)

  // Create instruction data
  const instructionData = Buffer.concat([
    Buffer.from([2]), // instruction index for add_secret
    Buffer.from([secretType]),
    Buffer.from(new Uint32Array([ciphertext.length]).buffer),
    Buffer.from(ciphertext),
    Buffer.from(nonce),
  ])

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: secretPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  })

  const transaction = new Transaction().add(instruction)
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  return signature
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

  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)
  const [secretPDA] = deriveSecretPDA(vaultPDA, secretIndex)

  const instructionData = Buffer.concat([
    Buffer.from([3]), // instruction index for update_secret
    Buffer.from(new Uint32Array([ciphertext.length]).buffer),
    Buffer.from(ciphertext),
    Buffer.from(nonce),
  ])

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: false },
      { pubkey: secretPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    data: instructionData,
  })

  const transaction = new Transaction().add(instruction)
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  return signature
}

/**
 * Delete a secret
 */
export async function deleteSecret(
  wallet: WalletContextState,
  vaultSeed: Uint8Array,
  secretIndex: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected')
  }

  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)
  const [secretPDA] = deriveSecretPDA(vaultPDA, secretIndex)

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: secretPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([4]), // instruction index for delete_secret
  })

  const transaction = new Transaction().add(instruction)
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  return signature
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

  const connection = getConnection()
  const [configPDA] = deriveConfigPDA()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  // Get treasury wallet from config (you'll need to fetch this from the config account)
  // For now, using a placeholder - update after config is initialized
  const treasuryWallet = new PublicKey('11111111111111111111111111111111')

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: treasuryWallet, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([5, newTier]), // instruction index for upgrade_tier + tier
  })

  const transaction = new Transaction().add(instruction)
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  return signature
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

  const connection = getConnection()
  const [vaultPDA] = deriveVaultPDA(vaultSeed)

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([6]), // instruction index for rotate_wallet
      newOwner.toBuffer(),
    ]),
  })

  const transaction = new Transaction().add(instruction)
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(signature, 'confirmed')

  return signature
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
        // Parse secret data (simplified - adjust based on actual layout)
        const data = secretInfo.data
        const secretType = data[40] as SecretType
        const ciphertextLen = data.readUInt32LE(41)
        const ciphertext = data.slice(45, 45 + ciphertextLen)
        const nonce = data.slice(45 + ciphertextLen, 57 + ciphertextLen)
        const createdAt = Number(
          new DataView(data.buffer, data.byteOffset + 57 + ciphertextLen, 8).getBigInt64(0, true)
        )

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
