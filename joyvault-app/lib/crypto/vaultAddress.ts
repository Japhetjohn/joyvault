import { PublicKey } from '@solana/web3.js'

export async function deriveVaultSeed(masterKey: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', masterKey)
  return new Uint8Array(hashBuffer)
}

export async function deriveVaultAddress(
  masterKey: Uint8Array,
  programId: PublicKey
): Promise<{ vaultPDA: PublicKey; vaultSeed: Uint8Array }> {
  const vaultSeed = await deriveVaultSeed(masterKey)

  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), Buffer.from(vaultSeed)],
    programId
  )

  return {
    vaultPDA,
    vaultSeed,
  }
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
