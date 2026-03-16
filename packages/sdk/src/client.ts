import { ethers } from "ethers";
import {
  PRISM_VAULT_ABI,
  PRISM_ROUTER_ABI,
  CROSS_VM_BRIDGE_ABI,
  MOCK_ERC20_ABI,
} from "./abis";
import {
  generateCommitment,
  deriveNullifier,
  generateProof,
  type DepositNote,
} from "./crypto";

export interface PrismConfig {
  provider: ethers.Provider;
  signer?: ethers.Signer;
  routerAddress: string;
  bridgeAddress: string;
}

export class PrismClient {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private router: ethers.Contract;
  private bridge: ethers.Contract;

  constructor(config: PrismConfig) {
    this.provider = config.provider;
    this.signer = config.signer;

    const signerOrProvider = config.signer ?? config.provider;
    this.router = new ethers.Contract(
      config.routerAddress,
      PRISM_ROUTER_ABI,
      signerOrProvider
    );
    this.bridge = new ethers.Contract(
      config.bridgeAddress,
      CROSS_VM_BRIDGE_ABI,
      signerOrProvider
    );
  }

  /**
   * Deposit tokens into a privacy pool
   * Returns a DepositNote that must be saved to withdraw later
   */
  async deposit(
    tokenAddress: string,
    denomination: bigint
  ): Promise<{ note: DepositNote; tx: ethers.TransactionResponse }> {
    if (!this.signer) throw new Error("Signer required for deposits");

    const note = generateCommitment(tokenAddress, denomination);

    // Approve router to spend tokens
    const token = new ethers.Contract(
      tokenAddress,
      MOCK_ERC20_ABI,
      this.signer
    );
    const routerAddr = await this.router.getAddress();
    const allowance = await token.allowance(
      await this.signer.getAddress(),
      routerAddr
    );
    if (allowance < denomination) {
      const approveTx = await token.approve(routerAddr, ethers.MaxUint256);
      await approveTx.wait();
    }

    // Deposit through router
    const tx = await this.router.deposit(
      tokenAddress,
      denomination,
      note.commitment
    );
    const receipt = await tx.wait();

    // Extract leaf index from Deposit event
    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    const vault = new ethers.Contract(
      vaultAddr,
      PRISM_VAULT_ABI,
      this.provider
    );
    const events = await vault.queryFilter(
      vault.filters.Deposit(note.commitment),
      receipt.blockNumber,
      receipt.blockNumber
    );
    if (events.length > 0) {
      const event = events[0] as ethers.EventLog;
      note.leafIndex = Number(event.args[1]);
    }

    return { note, tx };
  }

  /**
   * Withdraw tokens from a privacy pool using a deposit note
   */
  async withdraw(
    note: DepositNote,
    recipientAddress: string,
    merkleRoot: bigint,
    siblings: bigint[]
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new Error("Signer required for withdrawals");

    const proof = generateProof(
      note.secret,
      note.leafIndex ?? 0,
      siblings
    );

    return this.router.withdraw(
      note.token,
      note.denomination,
      recipientAddress,
      note.nullifierHash,
      merkleRoot,
      proof
    );
  }

  /**
   * Initiate a cross-VM private transfer (EVM → PVM)
   */
  async crossVMTransfer(
    commitment: bigint,
    targetVM: 0 | 1,
    amount: bigint,
    tokenAddress: string
  ): Promise<{ commitmentId: bigint; tx: ethers.TransactionResponse }> {
    if (!this.signer) throw new Error("Signer required");

    const tx = await this.bridge.lockForCrossVM(
      commitment,
      targetVM,
      amount,
      tokenAddress
    );
    const receipt = await tx.wait();

    const events = await this.bridge.queryFilter(
      this.bridge.filters.CrossVMCommitmentLocked(),
      receipt.blockNumber,
      receipt.blockNumber
    );
    const commitmentId =
      events.length > 0
        ? (events[0] as ethers.EventLog).args[0]
        : 0n;

    return { commitmentId, tx };
  }

  /**
   * Initiate an XCM private transfer to another parachain
   */
  async xcmPrivateTransfer(
    commitment: bigint,
    destParaId: number,
    destAddress: string,
    amount: bigint
  ): Promise<{ transferId: bigint; tx: ethers.TransactionResponse }> {
    if (!this.signer) throw new Error("Signer required");

    const tx = await this.bridge.initiateXCMPrivateTransfer(
      commitment,
      destParaId,
      ethers.toUtf8Bytes(destAddress),
      amount,
      { value: amount }
    );
    const receipt = await tx.wait();

    const events = await this.bridge.queryFilter(
      this.bridge.filters.XCMPrivateTransferInitiated(),
      receipt.blockNumber,
      receipt.blockNumber
    );
    const transferId =
      events.length > 0
        ? (events[0] as ethers.EventLog).args[0]
        : 0n;

    return { transferId, tx };
  }

  // --- Read methods ---

  async getProtocolStats() {
    const [totalVaults, totalTokens, transfers] =
      await this.router.getProtocolStats();
    return {
      totalVaults: Number(totalVaults),
      totalTokens: Number(totalTokens),
      totalTransfers: Number(transfers),
    };
  }

  async getVaultStats(tokenAddress: string, denomination: bigint) {
    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    if (vaultAddr === ethers.ZeroAddress) return null;

    const vault = new ethers.Contract(
      vaultAddr,
      PRISM_VAULT_ABI,
      this.provider
    );
    const [deposits, withdrawals, poolBalance] = await vault.getStats();
    return {
      address: vaultAddr,
      deposits: Number(deposits),
      withdrawals: Number(withdrawals),
      poolBalance,
      anonymitySet: Number(deposits) - Number(withdrawals),
    };
  }

  async getSupportedTokens(): Promise<string[]> {
    return this.router.getSupportedTokens();
  }

  async getDenominations(tokenAddress: string): Promise<bigint[]> {
    return this.router.getDenominations(tokenAddress);
  }

  async getBridgeStats() {
    const [crossVM, xcm] = await this.bridge.getStats();
    return {
      crossVMTransfers: Number(crossVM),
      xcmTransfers: Number(xcm),
    };
  }

  async isNullifierSpent(
    tokenAddress: string,
    denomination: bigint,
    nullifierHash: bigint
  ): Promise<boolean> {
    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    const vault = new ethers.Contract(
      vaultAddr,
      PRISM_VAULT_ABI,
      this.provider
    );
    return vault.isSpent(nullifierHash);
  }
}
