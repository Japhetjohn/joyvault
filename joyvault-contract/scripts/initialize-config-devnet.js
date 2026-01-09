const anchor = require('@coral-xyz/anchor')
const { PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')

async function main() {
  // Configure the client to use devnet
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed')

  // Use the test wallet we created earlier
  const testWalletPrivateKey = [
    174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56, 222, 53,
    138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246, 123, 154, 216, 120,
    11, 247, 163, 153, 211, 169, 236, 72, 192, 200, 31, 185, 215, 129, 240, 90, 77, 233,
    138, 175, 238, 66, 105, 148, 99, 246, 157, 67
  ]
  const testWalletKeypair = Keypair.fromSecretKey(Buffer.from(testWalletPrivateKey))

  console.log('Test wallet:', testWalletKeypair.publicKey.toString())

  const wallet = new anchor.Wallet(testWalletKeypair)
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
  anchor.setProvider(provider)

  const programId = new PublicKey('8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB')

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/joyvault_contract.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new anchor.Program(idl, provider)

  console.log('Program ID:', programId.toString())

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
      const configData = await program.account.globalConfig.fetch(configPDA)
      console.log('Treasury wallet:', configData.treasuryWallet.toString())
      console.log('Tier prices:', configData.tierPrices.map(p => p.toString()))
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
      .accountsStrict({
        config: configPDA,
        admin: testWalletKeypair.publicKey,
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
