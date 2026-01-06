# JoyVault Deployment Guide

## Overview
This guide covers deploying the JoyVault smart contract to Solana devnet and the frontend to Vercel.

## Prerequisites
- Node.js 18+ and npm/yarn
- Git
- Solana CLI tools
- Anchor Framework
- A Solana wallet with devnet SOL

## Part 1: Smart Contract Deployment

### 1. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

Add to PATH (add to ~/.bashrc or ~/.zshrc):
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Verify installation:
```bash
solana --version
```

### 2. Install Anchor Framework

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
anchor --version
```

### 3. Configure Solana CLI

Set to devnet:
```bash
solana config set --url devnet
```

Generate a new wallet (or import existing):
```bash
solana-keygen new --no-bip39-passphrase
```

Check your wallet address:
```bash
solana address
```

Request airdrop (devnet SOL):
```bash
solana airdrop 2
```

### 4. Build the Smart Contract

```bash
cd joyvault-contract
anchor build
```

This generates:
- `target/deploy/joyvault_contract.so` - The compiled program
- `target/idl/joyvault_contract.json` - The Interface Definition Language file
- `target/types/joyvault_contract.ts` - TypeScript types

### 5. Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

After deployment, you'll see output like:
```
Program Id: 8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB
```

**IMPORTANT**: Save this Program ID!

### 6. Initialize Global Config (Admin Only)

Create a script to initialize the config:

```bash
cd joyvault-contract
anchor run initialize-config
```

Or manually using anchor console:
```typescript
const treasuryWallet = new PublicKey("YOUR_TREASURY_WALLET");
const pricePerSecret = 1000; // lamports
const tierPrices = [
  0,                        // Free
  0.1 * LAMPORTS_PER_SOL,   // Starter
  1 * LAMPORTS_PER_SOL,     // Pro
  5 * LAMPORTS_PER_SOL,     // Ultra
];

await program.methods
  .initializeConfig(treasuryWallet, pricePerSecret, tierPrices)
  .rpc();
```

### 7. Run Tests (Optional)

```bash
anchor test
```

## Part 2: Frontend Deployment

### 1. Update Environment Variables

Create `.env.local` in `joyvault-app/`:

```env
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<YOUR_DEPLOYED_PROGRAM_ID>
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
NEXT_PUBLIC_TREASURY_WALLET=<YOUR_TREASURY_WALLET>
NEXT_PUBLIC_ENVIRONMENT=devnet
```

Update these files with the deployed Program ID:
- `joyvault-app/lib/solana/program.ts` - Update `PROGRAM_ID`
- `joyvault-app/lib/solana/usdc.ts` - Update `TREASURY_WALLET`

### 2. Test Locally

```bash
cd joyvault-app
npm install
npm run dev
```

Open http://localhost:3000 and test:
- Wallet connection
- Vault creation
- Secret storage
- Tier upgrades

### 3. Deploy to Vercel

#### Option A: Vercel CLI

```bash
npm install -g vercel
cd joyvault-app
vercel
```

Follow the prompts to link your project.

Add environment variables:
```bash
vercel env add NEXT_PUBLIC_RPC_ENDPOINT
vercel env add NEXT_PUBLIC_PROGRAM_ID
vercel env add NEXT_PUBLIC_USDC_MINT
vercel env add NEXT_PUBLIC_TREASURY_WALLET
vercel env add NEXT_PUBLIC_ENVIRONMENT
```

Deploy to production:
```bash
vercel --prod
```

#### Option B: Vercel Dashboard

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your Git repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `joyvault-app`
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. Add Environment Variables in project settings:
   ```
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=<YOUR_PROGRAM_ID>
   NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
   NEXT_PUBLIC_TREASURY_WALLET=<YOUR_TREASURY_WALLET>
   NEXT_PUBLIC_ENVIRONMENT=devnet
   ```

6. Click "Deploy"

### 4. Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

## Part 3: Mainnet Deployment

### Smart Contract

1. Get mainnet SOL for deployment (~1-2 SOL)
2. Update Anchor.toml cluster to `mainnet`:
   ```toml
   [provider]
   cluster = "Mainnet"
   ```
3. Deploy:
   ```bash
   anchor deploy --provider.cluster mainnet-beta
   ```
4. Initialize config with production treasury wallet

### Frontend

1. Update environment variables:
   ```env
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
   NEXT_PUBLIC_PROGRAM_ID=<MAINNET_PROGRAM_ID>
   NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   NEXT_PUBLIC_ENVIRONMENT=mainnet
   ```

2. Update social media links in footer
3. Deploy to Vercel

## Monitoring & Maintenance

### Monitor Contract Activity

```bash
# View program logs
solana logs <PROGRAM_ID>

# Check account details
solana account <ACCOUNT_ADDRESS>

# Monitor transactions
solana confirm -v <SIGNATURE>
```

### Solana Explorer

View your program on:
- Devnet: https://explorer.solana.com/?cluster=devnet
- Mainnet: https://explorer.solana.com/

### Frontend Monitoring

Use Vercel Analytics:
- Performance metrics
- Error tracking
- User analytics

## Troubleshooting

### Contract Deployment Fails

```bash
# Ensure sufficient balance
solana balance

# Request airdrop (devnet)
solana airdrop 2

# Check program size
ls -lh target/deploy/*.so
```

### Build Errors

```bash
# Clean and rebuild
anchor clean
anchor build

# Update dependencies
cargo update
```

### Frontend Errors

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

## Security Checklist

Before mainnet deployment:
- [ ] Audit smart contract code
- [ ] Test all instructions thoroughly
- [ ] Set proper admin permissions
- [ ] Secure treasury wallet with multisig
- [ ] Set up monitoring and alerts
- [ ] Review USDC payment flows
- [ ] Test tier upgrade paths
- [ ] Verify encryption implementation
- [ ] Enable rate limiting on frontend
- [ ] Set up proper error logging

## Cost Estimates

### Devnet (Free)
- SOL via faucet
- USDC via devnet faucet
- Unlimited testing

### Mainnet
- Program deployment: ~1-2 SOL (~$100-200)
- Rent-exempt account: ~0.001 SOL per account
- Transaction fees: ~0.000005 SOL per tx
- Monthly RPC (QuickNode): $49+

## Support

- Smart Contract: [Anchor Docs](https://www.anchor-lang.com/)
- Solana: [Solana Docs](https://docs.solana.com/)
- Frontend: [Next.js Docs](https://nextjs.org/docs)
- Wallet Adapter: [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

## Next Steps

1. Test contract on devnet thoroughly
2. Conduct security audit
3. Set up monitoring
4. Deploy to mainnet
5. Launch marketing campaign
6. Monitor user feedback
7. Iterate and improve
