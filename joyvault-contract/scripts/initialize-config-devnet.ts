import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { JoyvaultContract } from '../target/types/joyvault_contract'
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import fs from 'fs'
import path from 'path'

async function main() {
  // Configure the client to use devnet
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed')

  // Load deployer keypair
  const deployerKeypairPath = path.join(__dirname, '../target/deploy/joyvault_contract-keypair.json')
  const deployerKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(deployerKeypairPath, 'utf-8')))
  )

  const wallet = new anchor.Wallet(deployerKeypair)
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
  anchor.setProvider(provider)

  const programId = new PublicKey('8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB')
  const program = anchor.workspace.JoyvaultContract as Program<JoyvaultContract>

  console.log('Program ID:', programId.toString())
  console.log('Deployer:', deployerKeypair.publicKey.toString())

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )

  console.log('Config PDA:', configPDA.toString())

  // Check if config already exists
  try {
    const configAccount = await connection.getAccountInfo(configPDA)
    if (configAccount) {
      console.log('✅ Config already initialized!')
      return
    }
  } catch (error) {
    console.log('Config not initialized yet, proceeding...')
  }

  // Treasury wallet (YOUR wallet address)
  const treasuryWallet = new PublicKey('6mLCDN4VkJYqnsrbWf2PWGZkhnRazgudSFknd3AcSFvm')

  // Tier prices in lamports
  // Assuming SOL = $150:
  // - Free: $0 = 0 lamports
  // - Starter: $5 = 0.0333 SOL = 33,333,333 lamports
  // - Pro: $20 = 0.1333 SOL = 133,333,333 lamports
  // - Ultra: $50 = 0.3333 SOL = 333,333,333 lamports
  const tierPrices = [
    new anchor.BN(0),                      // Free
    new anchor.BN(33_333_333),             // Starter (~$5)
    new anchor.BN(133_333_333),            // Pro (~$20)
    new anchor.BN(333_333_333),            // Ultra (~$50)
  ]

  const pricePerSecretLamports = new anchor.BN(0) // Not used currently

  console.log('\nInitializing config with:')
  console.log('Treasury wallet:', treasuryWallet.toString())
  console.log('Tier prices (lamports):')
  console.log('  Free:', tierPrices[0].toString(), '(0 SOL)')
  console.log('  Starter:', tierPrices[1].toString(), '(~0.033 SOL ≈ $5)')
  console.log('  Pro:', tierPrices[2].toString(), '(~0.133 SOL ≈ $20)')
  console.log('  Ultra:', tierPrices[3].toString(), '(~0.333 SOL ≈ $50)')

  try {
    const tx = await program.methods
      .initializeConfig(
        treasuryWallet,
        pricePerSecretLamports,
        tierPrices
      )
      .accounts({
        config: configPDA,
        admin: deployerKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    console.log('\n✅ Config initialized successfully!')
    console.log('Transaction signature:', tx)
  } catch (error) {
    console.error('❌ Failed to initialize config:', error)
    throw error
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
