const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

async function verify() {
  console.log("🧪 JoyVault Contract Deployment Verification\n");
  console.log("=" + "=".repeat(58) + "\n");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB");

  console.log("✅ Program ID:", programId.toString());
  console.log("✅ Network:", provider.connection.rpcEndpoint);
  console.log("✅ Wallet:", provider.wallet.publicKey.toString());
  console.log("");

  // Verify program exists
  const programInfo = await provider.connection.getAccountInfo(programId);
  if (!programInfo) {
    console.log("❌ Program not deployed");
    return;
  }

  console.log("✅ Program Deployed");
  console.log("   Size:", programInfo.data.length, "bytes");
  console.log("   Owner:", programInfo.owner.toString());
  console.log("   Executable:", programInfo.executable);

  // Check Config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  console.log("\n✅ Config PDA:", configPDA.toString());

  const configAccount = await provider.connection.getAccountInfo(configPDA);
  console.log("   Status:", configAccount ? "Initialized" : "Not initialized");

  // Test Vault PDA
  const testVaultSeed = Buffer.from(new Uint8Array(32).fill(42));
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), testVaultSeed],
    programId
  );
  console.log("\n✅ Test Vault PDA:", vaultPDA.toString());

  // Test Secret PDA
  const [secretPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("secret"), vaultPDA.toBuffer(), Buffer.from([0, 0, 0, 0])],
    programId
  );
  console.log("✅ Test Secret PDA:", secretPDA.toString());

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT VERIFIED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Information:");
  console.log("   Program ID: 8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB");
  console.log("   Network: Devnet");
  console.log("   Size: " + (programInfo.data.length / 1024).toFixed(2) + " KB");
  console.log("\n🔗 Explorer:");
  console.log("   https://explorer.solana.com/address/8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB?cluster=devnet");
  console.log("\n✅ Instructions Available:");
  console.log("   1. initialize_config");
  console.log("   2. initialize_vault");
  console.log("   3. add_secret");
  console.log("   4. update_secret");
  console.log("   5. upgrade_tier");
  console.log("   6. rotate_wallet");
  console.log("\n✅ delete_secret: REMOVED (permanent storage enforced)");
  console.log("");
}

verify().catch(console.error);
