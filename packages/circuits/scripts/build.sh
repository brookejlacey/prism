#!/usr/bin/env bash
# Compile the withdraw circuit and run a self-contained Groth16 setup.
# Produces build/withdraw_js/withdraw.wasm, build/withdraw_final.zkey,
# build/verification_key.json and contracts/Verifier.sol.
#
# NOTE: this runs a fresh, single-contributor powers-of-tau ceremony with local
# entropy. That is fine for a testnet / portfolio deployment. A production
# mainnet deployment must use a multi-party ceremony (e.g. Hermez ptau) so no
# single party knows the toxic waste.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p build
POWER=15

echo "==> compiling circuit"
circom circuits/withdraw.circom --r1cs --wasm --sym -o build

echo "==> powers of tau (2^$POWER)"
npx snarkjs powersoftau new bn128 "$POWER" build/pot_0.ptau -v
npx snarkjs powersoftau contribute build/pot_0.ptau build/pot_1.ptau \
  --name="prism-local" -v -e="prism phase1 $(date +%s)"
npx snarkjs powersoftau prepare phase2 build/pot_1.ptau build/pot_final.ptau -v

echo "==> groth16 setup"
npx snarkjs groth16 setup build/withdraw.r1cs build/pot_final.ptau build/withdraw_0.zkey
npx snarkjs zkey contribute build/withdraw_0.zkey build/withdraw_final.zkey \
  --name="prism-phase2" -v -e="prism phase2 $(date +%s)"
npx snarkjs zkey export verificationkey build/withdraw_final.zkey build/verification_key.json

echo "==> exporting Solidity verifier"
mkdir -p ../contracts/contracts
npx snarkjs zkey export solidityverifier build/withdraw_final.zkey ../contracts/contracts/Verifier.sol

echo "==> done"
