// Contract addresses — update after deployment
export const CONTRACTS = {
  pvmCore: process.env.NEXT_PUBLIC_PVM_CORE_ADDRESS || "0x0000000000000000000000000000000000000000",
  router: process.env.NEXT_PUBLIC_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000",
  bridge: process.env.NEXT_PUBLIC_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000",
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

// Demo data for when contracts aren't deployed
export const DEMO_STATS = {
  totalDeposits: 142,
  totalWithdrawals: 89,
  poolBalance: "53.0",
  anonymitySet: 53,
  crossVMTransfers: 23,
  xcmTransfers: 11,
  supportedTokens: ["USDC", "DOT", "GLMR"],
  totalVaults: 12,
  evmGasSaved: "14x",
};
