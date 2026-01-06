# Critical Bugs & Testing Checklist

**Last Updated**: 2026-01-06 20:30
**Status**: Pre-deployment testing on devnet

## 🎯 Testing Strategy

1. **Frontend-Only Tests** (No contract needed) - Do these NOW
2. **Integration Tests** (After contract deployment)
3. **Security Audit** (Before mainnet)

---

## ✅ PHASE 1: Frontend-Only Tests (Current)

### 1.1 Wallet Connection

- [ ] **Test 1.1.1**: Click "Connect" button
  - Expected: Modal shows with 7 wallets (Phantom, Solflare, Coinbase, Torus, Trust, Coin98, Ledger)
  - Bug to check: Only showing Phantom? ❌
  - Status after fix: Should show all wallets ✅

- [ ] **Test 1.1.2**: Connect with Phantom
  - Expected: Connection successful, address shows in header
  - Common issues: Stuck on "Connecting...", wallet not detected

- [ ] **Test 1.1.3**: Connect with Solflare
  - Expected: Connection successful
  - Common issues: Wallet not installed error

- [ ] **Test 1.1.4**: Disconnect wallet
  - Expected: Button returns to "Connect" state
  - Bug: State not clearing properly

- [ ] **Test 1.1.5**: Reconnect with different wallet
  - Expected: Previous wallet disconnects, new one connects
  - Bug: Multiple wallets connected simultaneously

### 1.2 Life Phrase Validation

- [ ] **Test 1.2.1**: Enter weak phrase (< 20 chars)
  - Input: `test123`
  - Expected: Red error "Too short", strength meter shows "Weak"
  - Bug: No validation, allows weak phrase

- [ ] **Test 1.2.2**: Enter medium phrase (20-30 chars, no numbers)
  - Input: `this is a test phrase for vault`
  - Expected: Yellow warning, strength shows "Medium"

- [ ] **Test 1.2.3**: Enter strong phrase (30+ chars, numbers, spaces)
  - Input: `My super secret vault phrase with 12345 numbers`
  - Expected: Green success, strength shows "Strong", can proceed
  - Bug: Validation not working

- [ ] **Test 1.2.4**: Phrase mismatch on confirmation
  - Input phrase: `correct phrase here 123`
  - Confirm phrase: `wrong phrase here 456`
  - Expected: Error "Phrases don't match"
  - Bug: Allows mismatched phrases

- [ ] **Test 1.2.5**: Special characters in phrase
  - Input: `Test!@#$%^&*()_+ phrase with symbols 123`
  - Expected: Should work (no restrictions on special chars)
  - Bug: Crashes or rejects valid chars

### 1.3 Navigation & UI

- [ ] **Test 1.3.1**: Landing page loads
  - Expected: Logo, title, animated background, 2 buttons, footer
  - Bug: Missing elements, broken layout

- [ ] **Test 1.3.2**: Click "Create Vault"
  - Expected: Navigates to /create-vault, shows step 1
  - Bug: 404, blank page, or wrong page

- [ ] **Test 1.3.3**: Click "Access Vault"
  - Expected: Navigates to /unlock-vault
  - Bug: Wrong navigation

- [ ] **Test 1.3.4**: Footer links are visible
  - Expected: X (Twitter) and Telegram icons with hover effects
  - Bug: Icons missing, links broken

- [ ] **Test 1.3.5**: Responsive design (mobile/tablet)
  - Test on different screen sizes
  - Expected: Layout adapts, text readable, buttons clickable
  - Bug: Overflow, broken layout on small screens

### 1.4 Create Vault Flow (UI Only)

- [ ] **Test 1.4.1**: Step 1 → Step 2 transition
  - Complete step 1 with valid phrase
  - Expected: Smoothly transitions to step 2 (confirmation)
  - Bug: Stuck, crashes, or skips steps

- [ ] **Test 1.4.2**: Step 2 → Step 3 transition
  - Confirm matching phrase
  - Expected: Transitions to step 3 (warning)
  - Bug: Error or stuck

- [ ] **Test 1.4.3**: Back button navigation
  - Click browser back from step 2 or 3
  - Expected: Returns to previous step OR shows warning about losing data
  - Bug: Data lost, page crashes

- [ ] **Test 1.4.4**: Wallet not connected warning
  - Reach step 3 without connecting wallet
  - Expected: Button says "Connect Wallet First" and is disabled/shows modal
  - Bug: Allows proceeding without wallet

### 1.5 Unlock Vault Flow (UI Only)

- [ ] **Test 1.5.1**: Page loads correctly
  - Navigate to /unlock-vault
  - Expected: Input field for Life Phrase, unlock button
  - Bug: Missing elements

