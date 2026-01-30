#!/bin/bash

# HostFi Endpoint Testing Script
# This script tests all HostFi endpoints systematically

set -e  # Exit on error

BASE_URL="http://localhost:5000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5N2NhYWE2ZjRjOTJiYTcwMjMxZDEyMSIsImlhdCI6MTc2OTc3Nzg4MCwiZXhwIjoxNzcyMzY5ODgwfQ.i0MkIEuohVruSdFpasQSeEDquKlOSfEHzcWiSSHW10c"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  HostFi Integration Testing"
echo "========================================"
echo ""

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"

    echo -e "${YELLOW}Testing:${NC} $name"
    echo "  URL: $method $url"

    if [ -z "$data" ]; then
        response=$(curl -s -X "$method" -H "Authorization: Bearer $TOKEN" "$BASE_URL$url")
    else
        response=$(curl -s -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" "$BASE_URL$url")
    fi

    success=$(echo "$response" | jq -r '.success // false')

    if [ "$success" = "true" ]; then
        echo -e "  ${GREEN}✓ SUCCESS${NC}"
        echo "$response" | jq . | head -20
    else
        echo -e "  ${RED}✗ FAILED${NC}"
        echo "$response" | jq .
    fi
    echo ""
}

# ==========================================
# PHASE 1: Basic Connectivity
# ==========================================
echo "==========================================
PHASE 1: Basic Connectivity & Info
==========================================="
echo ""

test_endpoint "Get Supported Currencies" "GET" "/api/hostfi/currencies/supported"
test_endpoint "Get Exchange Rates (USDC → NGN)" "GET" "/api/hostfi/rates/exchange?from=USDC&to=NGN"
test_endpoint "Get Exchange Fees" "GET" "/api/hostfi/fees/exchange?from=USDC&to=NGN&amount=100"

# ==========================================
# PHASE 2: Wallet Management
# ==========================================
echo "==========================================
PHASE 2: Wallet Management
==========================================="
echo ""

test_endpoint "Get Wallet Information" "GET" "/api/hostfi/wallet"
test_endpoint "Get Balance Summary" "GET" "/api/hostfi/wallet/balance-summary"
test_endpoint "Get Transaction History" "GET" "/api/hostfi/wallet/transactions?page=1&limit=10"

# ==========================================
# PHASE 3: ON-RAMP (Collections)
# ==========================================
echo "==========================================
PHASE 3: ON-RAMP (Collections)
==========================================="
echo ""

test_endpoint "Create Crypto Collection Address (Solana USDC)" "POST" "/api/hostfi/collections/crypto/address" '{"currency":"USDC","network":"SOL"}'
test_endpoint "Get All Crypto Addresses" "GET" "/api/hostfi/collections/crypto/addresses"
test_endpoint "Create Fiat Collection Channel (NGN)" "POST" "/api/hostfi/collections/fiat/channel" '{"currency":"NGN"}'
test_endpoint "Get All Fiat Channels" "GET" "/api/hostfi/collections/fiat/channels"

# ==========================================
# PHASE 4: OFF-RAMP (Withdrawals)
# ==========================================
echo "==========================================
PHASE 4: OFF-RAMP (Withdrawals)
==========================================="
echo ""

test_endpoint "Get Withdrawal Methods" "GET" "/api/hostfi/withdrawal/methods"
test_endpoint "Get Nigerian Banks" "GET" "/api/hostfi/banks/NG"

# Note: Account verification and withdrawal require real bank details
echo -e "${YELLOW}INFO:${NC} Skipping account verification and withdrawal tests (require real bank details)"
echo ""

# ==========================================
# BENEFICIARIES
# ==========================================
echo "==========================================
Beneficiary Management
==========================================="
echo ""

test_endpoint "Get Beneficiaries" "GET" "/api/hostfi/beneficiaries"

# ==========================================
# SUMMARY
# ==========================================
echo "=========================================="
echo "  Testing Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review results above"
echo "2. Fix any failing endpoints"
echo "3. Test withdrawal flow with real bank account"
echo "4. Configure webhooks when domain is ready"
echo ""
