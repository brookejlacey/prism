import { ethers } from "ethers";
import { PRISM_VAULT_ABI, PRISM_ROUTER_ABI, MOCK_ERC20_ABI } from "./abis";
import {
  createNote,
  MerkleTree,
  generateWithdrawProof,
  TREE_LEVELS,
  type DepositNote,
} from "./crypto";

export interface PrismConfig {
  provider: ethers.Provider;
  signer?: ethers.Signer;
  routerAddress: string;
  /** Paths/URLs to the circuit artifacts produced by the circuits build. */
  wasmPath?: string;
  zkeyPath?: string;
}

export class PrismClient {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private router: ethers.Contract;
  private wasmPath?: string;
  private zkeyPath?: string;

  constructor(config: PrismConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.wasmPath = config.wasmPath;
    this.zkeyPath = config.zkeyPath;
    this.router = new ethers.Contract(
      config.routerAddress,
      PRISM_ROUTER_ABI,
      config.signer ?? config.provider
    );
  }

  private vault(address: string): ethers.Contract {
    return new ethers.Contract(address, PRISM_VAULT_ABI, this.signer ?? this.provider);
  }

  /** Deposit one denomination unit and return the note required to withdraw later. */
  async deposit(
    tokenAddress: string,
    denomination: bigint
  ): Promise<{ note: DepositNote; tx: ethers.TransactionResponse }> {
    if (!this.signer) throw new Error("Signer required for deposits");
    const note = await createNote();

    const token = new ethers.Contract(tokenAddress, MOCK_ERC20_ABI, this.signer);
    const routerAddr = await this.router.getAddress();
    const owner = await this.signer.getAddress();
    if ((await token.allowance(owner, routerAddr)) < denomination) {
      await (await token.approve(routerAddr, ethers.MaxUint256)).wait();
    }

    const tx = await this.router.deposit(tokenAddress, denomination, note.commitment);
    await tx.wait();
    return { note, tx };
  }

  /** Reconstruct the off-chain Merkle tree for a vault from its Deposit events. */
  async buildTree(
    tokenAddress: string,
    denomination: bigint
  ): Promise<{ tree: MerkleTree; commitments: bigint[] }> {
    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    if (vaultAddr === ethers.ZeroAddress) throw new Error("No vault for this pair");
    const vault = this.vault(vaultAddr);

    const events = await vault.queryFilter(vault.filters.Deposit());
    const ordered = (events as ethers.EventLog[]).sort(
      (a, b) => Number(a.args[1]) - Number(b.args[1])
    );
    const commitments = ordered.map((e) => BigInt(e.args[0]));
    const tree = await MerkleTree.build(commitments, TREE_LEVELS);
    return { tree, commitments };
  }

  /** Withdraw privately: generate a Groth16 proof and submit it to the vault. */
  async withdraw(
    note: DepositNote,
    recipientAddress: string,
    tokenAddress: string,
    denomination: bigint
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new Error("Signer required for withdrawals");
    if (!this.wasmPath || !this.zkeyPath)
      throw new Error("wasmPath and zkeyPath are required to prove a withdrawal");

    const { tree, commitments } = await this.buildTree(tokenAddress, denomination);
    const leafIndex = commitments.findIndex((c) => c === note.commitment);
    if (leafIndex < 0) throw new Error("Commitment not found in vault");

    const proof = await generateWithdrawProof({
      note,
      tree,
      leafIndex,
      recipient: recipientAddress,
      wasmPath: this.wasmPath,
      zkeyPath: this.zkeyPath,
    });

    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    return this.vault(vaultAddr).withdraw(
      proof.a,
      proof.b,
      proof.c,
      tree.root,
      note.nullifierHash,
      recipientAddress
    );
  }

  async getVaultStats(tokenAddress: string, denomination: bigint) {
    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    if (vaultAddr === ethers.ZeroAddress) return null;
    const vault = this.vault(vaultAddr);
    const [deposits, withdrawals, poolBalance, anonymitySet] = await vault.getStats();
    return {
      address: vaultAddr,
      deposits: Number(deposits),
      withdrawals: Number(withdrawals),
      poolBalance,
      anonymitySet: Number(anonymitySet),
    };
  }

  async getSupportedTokens(): Promise<string[]> {
    return this.router.getSupportedTokens();
  }

  async getDenominations(tokenAddress: string): Promise<bigint[]> {
    return this.router.getDenominations(tokenAddress);
  }

  async isNullifierSpent(
    tokenAddress: string,
    denomination: bigint,
    nullifierHash: bigint
  ): Promise<boolean> {
    const vaultAddr = await this.router.getVault(tokenAddress, denomination);
    return this.vault(vaultAddr).isSpent(nullifierHash);
  }
}
