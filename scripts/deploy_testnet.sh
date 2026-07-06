#!/usr/bin/env bash
# Deploy the AgroPay escrow contract to Stellar Testnet.
#
# Prerequisites:
#   - Rust + wasm32-unknown-unknown target installed
#   - Soroban CLI installed: cargo install --locked soroban-cli
#   - A funded testnet identity (see `soroban keys generate` + friendbot)
#
# Usage:
#   ./scripts/deploy_testnet.sh <ADMIN_IDENTITY_NAME> <PAYMENT_TOKEN_CONTRACT_ID>

set -euo pipefail

ADMIN_IDENTITY="${1:?Usage: deploy_testnet.sh <admin_identity> <payment_token_contract_id>}"
TOKEN_CONTRACT_ID="${2:?Usage: deploy_testnet.sh <admin_identity> <payment_token_contract_id>}"

CONTRACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../contracts/agropay_escrow" && pwd)"
NETWORK="testnet"

echo "==> Building contract..."
cd "$CONTRACT_DIR"
cargo build --target wasm32-unknown-unknown --release

WASM_PATH="$CONTRACT_DIR/../target/wasm32-unknown-unknown/release/agropay_escrow.wasm"

echo "==> Deploying to $NETWORK..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm "$WASM_PATH" \
  --source "$ADMIN_IDENTITY" \
  --network "$NETWORK")

echo "==> Deployed. Contract ID: $CONTRACT_ID"

ADMIN_ADDRESS=$(soroban keys address "$ADMIN_IDENTITY")

echo "==> Initializing contract..."
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_CONTRACT_ID"

echo ""
echo "=========================================="
echo " Deployment complete"
echo " Contract ID: $CONTRACT_ID"
echo " Admin:       $ADMIN_ADDRESS"
echo " Set this in frontend/.env as:"
echo "   VITE_ESCROW_CONTRACT_ID=$CONTRACT_ID"
echo " And in backend/.env as:"
echo "   ESCROW_CONTRACT_ID=$CONTRACT_ID"
echo "=========================================="
