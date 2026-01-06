# 🔐 JoyVault

**Your Secrets. On-Chain. Forever.**

JoyVault is a decentralized, encrypted secret vault built on Solana blockchain. Store your passwords, seed phrases, API keys, and sensitive data with military-grade encryption, accessible only through your memory.

![JoyVault Banner](joyvault-app/public/logo.png)

## 🌟 Features

### 🧠 Memory-Based Access
- **No Seed Phrases**: Access your vault with a memorable "Life Phrase"
- **No Recovery Keys**: Your memory is your only authentication
- **Wallet Agnostic**: Lost your wallet? Connect a new one with the same Life Phrase

### 🔒 Military-Grade Security
- **AES-256-GCM Encryption**: Industry-standard encryption for all secrets
- **600,000 PBKDF2 Iterations**: Extreme key derivation hardening
- **On-Chain Storage**: Permanent, immutable data on Solana blockchain
- **Client-Side Encryption**: Keys never leave your device

### ⚡ Blockchain-Powered
- **Solana Network**: Fast, low-cost transactions
- **Smart Contract**: Rust-based Anchor program
- **USDC Payments**: Tier upgrades via USDC SPL tokens
- **Decentralized**: No central servers or databases

### 📊 Flexible Tiers
- **Free**: 1 secret (perfect for testing)
- **Starter**: 10 secrets - 0.1 USDC
- **Pro**: 100 secrets - 1 USDC
- **Ultra**: 500 secrets - 5 USDC

## 🏗️ Architecture

```
joyvault/
├── joyvault-app/          # Next.js 16 frontend
│   ├── app/               # App routes
│   ├── components/        # React components
│   ├── lib/
│   │   ├── crypto/        # Encryption & key derivation
│   │   ├── solana/        # Solana program integration
│   │   └── hooks/         # React hooks for vault operations
│   └── public/            # Static assets
│
└── joyvault-contract/     # Anchor smart contract
    ├── programs/          # Rust program
    ├── tests/             # TypeScript tests
    └── target/            # Build output
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Solana CLI (for contract deployment)
- Anchor Framework (for contract development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/joyvault.git
cd joyvault
```

2. **Install frontend dependencies**
```bash
cd joyvault-app
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Smart Contract Development

1. **Install Anchor**
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

2. **Build contract**
```bash
cd joyvault-contract
anchor build
```

3. **Run tests**
```bash
anchor test
```

## 📖 How It Works

### 1. Vault Creation
```typescript
// User enters Life Phrase
const lifePhrase = "John born in Aba mango tree 2003"

// Derive master key using PBKDF2 (600k iterations)
const masterKey = await deriveMasterKey(lifePhrase)

// Derive vault seed
const vaultSeed = await deriveVaultSeed(masterKey)

// Create vault on-chain
await initializeVault(wallet, vaultSeed)
```

### 2. Storing Secrets
```typescript
// Encrypt secret with AES-256-GCM
const { ciphertext, nonce } = await encrypt(masterKey, secretData)

// Store on-chain
await addSecret(wallet, vaultSeed, secretType, ciphertext, nonce)
```

### 3. Retrieving Secrets
```typescript
// Fetch encrypted secrets from blockchain
const secrets = await fetchVaultSecrets(vaultSeed)

// Decrypt with master key
for (const secret of secrets) {
  const plaintext = await decrypt(masterKey, secret.ciphertext, secret.nonce)
}
```

## 🔧 Technology Stack

### Frontend
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Solana Wallet Adapter**: Multi-wallet support
- **Web Crypto API**: Browser-native cryptography

### Smart Contract
- **Anchor Framework**: Solana program framework
- **Rust**: Systems programming language
- **SPL Token**: USDC payment integration

### Blockchain
- **Solana**: High-performance blockchain
- **Devnet**: Testing environment
- **Mainnet**: Production deployment

## 📝 Smart Contract Instructions

### `initialize_config`
Initialize global configuration (admin only)
- Set treasury wallet
- Configure tier pricing
- One-time setup

### `initialize_vault`
Create a new vault for a user
- Requires vault seed from Life Phrase
- Initializes with Free tier
- Links to wallet owner

### `add_secret`
Add encrypted secret to vault
- Check capacity limits
- Validate secret size (<1KB)
- Increment secret count

### `update_secret`
Update existing secret
- Owner verification
- Replace ciphertext and nonce

### `delete_secret`
Delete secret from vault
- Close secret account
- Decrement secret count
- Refund rent to owner

### `upgrade_tier`
Upgrade vault tier
- Validate upgrade path (no downgrades)
- Process SOL/USDC payment
- Update tier and capacity

### `rotate_wallet`
Change vault owner wallet
- Useful for lost wallets
- Requires Life Phrase for vault seed
- Transfer ownership

## 🔐 Security

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2-SHA256
- **Iterations**: 600,000
- **Salt**: Unique per secret
- **Nonce**: Random 12 bytes per encryption

### Key Management
- Keys derived client-side only
- Never transmitted to servers
- Session-only storage (sessionStorage)
- Cleared on logout

### Smart Contract Security
- Account ownership verification
- Tier capacity enforcement
- Rent-exempt accounts
- No upgradeable authority (immutable after deployment)

## 📊 Testing

### Frontend Tests
```bash
cd joyvault-app
npm run test
```

### Smart Contract Tests
```bash
cd joyvault-contract
anchor test
```

Tests cover:
- Vault initialization
- Secret CRUD operations
- Tier upgrades
- Wallet rotation
- Payment processing
- Error handling

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions covering:
- Solana CLI setup
- Smart contract deployment
- Frontend deployment to Vercel
- Environment configuration
- Mainnet migration

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Ensure security considerations

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [joyvault.io](https://joyvault.io) *(coming soon)*
- **Twitter**: [@joyvault](https://twitter.com/joyvault)
- **Telegram**: [t.me/joyvault](https://t.me/joyvault)
- **Documentation**: [docs.joyvault.io](https://docs.joyvault.io) *(coming soon)*

## ⚠️ Disclaimer

**IMPORTANT**: JoyVault is a decentralized application where you are solely responsible for your secrets and access credentials.

- **No Recovery**: If you forget your Life Phrase, your vault CANNOT be recovered
- **No Support Access**: Support cannot access or recover your vault
- **Use at Own Risk**: Store only what you can afford to lose
- **Beta Software**: JoyVault is in active development
- **Security Audit**: Not yet audited - use with caution

## 🙏 Acknowledgments

- [Solana](https://solana.com) - High-performance blockchain
- [Anchor](https://www.anchor-lang.com/) - Solana development framework
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter) - Wallet integration

## 📧 Contact

For inquiries, reach out via:
- Email: hello@joyvault.io
- Twitter: [@joyvault](https://twitter.com/joyvault)
- Telegram: [t.me/joyvault](https://t.me/joyvault)

---

**Built with ❤️ on Solana**

*JoyVault - Where Your Memory Meets the Blockchain*
