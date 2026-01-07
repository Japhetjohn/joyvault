#!/bin/bash

# JoyVault Devnet Deployment Script
# Run this when you have 2+ SOL in your devnet wallet

set -e

echo "================================"
echo "  JoyVault Devnet Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Solana balance
echo "Checking SOL balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${RED}ERROR: Insufficient SOL balance!${NC}"
    echo "Need: 2 SOL"
    echo "Have: $BALANCE SOL"
    echo ""
    echo "Get more SOL from:"
    echo "- https://faucet.solana.com"
    echo "- https://faucet.quicknode.com/solana/devnet"
    echo "- https://solfaucet.com"
    echo ""
    echo "Your wallet: $(solana address)"
    exit 1
fi

echo -e "${GREEN}✓ Sufficient balance${NC}"
echo ""

# Check we're on devnet
echo "Checking network configuration..."
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ "$CLUSTER" != *"devnet"* ]]; then
    echo -e "${YELLOW}WARNING: Not on devnet!${NC}"
    echo "Current cluster: $CLUSTER"
    read -p "Switch to devnet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        solana config set --url https://api.devnet.solana.com
        echo -e "${GREEN}✓ Switched to devnet${NC}"
    else
        echo "Aborted."
        exit 1
    fi
fi

echo -e "${GREEN}✓ On devnet${NC}"
echo ""

# Navigate to contract directory
cd "$(dirname "$0")/joyvault-contract"

# Build contract
echo "Building smart contract..."
anchor build

if [ ! -f "target/deploy/joyvault_contract.so" ]; then
    echo -e "${RED}ERROR: Contract build failed!${NC}"
    exit 1
fi

CONTRACT_SIZE=$(du -h target/deploy/joyvault_contract.so | awk '{print $1}')
echo -e "${GREEN}✓ Contract built successfully${NC} (Size: $CONTRACT_SIZE)"
echo ""

# Deploy contract
echo "Deploying to devnet..."
echo "(This will take a minute...)"
anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Contract deployed successfully!${NC}"
echo ""

# Get Program ID
PROGRAM_ID=$(solana address -k target/deploy/joyvault_contract-keypair.json)
echo "Program ID: $PROGRAM_ID"
echo ""

# Save Program ID to file
echo "$PROGRAM_ID" > DEPLOYED_PROGRAM_ID.txt
echo "Program ID saved to: DEPLOYED_PROGRAM_ID.txt"
echo ""

# Update frontend
echo "================================"
echo "  NEXT STEPS - Update Frontend"
echo "================================"
echo ""
echo "1. Update lib/solana/program.ts:"
echo "   Change line 13 to:"
echo -e "   ${YELLOW}export const PROGRAM_ID = new PublicKey('$PROGRAM_ID')${NC}"
echo ""
echo "2. Update lib/solana/usdc.ts:"
echo "   Change line 25 (TREASURY_WALLET) to your treasury wallet address"
echo ""
echo "3. Create .env.local in joyvault-app/:"
echo "   NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID"
echo "   NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
echo "   NEXT_PUBLIC_TREASURY_WALLET=<YOUR_TREASURY_WALLET>"
echo "   NEXT_PUBLIC_ENVIRONMENT=devnet"
echo ""
echo "4. Rebuild frontend:"
echo "   cd joyvault-app"
echo "   npm run build"
echo ""
echo "5. Test the full flow!"
echo ""
echo "Deployment complete! 🎉"
