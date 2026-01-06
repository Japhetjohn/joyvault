# JoyVault Testing & Fixes Checklist

## ✅ Fixed Issues

### Build Errors
- [x] Fixed missing `encrypt` and `decrypt` exports in encryption module
- [x] Fixed invalid PublicKey addresses (treasury wallet)
- [x] Build now compiles successfully

### Code Issues
- [x] Added function aliases for simplified API
- [x] Updated crypto module exports
- [x] Fixed USDC treasury wallet placeholder

## 🔧 Known Limitations (Pre-Deployment)

### Smart Contract Not Deployed
- ⚠️ Contract needs to be built and deployed to devnet
- ⚠️ All on-chain operations will fail until contract is deployed
- ⚠️ This is expected - contract deployment requires Solana CLI

### What Works Without Deployment
- ✅ UI/UX and navigation
- ✅ Wallet connection (Phantom, Solflare, etc.)
- ✅ Life Phrase validation
- ✅ Key derivation (600k PBKDF2 iterations)
- ✅ Encryption/decryption locally
- ✅ All frontend components render

### What Requires Deployment
- ❌ Creating vault on-chain
- ❌ Adding/updating/deleting secrets on-chain
- ❌ Fetching vault data from blockchain
- ❌ Tier upgrades with USDC
- ❌ Wallet rotation

## 🧪 Testing Plan

### Phase 1: Frontend Testing (No Contract Needed)

#### Test 1: Landing Page
```
1. Visit http://localhost:3000
2. Check:
   - Logo displays
   - Animated background works
   - "Create Vault" and "Access Vault" buttons work
   - Footer shows with social links
   - Wallet button appears in header
```

#### Test 2: Wallet Connection
```
1. Click wallet button in header
2. Try connecting with:
   - Phantom
   - Solflare
   - Any supported wallet
3. Verify:
   - Modal appears
   - Wallet connects
   - Address shows in header
   - Can disconnect
```

#### Test 3: Create Vault Flow (UI Only)
```
1. Click "Create Vault"
2. Step 1: Life Phrase
   - Enter weak phrase (< 20 chars)
   - Check validation errors appear
   - Enter strong phrase (20+ chars, numbers, spaces)
   - Strength meter should show "Strong"
3. Step 2: Confirmation
   - Enter mismatched phrase
   - Error should show
   - Enter matching phrase
   - Should proceed to step 3
4. Step 3: Warning
   - Read warning
   - Without wallet: shows "Connect Wallet First"
   - With wallet: shows "I Understand, Create Vault"
```

#### Test 4: Unlock Vault Flow (UI Only)
```
1. Click "Access Vault"
2. Enter any Life Phrase
3. With wallet connected, click "Unlock Vault"
4. Expected: Error "No vault found" (because contract not deployed)
5. This is correct behavior - vault would need to exist on-chain
```

### Phase 2: Contract Deployment

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Configure Solana
solana config set --url devnet
solana-keygen new  # or import existing
solana airdrop 2   # get devnet SOL

# Build contract
cd joyvault-contract
anchor build

# Deploy
anchor deploy --provider.cluster devnet

# Note the Program ID!
```

### Phase 3: Update Frontend with Program ID

After deploying contract, update:

1. **joyvault-app/lib/solana/program.ts**
   ```typescript
   export const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID')
   ```

2. **joyvault-app/lib/solana/usdc.ts**
   ```typescript
   export const TREASURY_WALLET = new PublicKey('YOUR_TREASURY_WALLET')
   ```

3. **Create .env.local**
   ```env
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
   NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
   NEXT_PUBLIC_TREASURY_WALLET=YOUR_TREASURY_WALLET
   NEXT_PUBLIC_ENVIRONMENT=devnet
   ```

### Phase 4: Full Integration Testing

After contract is deployed and frontend is updated:

#### Test 5: Create Vault (Full Flow)
```
1. Connect wallet
2. Go through create vault flow with strong Life Phrase
3. Click "I Understand, Create Vault"
4. Approve transaction in wallet
5. Should redirect to dashboard
6. Verify:
   - Vault tier shows "Free"
   - Secrets count shows "0 / 1"
   - Status shows "Unlocked"
```

#### Test 6: Add Secret
```
1. In dashboard, click "+ Add Secret"
2. Fill in:
   - Type: Password
   - Title: Test Password
   - Content: mySecretPassword123
