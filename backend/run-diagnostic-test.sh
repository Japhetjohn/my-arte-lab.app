#!/bin/bash

# Diagnostic script to capture server logs and test fiat channel creation

echo "=========================================="
echo "  HostFi Diagnostic Test"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5N2NhYWE2ZjRjOTJiYTcwMjMxZDEyMSIsImlhdCI6MTc2OTc3Nzg4MCwiZXhwIjoxNzcyMzY5ODgwfQ.i0MkIEuohVruSdFpasQSeEDquKlOSfEHzcWiSSHW10c"

echo "Testing Fiat Collection Channel Creation..."
echo "Payload: {\"currency\":\"NGN\"}"
echo ""

response=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"NGN"}' \
  "$BASE_URL/api/hostfi/collections/fiat/channel")

echo "Response:"
echo "$response" | jq .
echo ""

echo "=========================================="
echo ""

echo "Testing Crypto Collection Address Creation..."
echo "Payload: {\"currency\":\"USDC\",\"network\":\"SOL\"}"
echo ""

response=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USDC","network":"SOL"}' \
  "$BASE_URL/api/hostfi/collections/crypto/address")

echo "Response:"
echo "$response" | jq .
echo ""

echo "=========================================="
echo ""
echo "Check your server console for detailed error logs"
echo "Look for lines starting with 'HostFi error details:'"
echo ""
