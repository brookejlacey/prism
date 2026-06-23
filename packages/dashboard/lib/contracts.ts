// Contract addresses — populated after deployment via NEXT_PUBLIC_* env vars.
export const CONTRACTS = {
  router: process.env.NEXT_PUBLIC_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000",
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",
  verifier: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || "0x0000000000000000000000000000000000000000",
  poseidon: process.env.NEXT_PUBLIC_POSEIDON_ADDRESS || "0x0000000000000000000000000000000000000000",
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

// Illustrative figures for the interface preview when no deployment is wired.
export const DEMO_STATS = {
  totalDeposits: 142,
  totalWithdrawals: 89,
  poolBalance: "53.0",
  anonymitySet: 142,
  treeDepth: 20,
  denominations: ["0.1", "1", "10", "100"],
  supportedTokens: ["USDC"],
};
