use anchor_lang::prelude::*;

declare_id!("8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB");

#[program]
pub mod joyvault_contract {
    use super::*;

    /// Initialize the global config (admin only, one-time)
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        treasury_wallet: Pubkey,
        price_per_secret_lamports: u64,
        tier_prices: [u64; 4], // [Free, Starter, Pro, Ultra]
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.treasury_wallet = treasury_wallet;
        config.price_per_secret_lamports = price_per_secret_lamports;
        config.tier_prices = tier_prices;
        config.bump = ctx.bumps.config;

        msg!("Global config initialized");
        msg!("Admin: {}", config.admin);
        msg!("Treasury: {}", treasury_wallet);
        msg!("Price per secret: {} lamports", price_per_secret_lamports);

        Ok(())
    }

    /// Initialize a new vault for a user
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_seed: [u8; 32],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.vault_seed = vault_seed;
        vault.tier = VaultTier::Free;
        vault.secret_count = 0;
        vault.bump = ctx.bumps.vault;

        msg!("Vault initialized for owner: {}", vault.owner);
        msg!("Tier: Free (1 secret max)");

        Ok(())
    }

    /// Add a new encrypted secret to the vault
    pub fn add_secret(
        ctx: Context<AddSecret>,
        secret_type: SecretType,
        ciphertext: Vec<u8>,
        nonce: [u8; 12],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let config = &ctx.accounts.config;

        // Check if vault has capacity
        let max_secrets = vault.tier.max_secrets();
        require!(
            vault.secret_count < max_secrets,
            VaultError::VaultCapacityReached
        );

        // Validate ciphertext size (max 1KB)
        require!(
            ciphertext.len() <= 1024,
            VaultError::SecretTooLarge
        );

        // Charge fee for adding secret (transfer to treasury)
        let fee_lamports = config.price_per_secret_lamports;
        if fee_lamports > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.owner.key(),
                &config.treasury_wallet,
                fee_lamports,
            );

            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.treasury.to_account_info(),
                ],
            )?;

            msg!("Fee charged: {} lamports", fee_lamports);
        }

        let secret = &mut ctx.accounts.secret;
        secret.vault = vault.key();
        secret.secret_type = secret_type;
        secret.ciphertext = ciphertext;
        secret.nonce = nonce;
        secret.created_at = Clock::get()?.unix_timestamp;
        secret.bump = ctx.bumps.secret;

        vault.secret_count += 1;

        msg!("Secret added. Count: {}/{}", vault.secret_count, max_secrets);

        Ok(())
    }

    /// Update an existing secret
    pub fn update_secret(
        ctx: Context<UpdateSecret>,
        ciphertext: Vec<u8>,
        nonce: [u8; 12],
    ) -> Result<()> {
        require!(
            ciphertext.len() <= 1024,
            VaultError::SecretTooLarge
        );

        let secret = &mut ctx.accounts.secret;
        secret.ciphertext = ciphertext;
        secret.nonce = nonce;

        msg!("Secret updated");

        Ok(())
    }

    /// Upgrade vault tier (payment required)
    pub fn upgrade_tier(
        ctx: Context<UpgradeTier>,
        new_tier: VaultTier,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let config = &ctx.accounts.config;

        // Verify upgrade is valid
        require!(
            new_tier as u8 > vault.tier as u8,
            VaultError::InvalidTierUpgrade
        );

        let price_lamports = config.tier_prices[new_tier as usize];

        // Transfer payment to treasury
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.payer.key(),
            &config.treasury_wallet,
            price_lamports,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        vault.tier = new_tier;

        msg!("Vault upgraded to {:?} - {} secrets max", new_tier, vault.tier.max_secrets());

        Ok(())
    }

    /// Rotate wallet (change vault owner)
    pub fn rotate_wallet(
        ctx: Context<RotateWallet>,
        new_owner: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let old_owner = vault.owner;

        vault.owner = new_owner;

        msg!("Wallet rotated from {} to {}", old_owner, new_owner);

        Ok(())
    }
}

