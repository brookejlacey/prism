export const PVM_CRYPTO_CORE_ABI = [
  "function pedersenCommit(uint256 value, uint256 blinding) external pure returns (uint256)",
  "function pedersenVerify(uint256 commitment, uint256 value, uint256 blinding) external pure returns (bool)",
  "function generateRangeProof(uint256 value, uint256 blinding) external pure returns (bytes)",
  "function verifyRangeProof(uint256 commitment, bytes proof) external pure returns (bool)",
  "function poseidonHash(uint256 left, uint256 right) external pure returns (uint256)",
  "function verifyNullifier(uint256 nullifierHash, uint256 merkleRoot, bytes proof) external pure returns (bool)",
] as const;

export const PRISM_VAULT_ABI = [
  "function deposit(uint256 commitment) external",
  "function depositNative(uint256 commitment) external payable",
  "function withdraw(address recipient, uint256 nullifierHash, uint256 root, bytes proof) external",
  "function withdrawNative(address recipient, uint256 nullifierHash, uint256 root, bytes proof) external",
  "function initiatePrivateSwap(uint256 inputCommitment, address targetToken, uint256 minOutput) external returns (uint256)",
  "function completePrivateSwap(uint256 swapId, uint256 outputCommitment, uint256 nullifierHash, uint256 root, bytes proof) external",
  "function getMerkleRoot() external view returns (uint256)",
  "function getNextIndex() external view returns (uint256)",
  "function isSpent(uint256 nullifierHash) external view returns (bool)",
  "function isCommitted(uint256 commitment) external view returns (bool)",
  "function getStats() external view returns (uint256 deposits, uint256 withdrawals, uint256 poolBalance)",
  "function token() external view returns (address)",
  "function denomination() external view returns (uint256)",
  "event Deposit(uint256 indexed commitment, uint256 leafIndex, uint256 timestamp)",
  "event Withdrawal(address indexed to, uint256 nullifierHash, uint256 amount)",
  "event PrivateSwapInitiated(uint256 indexed swapId, uint256 commitment)",
  "event PrivateSwapCompleted(uint256 indexed swapId)",
] as const;

export const PRISM_ROUTER_ABI = [
  "function deposit(address token, uint256 denomination, uint256 commitment) external",
  "function withdraw(address token, uint256 denomination, address recipient, uint256 nullifierHash, uint256 root, bytes proof) external",
  "function getOptimalSplit(address token, uint256 amount) external view returns (uint256[] denoms, uint256[] counts)",
  "function getVault(address token, uint256 denomination) external view returns (address)",
  "function getSupportedTokens() external view returns (address[])",
  "function getDenominations(address token) external view returns (uint256[])",
  "function getAllVaults() external view returns (address[])",
  "function getProtocolStats() external view returns (uint256 totalVaults, uint256 totalTokens, uint256 transfers)",
  "function registerVault(address token, uint256 denomination, address vault) external",
  "function deployStandardVaults(address token) external",
  "event VaultRegistered(address indexed token, uint256 denomination, address vault)",
  "event PrivateTransfer(uint256 indexed transferId, address indexed token, uint256 timestamp)",
] as const;

export const CROSS_VM_BRIDGE_ABI = [
  "function lockForCrossVM(uint256 commitment, uint8 targetVM, uint256 amount, address token) external returns (uint256)",
  "function releaseCrossVM(uint256 commitmentId, uint256 nullifierHash) external",
  "function initiateXCMPrivateTransfer(uint256 commitment, uint32 destParaId, bytes destAddress, uint256 amount) external payable returns (uint256)",
  "function confirmXCMTransfer(uint256 transferId) external",
  "function getCrossVMCommitment(uint256 id) external view returns (tuple(uint256 commitment, uint8 sourceVM, uint8 targetVM, uint256 amount, address token, bool released, uint256 timestamp))",
  "function getXCMTransfer(uint256 id) external view returns (tuple(uint256 commitment, uint32 destParaId, bytes destAddress, uint256 amount, bool completed, uint256 timestamp))",
  "function getStats() external view returns (uint256 crossVM, uint256 xcm)",
  "event CrossVMCommitmentLocked(uint256 indexed commitmentId, uint256 commitment, uint8 targetVM)",
  "event CrossVMCommitmentReleased(uint256 indexed commitmentId, uint256 nullifierHash)",
  "event XCMPrivateTransferInitiated(uint256 indexed transferId, uint32 destParaId, uint256 commitment)",
  "event XCMPrivateTransferCompleted(uint256 indexed transferId)",
] as const;

export const MOCK_ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
] as const;
