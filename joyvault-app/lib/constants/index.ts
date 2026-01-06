import { PublicKey } from '@solana/web3.js'

export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'

export const RPC_ENDPOINT =
  SOLANA_NETWORK === 'mainnet'
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ||
      'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com'

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    '11111111111111111111111111111111'
)

export const USDC_MINT_DEVNET = new PublicKey(
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
)

export const USDC_MINT_MAINNET = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
)

export const USDC_MINT =
  SOLANA_NETWORK === 'mainnet' ? USDC_MINT_MAINNET : USDC_MINT_DEVNET

export enum VaultTier {
  Free = 0,
  Starter = 1,
  Pro = 2,
  Ultra = 3,
}

export const TIER_LIMITS: Record<VaultTier, number> = {
  [VaultTier.Free]: 1,
  [VaultTier.Starter]: 10,
  [VaultTier.Pro]: 100,
  [VaultTier.Ultra]: 500,
}

export const TIER_PRICES: Record<VaultTier, number> = {
  [VaultTier.Free]: 0,
  [VaultTier.Starter]: 5,
  [VaultTier.Pro]: 20,
  [VaultTier.Ultra]: 50,
}

export const SECRET_PRICE = 1
export const UPDATE_PRICE = 0.5
