#!/bin/bash

# HostFi Parameter Diagnostics Script
# Tests different network names and retrieves supported currencies

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5N2NhYWE2ZjRjOTJiYTcwMjMxZDEyMSIsImlhdCI6MTc2OTc3Nzg4MCwiZXhwIjoxNzcyMzY5ODgwfQ.i0MkIEuohVruSdFpasQSeEDquKlOSfEHzcWiSSHW10c"
BASE_URL="http://localhost:5000"

echo "========================================"
echo "  HostFi Parameter Diagnostics"
echo "========================================"
echo ""

# Test 1: Get supported currencies to find valid networks
echo "1. Getting supported payment currencies..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/hostfi/currencies/supported" | jq . > /tmp/supported-currencies.json

echo "Supported currencies saved to /tmp/supported-currencies.json"
cat /tmp/supported-currencies.json
echo ""

# Test 2: Try different network names for crypto collection
echo "2. Testing different network names for USDC crypto collection..."
echo ""

NETWORKS=("SPL" "SOLANA" "SOL" "Solana" "solana" "ERC20")

for network in "${NETWORKS[@]}"; do
    echo "Testing network: $network"
    response=$(curl -s -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"currency\":\"USDC\",\"network\":\"$network\"}" \
      "$BASE_URL/api/hostfi/collections/crypto/address")

    success=$(echo "$response" | jq -r '.success')

    if [ "$success" = "true" ]; then
        echo "  ✓ SUCCESS with network: $network"
        echo "$response" | jq .
        break
    else
        error=$(echo "$response" | jq -r '.error')
        echo "  ✗ FAILED: $error"
    fi
    echo ""
done

echo ""
echo "3. Testing fiat collection channel with different parameters..."
echo ""

# Try basic request first
echo "Testing basic NGN fiat channel..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"NGN"}' \
  "$BASE_URL/api/hostfi/collections/fiat/channel" | jq .

echo ""
echo "========================================"
echo "Diagnostics complete!"
echo "Check /tmp/supported-currencies.json for full currency list"
echo "========================================"
