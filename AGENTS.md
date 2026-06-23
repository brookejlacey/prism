# AGENTS.md

Guidance for working in this repo.

## Layout

pnpm + Turborepo monorepo:

- `packages/circuits` - circom `withdraw` circuit + Groth16 setup (emits `Verifier.sol`, wasm, zkey).
- `packages/contracts` - Solidity (`PrismVault`, `PrismRouter`, generated `Groth16Verifier`, `PoseidonT3`), Hardhat tests, deploy script.
- `packages/sdk` - TypeScript client: notes, Merkle tree, snarkjs proving.
- `packages/dashboard` - Next.js UI + Playwright tests.

## Commands

```bash
pnpm install
pnpm --filter @prism/circuits build      # rebuild circuit + trusted setup (regenerates Verifier.sol)
pnpm --filter @prism/sdk build
pnpm --filter @prism/contracts compile
pnpm --filter @prism/contracts test      # contracts + real-zk withdraw E2E
pnpm --filter @prism/sdk test
pnpm --filter @prism/dashboard test:e2e
pnpm --filter @prism/contracts deploy
```

## Invariants

- One Poseidon (t=3, circomlib-compatible) must hold across the circuit, the on-chain `PoseidonT3` library, and the SDK. `ZERO_VALUE` and tree depth (20) must match in `MerkleTreeWithHistory.sol` and the SDK. There is a test that asserts on-chain and off-chain hashes agree.
- The withdrawal secret is a private circuit witness. It must never become a contract argument or event field.
- `Verifier.sol` is generated from the circuit. If you change `withdraw.circom` or re-run the setup, regenerate the verifier and redeploy it.
- Hardhat solidity build uses the optimizer without `viaIR` (compiling `PoseidonT3` through the IR pipeline is prohibitively slow).
- Contracts target Polkadot Hub (PolkaVM via `revive`/`resolc`); avoid opcodes PolkaVM does not support (`SELFDESTRUCT`, `CODECOPY`, `PC`, blob opcodes) and keep `PoseidonT3` as Solidity source.