- [ ] **Test 1.5.2**: Empty phrase validation
  - Click "Unlock Vault" with empty input
  - Expected: Error "Please enter your Life Phrase"
  - Bug: Allows empty submission

- [ ] **Test 1.5.3**: Without wallet connected
  - Try to unlock without wallet
  - Expected: Prompt to connect wallet
  - Bug: Crashes or unclear error

### 1.6 Styling & Animations

- [ ] **Test 1.6.1**: Animated background works
  - Expected: Gradient animation running smoothly
  - Bug: Static, broken, or causing lag

- [ ] **Test 1.6.2**: Button hover effects
  - Hover over primary buttons
  - Expected: Color change, smooth transition
  - Bug: No effect or jumpy animation

- [ ] **Test 1.6.3**: Input focus states
  - Click into text inputs
  - Expected: Border highlight, smooth focus effect
  - Bug: No visual feedback

- [ ] **Test 1.6.4**: Loading states
  - Watch for loading indicators during operations
  - Expected: Spinner or loading message
  - Bug: Frozen UI with no feedback

---

## ⏳ PHASE 2: Integration Tests (After Contract Deployment)

### 2.1 Contract Deployment

- [ ] **Test 2.1.1**: Contract deploys successfully
  - Run: `anchor deploy --provider.cluster devnet`
  - Expected: Success message with Program ID
  - Critical: Save the Program ID!

- [ ] **Test 2.1.2**: Update frontend with Program ID
  - Update `lib/solana/program.ts` line 13
  - Update `lib/solana/usdc.ts` line 25 (treasury wallet)
  - Create `.env.local` with all variables

- [ ] **Test 2.1.3**: Verify contract on explorer
  - Visit: `https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet`
  - Expected: Contract visible, shows code

### 2.2 Create Vault (Full Flow)

- [ ] **Test 2.2.1**: Create vault transaction
  - Complete full create vault flow
  - Expected: Wallet prompts for transaction approval
  - Bug: No transaction prompt

- [ ] **Test 2.2.2**: Transaction succeeds
  - Approve transaction in wallet
  - Expected: Success message, redirect to dashboard
  - Bug: Transaction fails, unclear error

- [ ] **Test 2.2.3**: Vault data on-chain
  - Check vault exists: `solana account <vault_address>`
  - Expected: Account exists with correct data
  - Bug: Account not created

- [ ] **Test 2.2.4**: Dashboard shows correct initial state
  - After creation, check dashboard
  - Expected:
    - Tier: "Free"
    - Secrets: "0 / 1"
    - Status: "Unlocked"
    - SOL balance visible
  - Bug: Wrong data or missing info

### 2.3 Add Secret

- [ ] **Test 2.3.1**: Click "+ Add Secret" button
  - Expected: Modal opens with secret form
  - Bug: No modal or crash

- [ ] **Test 2.3.2**: Fill secret form
  - Type: Password
  - Title: "Test Password"
  - Content: "mySecretPass123"
  - Expected: All fields accept input
  - Bug: Input validation too strict

- [ ] **Test 2.3.3**: Empty fields validation
  - Try to save with empty title/content
  - Expected: Error "Title and content required"
  - Bug: Allows empty secrets

- [ ] **Test 2.3.4**: Secret too long (>1024 chars)
  - Enter 1100 character content
  - Expected: Error "Secret must be less than 1024 characters"
  - Bug: Crashes or truncates silently

- [ ] **Test 2.3.5**: Encrypt and save transaction
  - Click "Encrypt & Save On-Chain"
  - Expected: Wallet prompts for approval
  - Bug: No transaction

- [ ] **Test 2.3.6**: Secret appears in list
  - After successful save
  - Expected: Secret shows with title, type, encrypted content (•••••)
  - Bug: Not visible or wrong data

- [ ] **Test 2.3.7**: Encryption is correct
  - Verify encrypted data stored on-chain
  - Expected: Ciphertext is not plaintext
  - **CRITICAL**: If plaintext visible on-chain = SECURITY BUG

### 2.4 View/Decrypt Secret

- [ ] **Test 2.4.1**: Click "Show" button
  - Expected: Content decrypts and shows plaintext
  - Bug: Decryption fails, wrong content

- [ ] **Test 2.4.2**: Click "Hide" button
  - Expected: Content shows as ••••• again
  - Bug: Stays visible

- [ ] **Test 2.4.3**: Decryption with wrong Life Phrase
  - Lock vault, unlock with wrong phrase
  - Expected: Decryption fails with error
  - Bug: Shows garbage or wrong data

### 2.5 Delete Secret

- [ ] **Test 2.5.1**: Click "Delete" button
  - Expected: Confirmation modal appears
  - Bug: Deletes immediately without confirm