3. Click "Encrypt & Save On-Chain"
4. Approve transaction
5. Verify:
   - Secret appears in list
   - Shows as encrypted (•••••••)
   - Can click "Show" to decrypt
```

#### Test 7: Unlock Existing Vault
```
1. Lock vault (click "Lock Vault & Exit")
2. Go to "Access Vault"
3. Enter same Life Phrase
4. Should unlock and show your secret
```

#### Test 8: Tier Upgrade
```
1. Click "Upgrade" button
2. Modal shows tier options
3. Select "Starter" (10 secrets)
4. If you have USDC:
   - Click "Upgrade Now"
   - Approve USDC payment
   - Approve tier upgrade transaction
5. Verify tier changed to "Starter"
```

#### Test 9: Delete Secret
```
1. Click "Delete" on a secret
2. Confirm deletion
3. Approve transaction
4. Secret should be removed
5. Count should decrease
```

## 📊 Test Results Template

```
Date: _____________
Tester: ___________

Frontend Tests (No Contract):
- [ ] Landing page loads
- [ ] Wallet connects
- [ ] Create vault UI works
- [ ] Unlock vault UI works
- [ ] All pages render correctly

Contract Deployment:
- [ ] Solana CLI installed
- [ ] Anchor installed
- [ ] Contract built successfully
- [ ] Contract deployed to devnet
- [ ] Program ID noted: _______________

Integration Tests (With Contract):
- [ ] Create vault on-chain works
- [ ] Add secret works
- [ ] View/decrypt secret works
- [ ] Delete secret works
- [ ] Tier upgrade works (with USDC)
- [ ] Unlock vault works
- [ ] Error handling works properly

Issues Found:
1.
2.
3.

Notes:
```

## 🐛 Common Issues & Solutions

### Issue: "Wallet not connected"
**Solution**: Make sure wallet extension is installed and unlocked

### Issue: "Program ... does not exist"
**Solution**: Contract not deployed yet - see Phase 2

### Issue: "No vault found for this Life Phrase"
**Solution**: Either:
- Vault hasn't been created yet
- Wrong Life Phrase entered
- Wrong wallet connected

### Issue: "Insufficient SOL for transaction"
**Solution**: Get devnet SOL: `solana airdrop 2`

### Issue: "Insufficient USDC balance"
**Solution**: Get devnet USDC from faucet

### Issue: Transaction fails
**Solution**: Check:
- Wallet has SOL for fees
- Program ID is correct
- RPC endpoint is responsive

## 📝 Testing Notes

### Current Status
- ✅ Build compiles successfully
- ✅ Dev server runs without errors
- ✅ All pages render
- ✅ Wallet adapter configured
- ⚠️ Contract needs deployment
- ⚠️ On-chain features not testable yet

### Next Steps
1. Test frontend UI/UX thoroughly
2. Deploy contract to devnet
3. Update Program ID and treasury wallet
4. Test full integration
5. Fix any issues found
6. Deploy to mainnet (after audit)

## 🚀 Deployment Readiness

### Frontend
- [x] Code compiles
- [x] No build errors
- [x] Environment variables configured
- [ ] Tested on production build
- [ ] Deployed to Vercel

### Smart Contract
- [x] Code written
- [x] Tests written
- [ ] Built with Anchor
- [ ] Deployed to devnet
- [ ] Tested on devnet
- [ ] Audited (recommended)
- [ ] Deployed to mainnet

### Documentation
- [x] README.md complete
- [x] DEPLOYMENT.md complete
- [x] Code commented
- [ ] User guide written
- [ ] API documentation

## 🎯 Success Criteria

The project is considered complete when:
1. ✅ Frontend builds without errors
2. ✅ All pages render correctly
3. ⏳ Smart contract deploys successfully
4. ⏳ Can create vault on-chain
5. ⏳ Can add/view/delete secrets
6. ⏳ Can upgrade tiers with USDC
7. ⏳ Can unlock vault with Life Phrase
8. ⏳ All error cases handled gracefully
9. ⏳ Performance is acceptable
10. ⏳ Security best practices followed

Legend:
- ✅ Complete
- ⏳ Pending (requires contract deployment)
- ❌ Not started/blocked
