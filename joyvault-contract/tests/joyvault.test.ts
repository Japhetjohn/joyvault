import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JoyvaultContract } from "../target/types/joyvault_contract";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("JoyVault Contract Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.JoyvaultContract as Program<JoyvaultContract>;

  // Test accounts
  const admin = provider.wallet as anchor.Wallet;
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const treasury = Keypair.generate();

  // Test data
  const vaultSeed = Buffer.from(new Uint8Array(32).fill(1)); // Simulated vault seed from master key hash
  const testCiphertext = Buffer.from("encrypted_secret_data");
  const testNonce = new Uint8Array(12).fill(2);

  // Tier prices (in lamports)
  const tierPrices = [
    0,                        // Free
    0.1 * LAMPORTS_PER_SOL,   // Starter
    1 * LAMPORTS_PER_SOL,     // Pro
    5 * LAMPORTS_PER_SOL,     // Ultra
  ];

  // PDAs
  let configPDA: PublicKey;
  let vaultPDA: PublicKey;
  let secretPDA: PublicKey;

  before(async () => {
    // Airdrop to test users
    const airdropSig = await provider.connection.requestAirdrop(
      user1.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const airdropSig2 = await provider.connection.requestAirdrop(
      user2.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig2);

    // Derive PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultSeed],
      program.programId
    );
  });

  describe("Initialize Config", () => {
    it("should initialize global config", async () => {
      await program.methods
        .initializeConfig(
          treasury.publicKey,
          1000, // price per secret in lamports
          tierPrices
        )
        .accounts({
          config: configPDA,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.globalConfig.fetch(configPDA);

      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.treasuryWallet.toString()).to.equal(treasury.publicKey.toString());
      expect(config.pricePerSecretLamports.toNumber()).to.equal(1000);
      expect(config.tierPrices.map(p => p.toNumber())).to.deep.equal(
        tierPrices.map(p => Number(p))
      );
    });

    it("should fail to initialize config twice", async () => {
      try {
        await program.methods
          .initializeConfig(
            treasury.publicKey,
            1000,
            tierPrices
          )
          .accounts({
            config: configPDA,
            admin: admin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Initialize Vault", () => {
    it("should initialize a vault for user", async () => {
      await program.methods
        .initializeVault(Array.from(vaultSeed))
        .accounts({
          vault: vaultPDA,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPDA);

      expect(vault.owner.toString()).to.equal(user1.publicKey.toString());
      expect(vault.tier).to.deep.equal({ free: {} });
      expect(vault.secretCount).to.equal(0);
    });
  });

  describe("Add Secret", () => {
    it("should add a secret to the vault", async () => {
      // Derive secret PDA
      const vaultAccount = await program.account.vault.fetch(vaultPDA);
      [secretPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("secret"),
          vaultPDA.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([vaultAccount.secretCount]).buffer))
        ],
        program.programId
      );

      await program.methods
        .addSecret(
          { password: {} }, // SecretType::Password
          Array.from(testCiphertext),
          Array.from(testNonce)
        )
        .accounts({
          vault: vaultPDA,
          secret: secretPDA,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const secret = await program.account.encryptedSecret.fetch(secretPDA);
      const vault = await program.account.vault.fetch(vaultPDA);

      expect(secret.vault.toString()).to.equal(vaultPDA.toString());
      expect(secret.secretType).to.deep.equal({ password: {} });
      expect(Buffer.from(secret.ciphertext)).to.deep.equal(testCiphertext);
      expect(vault.secretCount).to.equal(1);
    });

    it("should fail when vault capacity is reached (Free tier = 1 secret)", async () => {
      const vaultAccount = await program.account.vault.fetch(vaultPDA);
      const [newSecretPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("secret"),
          vaultPDA.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([vaultAccount.secretCount]).buffer))
        ],
        program.programId
      );

      try {
        await program.methods
          .addSecret(
            { apiKey: {} },
            Array.from(Buffer.from("another_secret")),
            Array.from(testNonce)
          )
          .accounts({
            vault: vaultPDA,
            secret: newSecretPDA,
            owner: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();

        expect.fail("Should have thrown capacity error");
      } catch (error) {
        expect(error.message).to.include("Vault capacity reached");
      }
    });

    it("should fail with secret larger than 1KB", async () => {
      const largeCiphertext = Buffer.alloc(2000); // 2KB - exceeds limit
      const vaultAccount = await program.account.vault.fetch(vaultPDA);
      const [newSecretPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("secret"),
          vaultPDA.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([vaultAccount.secretCount]).buffer))
        ],
        program.programId
      );

      try {
        await program.methods
          .addSecret(
            { note: {} },
            Array.from(largeCiphertext),
            Array.from(testNonce)
          )
          .accounts({
            vault: vaultPDA,
            secret: newSecretPDA,
            owner: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();

        expect.fail("Should have thrown size error");
      } catch (error) {
        expect(error.message).to.include("Secret exceeds maximum size");
      }
    });
  });

  describe("Update Secret", () => {
    it("should update an existing secret", async () => {
      const newCiphertext = Buffer.from("updated_encrypted_data");
      const newNonce = new Uint8Array(12).fill(3);

      await program.methods
        .updateSecret(
          Array.from(newCiphertext),
          Array.from(newNonce)
        )
        .accounts({
          vault: vaultPDA,
          secret: secretPDA,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const secret = await program.account.encryptedSecret.fetch(secretPDA);

      expect(Buffer.from(secret.ciphertext)).to.deep.equal(newCiphertext);
      expect(Buffer.from(secret.nonce)).to.deep.equal(Buffer.from(newNonce));
    });

    it("should fail when non-owner tries to update", async () => {
      try {
        await program.methods
          .updateSecret(
            Array.from(Buffer.from("hacker_data")),
            Array.from(testNonce)
          )
          .accounts({
            vault: vaultPDA,
            secret: secretPDA,
            owner: user2.publicKey,
          })
          .signers([user2])
          .rpc();

        expect.fail("Should have thrown unauthorized error");
      } catch (error) {
        expect(error.message).to.include("has_one");
      }
    });
  });

  describe("Upgrade Tier", () => {
    it("should upgrade vault to Starter tier", async () => {
      const initialBalance = await provider.connection.getBalance(treasury.publicKey);

      await program.methods
        .upgradeTier({ starter: {} })
        .accounts({
          config: configPDA,
          vault: vaultPDA,
          payer: user1.publicKey,
          owner: user1.publicKey,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPDA);
      const finalBalance = await provider.connection.getBalance(treasury.publicKey);

      expect(vault.tier).to.deep.equal({ starter: {} });
      expect(finalBalance - initialBalance).to.equal(Number(tierPrices[1]));
    });

    it("should fail to downgrade tier", async () => {
      try {
        await program.methods
          .upgradeTier({ free: {} })
          .accounts({
            config: configPDA,
            vault: vaultPDA,
            payer: user1.publicKey,
            owner: user1.publicKey,
            treasury: treasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();

        expect.fail("Should have thrown downgrade error");
      } catch (error) {
        expect(error.message).to.include("Invalid tier upgrade");
      }
    });

    it("should allow adding more secrets after upgrade", async () => {
      // Now with Starter tier (10 secrets max), we can add more
      const vaultAccount = await program.account.vault.fetch(vaultPDA);
      const [newSecretPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("secret"),
          vaultPDA.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([vaultAccount.secretCount]).buffer))
        ],
        program.programId
      );

      await program.methods
        .addSecret(
          { apiKey: {} },
          Array.from(Buffer.from("api_key_secret")),
          Array.from(testNonce)
        )
        .accounts({
          vault: vaultPDA,
          secret: newSecretPDA,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPDA);
      expect(vault.secretCount).to.equal(2);
    });
  });

  describe("Delete Secret", () => {
    it("should delete a secret", async () => {
      const vaultBefore = await program.account.vault.fetch(vaultPDA);
      const initialCount = vaultBefore.secretCount;

      await program.methods
        .deleteSecret()
        .accounts({
          vault: vaultPDA,
          secret: secretPDA,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const vaultAfter = await program.account.vault.fetch(vaultPDA);
      expect(vaultAfter.secretCount).to.equal(initialCount - 1);

      // Secret account should be closed
      try {
        await program.account.encryptedSecret.fetch(secretPDA);
        expect.fail("Secret should be deleted");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("should fail when non-owner tries to delete", async () => {
      // Get a valid secret PDA (the second one we added)
      const [validSecretPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("secret"),
          vaultPDA.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([0]).buffer))
        ],
        program.programId
      );

      try {
        await program.methods
          .deleteSecret()
          .accounts({
            vault: vaultPDA,
            secret: validSecretPDA,
            owner: user2.publicKey,
          })
          .signers([user2])
          .rpc();

        expect.fail("Should have thrown unauthorized error");
      } catch (error) {
        expect(error.message).to.include("has_one");
      }
    });
  });

  describe("Rotate Wallet", () => {
    it("should rotate vault owner to new wallet", async () => {
      await program.methods
        .rotateWallet(user2.publicKey)
        .accounts({
          vault: vaultPDA,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPDA);
      expect(vault.owner.toString()).to.equal(user2.publicKey.toString());
    });

    it("should allow new owner to manage vault", async () => {
      // New owner should be able to update secrets
      const vaultAccount = await program.account.vault.fetch(vaultPDA);
      const [existingSecretPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("secret"),
          vaultPDA.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([0]).buffer))
        ],
        program.programId
      );

      await program.methods
        .updateSecret(
          Array.from(Buffer.from("new_owner_update")),
          Array.from(testNonce)
        )
        .accounts({
          vault: vaultPDA,
          secret: existingSecretPDA,
          owner: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      const secret = await program.account.encryptedSecret.fetch(existingSecretPDA);
      expect(Buffer.from(secret.ciphertext)).to.deep.equal(Buffer.from("new_owner_update"));
    });

    it("should prevent old owner from managing vault", async () => {
      try {
        await program.methods
          .rotateWallet(user1.publicKey)
          .accounts({
            vault: vaultPDA,
            owner: user1.publicKey, // Old owner tries to access
          })
          .signers([user1])
          .rpc();

        expect.fail("Should have thrown unauthorized error");
      } catch (error) {
        expect(error.message).to.include("has_one");
      }
    });
  });
});
