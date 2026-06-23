export const PRISM_VAULT_ABI = [
  "function deposit(uint256 commitment)",
  "function withdraw(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256 root, uint256 nullifierHash, address recipient)",
  "function isSpent(uint256 nullifierHash) view returns (bool)",
  "function getLastRoot() view returns (uint256)",
  "function isKnownRoot(uint256 root) view returns (bool)",
  "function denomination() view returns (uint256)",
  "function token() view returns (address)",
  "function getStats() view returns (uint256 deposits, uint256 withdrawals, uint256 poolBalance, uint256 anonymitySet)",
  "event Deposit(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp)",
  "event Withdrawal(address indexed to, uint256 nullifierHash)",
] as const;

export const PRISM_ROUTER_ABI = [
  "function deposit(address token, uint256 denomination, uint256 commitment)",
  "function registerVault(address token, uint256 denomination, address vault)",
  "function getVault(address token, uint256 denomination) view returns (address)",
  "function getSupportedTokens() view returns (address[])",
  "function getDenominations(address token) view returns (uint256[])",
  "function getAllVaults() view returns (address[])",
  "function getOptimalSplit(address token, uint256 amount) view returns (uint256[] denoms, uint256[] counts)",
  "event PrivateDeposit(address indexed token, uint256 denomination, uint256 commitment)",
] as const;

export const MOCK_ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function decimals() view returns (uint8)",
] as const;