// ============ DATA STRUCTURES ============

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + GlobalConfig::SIZE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(vault_seed: [u8; 32])]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::SIZE,
        seeds = [b"vault", vault_seed.as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(secret_type: SecretType)]
pub struct AddSecret<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        has_one = owner,
        seeds = [b"vault", vault.vault_seed.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = owner,
        space = 8 + EncryptedSecret::SIZE,
        seeds = [
            b"secret",
            vault.key().as_ref(),
            &vault.secret_count.to_le_bytes()
        ],
        bump
    )]
    pub secret: Account<'info, EncryptedSecret>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Treasury wallet from config
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSecret<'info> {
    #[account(
        has_one = owner,
        seeds = [b"vault", vault.vault_seed.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        has_one = vault,
        seeds = [
            b"secret",
            vault.key().as_ref(),
            &secret.key().as_ref()[..8]
        ],
        bump = secret.bump
    )]
    pub secret: Account<'info, EncryptedSecret>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(new_tier: VaultTier)]
pub struct UpgradeTier<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        has_one = owner,
        seeds = [b"vault", vault.vault_seed.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub owner: Signer<'info>,

    /// CHECK: Treasury wallet from config
    #[account(
        mut,
        address = config.treasury_wallet
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(new_owner: Pubkey)]
pub struct RotateWallet<'info> {
    #[account(
        mut,
        has_one = owner,
        seeds = [b"vault", vault.vault_seed.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

// ============ ACCOUNT STRUCTS ============

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,               // 32
    pub treasury_wallet: Pubkey,     // 32
    pub price_per_secret_lamports: u64, // 8
    pub tier_prices: [u64; 4],       // 32 (Free, Starter, Pro, Ultra)
    pub bump: u8,                    // 1
}

impl GlobalConfig {
    pub const SIZE: usize = 32 + 32 + 8 + 32 + 1; // 105 bytes
}

#[account]
pub struct Vault {
    pub owner: Pubkey,           // 32
    pub vault_seed: [u8; 32],    // 32 (derived from master key hash)
    pub tier: VaultTier,         // 1
    pub secret_count: u32,       // 4
    pub bump: u8,                // 1
}

impl Vault {
    pub const SIZE: usize = 32 + 32 + 1 + 4 + 1; // 70 bytes
}

#[account]
pub struct EncryptedSecret {
    pub vault: Pubkey,           // 32
    pub secret_type: SecretType, // 1
    pub ciphertext: Vec<u8>,     // 4 + 1024 max
    pub nonce: [u8; 12],         // 12
    pub created_at: i64,         // 8
    pub bump: u8,                // 1
}

impl EncryptedSecret {
    pub const SIZE: usize = 32 + 1 + 4 + 1024 + 12 + 8 + 1; // 1082 bytes
}

// ============ ENUMS ============

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum VaultTier {
    Free = 0,     // 1 secret
    Starter = 1,  // 10 secrets
    Pro = 2,      // 100 secrets
    Ultra = 3,    // 500 secrets
}

impl VaultTier {
    pub fn max_secrets(&self) -> u32 {
        match self {
            VaultTier::Free => 1,
            VaultTier::Starter => 10,
            VaultTier::Pro => 100,
            VaultTier::Ultra => 500,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SecretType {
    Password = 0,
    ApiKey = 1,
    SeedPhrase = 2,
    PrivateKey = 3,
    Note = 4,
    Custom = 5,
}

// ============ ERRORS ============

#[error_code]
pub enum VaultError {
    #[msg("Vault capacity reached for current tier")]
    VaultCapacityReached,

    #[msg("Secret exceeds maximum size of 1KB")]
    SecretTooLarge,

    #[msg("Invalid tier upgrade - must upgrade to higher tier")]
    InvalidTierUpgrade,

    #[msg("Unauthorized - you don't own this vault")]
    Unauthorized,
}
