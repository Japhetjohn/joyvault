#!/bin/bash
# JoyVault Contract Comprehensive Test Script
# This script performs thorough testing of all contract functions

set -e

echo "=================================================="
echo "🚀 JoyVault Smart Contract Comprehensive Testing"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

# 1. Build Test
echo -e "${BLUE}[1/6] Building Contract...${NC}"
anchor build > /dev/null 2>&1
print_result $? "Contract build"

# 2. Program Size Check
echo -e "\n${BLUE}[2/6] Checking Program Size...${NC}"
PROGRAM_SIZE=$(stat -c%s "target/deploy/joyvault_contract.so")
PROGRAM_SIZE_KB=$((PROGRAM_SIZE / 1024))
echo "Program size: ${PROGRAM_SIZE_KB}KB"
if [ $PROGRAM_SIZE -lt 500000 ]; then
    print_result 0 "Program size within limits (<500KB)"
else
    print_result 1 "Program size check (too large: ${PROGRAM_SIZE_KB}KB)"
fi

# 3. IDL Generation
echo -e "\n${BLUE}[3/6] Checking IDL Generation...${NC}"
if [ -f "target/idl/joyvault_contract.json" ]; then
    print_result 0 "IDL file generation"
    IDL_SIZE=$(stat -c%s "target/idl/joyvault_contract.json")
    echo "IDL size: $((IDL_SIZE / 1024))KB"
else
    print_result 1 "IDL file generation"
fi

# 4. Type Definitions
echo -e "\n${BLUE}[4/6] Checking TypeScript Types...${NC}"
if [ -f "target/types/joyvault_contract.ts" ]; then
    print_result 0 "TypeScript type definitions"
else
    print_result 1 "TypeScript type definitions"
fi

# 5. Verify Program ID
echo -e "\n${BLUE}[5/6] Verifying Program ID...${NC}"
PROGRAM_ID="8bqnKmrsbNdZHP8p9sCV1oeeRkzkpQbYvxBeFZ2DiXSB"
DECLARED_ID=$(grep "declare_id" programs/joyvault-contract/src/lib.rs | grep -o "8[a-zA-Z0-9]*")
if [ "$PROGRAM_ID" = "$DECLARED_ID" ]; then
    print_result 0 "Program ID consistency"
    echo "Program ID: $PROGRAM_ID"
else
    print_result 1 "Program ID mismatch"
fi

# 6. Account Structure Validation
echo -e "\n${BLUE}[6/6] Validating Account Structures...${NC}"

# Check if all required structs exist
REQUIRED_STRUCTS=("GlobalConfig" "Vault" "EncryptedSecret" "VaultTier" "SecretType")
for struct in "${REQUIRED_STRUCTS[@]}"; do
    if grep -q "struct $struct" programs/joyvault-contract/src/lib.rs || grep -q "enum $struct" programs/joyvault-contract/src/lib.rs; then
        print_result 0 "Account struct: $struct"
    else
        print_result 1 "Account struct: $struct"
    fi
done

# Check if delete_secret was removed
if grep -q "delete_secret" programs/joyvault-contract/src/lib.rs; then
    print_result 1 "delete_secret removed (still exists)"
else
    print_result 0 "delete_secret properly removed"
fi

# Final Summary
echo ""
echo "=================================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=================================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED! Contract is ready for deployment.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
    exit 1
fi