- [ ] **Test 2.5.2**: Cancel deletion
  - Click "Cancel" in confirm modal
  - Expected: Secret remains
  - Bug: Gets deleted anyway

- [ ] **Test 2.5.3**: Confirm deletion
  - Click "Confirm Delete"
  - Expected: Transaction prompt, secret removed from list
  - Bug: Transaction fails

- [ ] **Test 2.5.4**: Secret count updates
  - After deletion
  - Expected: Count decreases (e.g., 1/1 → 0/1)
  - Bug: Count doesn't update

### 2.6 Unlock Existing Vault

- [ ] **Test 2.6.1**: Lock vault
  - Click "Lock Vault & Exit"
  - Expected: Redirects to unlock page
  - Bug: Vault stays unlocked

- [ ] **Test 2.6.2**: Unlock with correct phrase
  - Navigate to /unlock-vault
  - Enter same Life Phrase used during creation
  - Expected: Unlocks successfully, shows secrets
  - **CRITICAL**: If doesn't unlock = encryption bug

- [ ] **Test 2.6.3**: Unlock with wrong phrase
  - Enter incorrect Life Phrase
  - Expected: Error "Incorrect Life Phrase" or "No vault found"
  - Bug: Unlocks with wrong phrase = SECURITY BUG

- [ ] **Test 2.6.4**: Unlock with different wallet
  - Connect different wallet, try to unlock
  - Expected: Error "No vault found for this wallet"
  - Bug: Access granted = SECURITY BUG

### 2.7 Tier Upgrades (USDC)

- [ ] **Test 2.7.1**: Click "Upgrade" button
  - Expected: Modal shows tier options
  - Bug: No modal

- [ ] **Test 2.7.2**: Tier selection
  - Select "Starter" (10 secrets)
  - Expected: Shows price, upgrade button enabled
  - Bug: Wrong price or unavailable

- [ ] **Test 2.7.3**: Insufficient USDC balance
  - Try to upgrade without enough USDC
  - Expected: Clear error "Insufficient USDC balance"
  - Bug: Transaction fails with cryptic error

- [ ] **Test 2.7.4**: USDC approval transaction
  - Have enough USDC, click "Upgrade Now"
  - Expected: First transaction to approve USDC
  - Bug: No approval step

- [ ] **Test 2.7.5**: Tier upgrade transaction
  - After USDC approval
  - Expected: Second transaction for tier upgrade
  - Bug: Fails or doesn't update tier

- [ ] **Test 2.7.6**: Tier reflects in dashboard
  - After successful upgrade
  - Expected: Tier shows "Starter", capacity shows "X / 10"
  - Bug: Still shows "Free"

- [ ] **Test 2.7.7**: Can add more secrets
  - After upgrade to Starter
  - Expected: Can add up to 10 secrets
  - Bug: Still limited to 1

### 2.8 Edge Cases & Error Handling

- [ ] **Test 2.8.1**: No devnet SOL for fees
  - Create vault with exactly 0.01 SOL (not enough for fee)
  - Expected: Clear error "Insufficient SOL for transaction fee"
  - Bug: Transaction hangs or unclear error

- [ ] **Test 2.8.2**: Reject wallet transaction
  - Start any transaction, click "Reject" in wallet
  - Expected: Error message "Transaction rejected by user"
  - Bug: UI stuck or crashes

- [ ] **Test 2.8.3**: Network error during transaction
  - Disconnect internet mid-transaction
  - Expected: Timeout error with retry option
  - Bug: Hangs forever

- [ ] **Test 2.8.4**: Vault at capacity
  - Fill vault to max (1 secret for Free tier)
  - Try to add another secret
  - Expected: Error "Vault is at capacity. Upgrade tier to add more."
  - Bug: Allows adding beyond capacity

- [ ] **Test 2.8.5**: Duplicate secret titles
  - Add secret with title "Password1"
  - Add another with same title "Password1"
  - Expected: Should work (duplicates allowed)
  - Bug: Rejects or causes confusion

- [ ] **Test 2.8.6**: Special characters in secret content
  - Content: `{"key": "value", "special": "!@#$%^&*()"}`
  - Expected: Encrypts and decrypts perfectly
  - Bug: Corruption or escape issues

---

## 🔐 PHASE 3: Security Audit (Before Mainnet)

### 3.1 Encryption Security

- [ ] **Audit 3.1.1**: PBKDF2 iterations
  - Check: `lib/crypto/keyDerivation.ts` line ~20
  - Expected: 600,000 iterations minimum
  - Security issue if < 100,000

- [ ] **Audit 3.1.2**: Key derivation salt
  - Verify salt is unique per vault
  - Expected: Uses wallet address as salt
  - Bug: Same salt for all = weak encryption

