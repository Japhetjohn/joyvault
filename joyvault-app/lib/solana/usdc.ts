import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { getConnection, VaultTier, TIER_INFO } from './program'

// USDC Token Mint (Devnet)
export const USDC_MINT_DEVNET = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')

// USDC Token Mint (Mainnet)
export const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// Treasury wallet for USDC payments (placeholder - update with actual treasury wallet)
export const TREASURY_WALLET = new PublicKey('11111111111111111111111111111111')

// Use devnet USDC by default
export const USDC_MINT = USDC_MINT_DEVNET

// USDC has 6 decimals
const USDC_DECIMALS = 6

/**
 * Convert USDC amount to smallest unit (considering 6 decimals)
 */
export function usdcToSmallestUnit(amount: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)))
}

/**
 * Convert smallest unit to USDC amount
 */
export function smallestUnitToUsdc(amount: bigint): number {
  return Number(amount) / Math.pow(10, USDC_DECIMALS)
}

/**
 * Get USDC price for tier
 */
export function getTierPriceInUsdc(tier: VaultTier): number {
  const tierInfo = TIER_INFO[tier]
  return tierInfo.price // Price in USDC (1 USDC = $1)
}

/**
 * Get user's USDC token account address
 */
export async function getUserUsdcAccount(userPublicKey: PublicKey): Promise<PublicKey> {
  return await getAssociatedTokenAddress(USDC_MINT, userPublicKey)
}

/**
 * Get treasury's USDC token account address
 */
export async function getTreasuryUsdcAccount(): Promise<PublicKey> {
  return await getAssociatedTokenAddress(USDC_MINT, TREASURY_WALLET)
}

/**
 * Check if user has sufficient USDC balance
 */
export async function checkUsdcBalance(
  userPublicKey: PublicKey,
  requiredAmount: number
): Promise<{
  hasBalance: boolean
  currentBalance: number
  requiredBalance: number
}> {
  const connection = getConnection()

  try {
    const userTokenAccount = await getUserUsdcAccount(userPublicKey)
    const accountInfo = await connection.getAccountInfo(userTokenAccount)

    if (!accountInfo) {
      return {
        hasBalance: false,
        currentBalance: 0,
        requiredBalance: requiredAmount,
      }
    }

    // Parse token account data to get balance
    // Token account layout: https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs
    const data = accountInfo.data
    const balanceBuffer = data.slice(64, 72)
    const balance = new DataView(balanceBuffer.buffer).getBigUint64(0, true)
    const currentBalance = smallestUnitToUsdc(balance)

    return {
      hasBalance: currentBalance >= requiredAmount,
      currentBalance,
      requiredBalance: requiredAmount,
    }
  } catch (error) {
    console.error('Error checking USDC balance:', error)
    return {
      hasBalance: false,
      currentBalance: 0,
      requiredBalance: requiredAmount,
    }
  }
}

/**
 * Create instruction to create associated token account if needed
 */
async function createAssociatedTokenAccountIfNeeded(
  connection: Connection,
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): Promise<TransactionInstruction | null> {
  const associatedTokenAddress = await getAssociatedTokenAddress(mint, owner)

  const accountInfo = await connection.getAccountInfo(associatedTokenAddress)

  if (accountInfo) {
    return null // Account already exists
  }

  return createAssociatedTokenAccountInstruction(payer, associatedTokenAddress, owner, mint)
}

/**
 * Pay for tier upgrade with USDC
 */
export async function payWithUsdc(
  wallet: WalletContextState,
  tier: VaultTier
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return { success: false, error: 'Wallet not connected' }
  }

  const connection = getConnection()
  const amount = getTierPriceInUsdc(tier)

  if (amount === 0) {
    return { success: false, error: 'Free tier does not require payment' }
  }

  try {
    // Check balance first
    const balanceCheck = await checkUsdcBalance(wallet.publicKey, amount)

    if (!balanceCheck.hasBalance) {
      return {
        success: false,
        error: `Insufficient USDC balance. You have ${balanceCheck.currentBalance} USDC but need ${balanceCheck.requiredBalance} USDC`,
      }
    }

    const transaction = new Transaction()

    // Get or create treasury USDC account
    const treasuryUsdcAccount = await getTreasuryUsdcAccount()
    const createTreasuryAccountIx = await createAssociatedTokenAccountIfNeeded(
      connection,
      wallet.publicKey,
      TREASURY_WALLET,
      USDC_MINT
    )

    if (createTreasuryAccountIx) {
      transaction.add(createTreasuryAccountIx)
    }

    // Get user's USDC account
    const userUsdcAccount = await getUserUsdcAccount(wallet.publicKey)

    // Create transfer instruction
    const transferAmount = usdcToSmallestUnit(amount)
    const transferIx = createTransferInstruction(
      userUsdcAccount,
      treasuryUsdcAccount,
      wallet.publicKey,
      transferAmount,
      [],
      TOKEN_PROGRAM_ID
    )

    transaction.add(transferIx)

    // Set transaction details
    transaction.feePayer = wallet.publicKey
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    // Sign and send
    const signed = await wallet.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature, 'confirmed')

    return { success: true, signature }
  } catch (error) {
    console.error('USDC payment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    }
  }
}

/**
 * Request USDC airdrop (devnet only) for testing
 */
export async function requestUsdcAirdrop(
  wallet: WalletContextState,
  amount: number = 100
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (!wallet.publicKey) {
    return { success: false, error: 'Wallet not connected' }
  }

  // This is a simplified version - in reality, devnet USDC airdrops
  // would need to go through a faucet or test token dispenser
  // For now, this is just a placeholder

  console.warn('USDC airdrop not implemented - use a devnet USDC faucet')

  return {
    success: false,
    error: 'Please use a devnet USDC faucet to get test tokens',
  }
}

/**
 * Get USDC balance for display
 */
export async function getUsdcBalance(userPublicKey: PublicKey): Promise<number> {
  const connection = getConnection()

  try {
    const userTokenAccount = await getUserUsdcAccount(userPublicKey)
    const accountInfo = await connection.getAccountInfo(userTokenAccount)

    if (!accountInfo) {
      return 0
    }

    const data = accountInfo.data
    const balanceBuffer = data.slice(64, 72)
    const balance = new DataView(balanceBuffer.buffer).getBigUint64(0, true)

    return smallestUnitToUsdc(balance)
  } catch (error) {
    console.error('Error getting USDC balance:', error)
    return 0
  }
}

/**
 * Format USDC amount for display
 */
export function formatUsdc(amount: number): string {
  return `${amount.toFixed(2)} USDC`
}
