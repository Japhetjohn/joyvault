const anchor = require('@coral-xyz/anchor')
const { PublicKey, Keypair} = require('@solana/web3.js')
const fs = require('fs')
const path = require('path')
const os = require('os')

async function main() {
  console.log('🚀 Initializing JoyVault Config on Devnet...\n')

  // Configure the client to use devnet
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed')

  // Load wallet from Solana CLI config
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  )

  console.log('✅ Using wallet:', walletKeypair.publicKey.toString())

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey)
  console.log('   Balance:', (balance / 1e9).toFixed(4), 'SOL\n')

  const wallet = new anchor.Wallet(walletKeypair)
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
  anchor.setProvider(provider)

  const programId = new PublicKey('8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB')

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/joyvault_contract.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new anchor.Program(idl, provider)

  console.log('📋 Program ID:', programId.toString())

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  )

  console.log('📋 Config PDA:', configPDA.toString(), '\n')

  // Check if config already exists
  try {
    const configAccount = await connection.getAccountInfo(configPDA)
    if (configAccount) {
      console.log('✅ Config already initialized!')
      try {
        const configData = await program.account.globalConfig.fetch(configPDA)
        console.log('📊 Current Config:')
        console.log('   Treasury:', configData.treasuryWallet.toString())
        console.log('   Tier Prices:')
        console.log('     Free:', configData.tierPrices[0].toString(), 'lamports')
        console.log('     Starter:', configData.tierPrices[1].toString(), 'lamports', `(${(configData.tierPrices[1].toNumber() / 1e9).toFixed(3)} SOL)`)
        console.log('     Pro:', configData.tierPrices[2].toString(), 'lamports', `(${(configData.tierPrices[2].toNumber() / 1e9).toFixed(3)} SOL)`)
        console.log('     Ultra:', configData.tierPrices[3].toString(), 'lamports', `(${(configData.tierPrices[3].toNumber() / 1e9).toFixed(3)} SOL)`)
      } catch (e) {
        console.log('   (Could not parse config data)')
      }
      return
    }
  } catch (error) {
    console.log('⏳ Config not initialized yet, proceeding...\n')
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

  // Per-secret fee: 0.001 SOL = 1,000,000 lamports (~$0.15)
  const pricePerSecretLamports = new anchor.BN(1_000_000)

  console.log('📝 Initializing config with:')
  console.log('   Treasury wallet:', treasuryWallet.toString())
  console.log('   Per-secret fee: 0.001 SOL ≈ $0.15')
  console.log('   Tier prices:')
  console.log('     Free: 0 SOL')
  console.log('     Starter: 0.033 SOL ≈ $5')
  console.log('     Pro: 0.133 SOL ≈ $20')
  console.log('     Ultra: 0.333 SOL ≈ $50')
  console.log('\n💰 Revenue streams:')
  console.log('   1. Per-secret fee: User pays 0.001 SOL every time they add a secret')
  console.log('   2. Tier upgrades: User pays 0.033/0.133/0.333 SOL to upgrade tiers')
  console.log('   All payments go to:', treasuryWallet.toString())
  console.log()

  try {
    console.log('⏳ Sending transaction...')

    const tx = await program.methods
      .initializeConfig(
        treasuryWallet,
        pricePerSecretLamports,
        tierPrices
      )
      .accountsStrict({
        config: configPDA,
        admin: walletKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    console.log('\n✅ Config initialized successfully!')
    console.log('📋 Transaction:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`)
    console.log()
    console.log('💰 All tier upgrade payments will now go to:')
    console.log('   ', treasuryWallet.toString())
  } catch (error) {
    console.error('\n❌ Failed to initialize config:')
    console.error(error)

    if (error.logs) {
      console.log('\n📋 Program Logs:')
      error.logs.forEach(log => console.log('  ', log))
    }

    throw error
  }
}

main()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