- [ ] **Audit 3.1.3**: AES-256-GCM implementation
  - Check `lib/crypto/encryption.ts`
  - Expected: Proper nonce generation (12 bytes random)
  - Bug: Reused nonces = catastrophic failure

- [ ] **Audit 3.1.4**: Plaintext never logged
  - Search codebase for `console.log`
  - Expected: No logging of Life Phrase or plaintext secrets
  - **CRITICAL**: Remove any logs in production

- [ ] **Audit 3.1.5**: Memory cleanup
  - Verify `clearSensitiveData()` is called
  - Expected: Sensitive data zeroed after use
  - Bug: Sensitive data lingers in memory

### 3.2 Smart Contract Security

- [ ] **Audit 3.2.1**: PDA seeds verification
  - Check vault PDA derivation
  - Expected: Uses wallet + "vault" seed
  - Bug: Predictable or colliding PDAs

- [ ] **Audit 3.2.2**: Authority checks
  - Verify only vault owner can modify
  - Expected: `has_one = owner` constraint
  - **CRITICAL**: Missing check = anyone can modify

- [ ] **Audit 3.2.3**: Integer overflow protection
  - Check secret count, tier capacity
  - Expected: Proper bounds checking
  - Bug: Overflow allows infinite secrets

- [ ] **Audit 3.2.4**: Reentrancy protection
  - Not applicable for Solana (no reentrancy)
  - Just verify no cross-program calls without checks

- [ ] **Audit 3.2.5**: USDC token verification
  - Check mint address in `lib/solana/usdc.ts`
  - Expected: Correct devnet USDC mint
  - Bug: Wrong mint = can't upgrade tiers

### 3.3 Frontend Security

- [ ] **Audit 3.3.1**: XSS protection
  - Check all user input rendering
  - Expected: React escapes by default
  - Bug: `dangerouslySetInnerHTML` without sanitization

- [ ] **Audit 3.3.2**: Environment variables
  - Verify `.env.local` is in `.gitignore`
  - Expected: Secrets not committed
  - Bug: API keys or secrets in git

- [ ] **Audit 3.3.3**: HTTPS enforcement
  - Production deployment uses HTTPS only
  - Expected: No HTTP traffic
  - Bug: Credentials sent over HTTP

- [ ] **Audit 3.3.4**: CSP headers
  - Check Content-Security-Policy
  - Expected: Restricts inline scripts
  - Bug: Allows any script source

---

## 📝 Test Results Template

```
Date: __________
Tester: __________
Environment: Devnet / Mainnet

PHASE 1 (Frontend-Only):
- Wallet Connection: ___/5 tests passed
- Life Phrase Validation: ___/5 tests passed
- Navigation & UI: ___/5 tests passed
- Create Vault Flow: ___/4 tests passed
- Unlock Vault Flow: ___/3 tests passed
- Styling: ___/4 tests passed

PHASE 2 (Integration):
- Contract Deployment: ___/3 tests passed
- Create Vault: ___/4 tests passed
- Add Secret: ___/7 tests passed
- View/Decrypt: ___/3 tests passed
- Delete Secret: ___/4 tests passed
- Unlock Existing: ___/4 tests passed
- Tier Upgrades: ___/7 tests passed
- Edge Cases: ___/6 tests passed

PHASE 3 (Security):
- Encryption Security: ___/5 audits passed
- Contract Security: ___/5 audits passed
- Frontend Security: ___/4 audits passed

CRITICAL BUGS FOUND:
1. ______________________________________
2. ______________________________________
3. ______________________________________

BLOCKER ISSUES (Must fix before mainnet):
1. ______________________________________
2. ______________________________________

NOTES:
_________________________________________
_________________________________________
```

---

## 🚨 Known Issues (Pre-Testing)

### Fixed:
- ✅ Wallet stuck on "Connecting..." (autoConnect=false)
- ✅ Only Phantom showing in wallet modal (added 7 wallets)
- ✅ Build errors (encrypt/decrypt exports)
- ✅ Invalid PublicKey addresses

### Still To Test:
- ⏳ All integration tests (needs deployed contract)
- ⏳ Full encryption/decryption flow
- ⏳ USDC payment integration
- ⏳ Tier upgrade system
- ⏳ Multi-secret management

---

## 🎯 Definition of "Production Ready"

✅ All Phase 1 tests pass (100%)
✅ All Phase 2 tests pass (100%)
✅ All Phase 3 security audits pass
✅ No CRITICAL or BLOCKER bugs
✅ Performance acceptable (<2s for operations)
✅ Documentation complete
✅ External security audit (recommended)

**Current Status: Phase 1 testing in progress**
