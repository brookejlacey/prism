import { expect } from "chai";
import { ethers } from "hardhat";
import * as path from "path";
import {
  createNote,
  fromSecrets,
  poseidon,
  MerkleTree,
  generateWithdrawProof,
  TREE_LEVELS,
} from "@prism/sdk";

// Artifacts produced by packages/circuits/scripts/build.sh
const CIRCUITS = path.resolve(__dirname, "../../circuits/build");
const WASM = path.join(CIRCUITS, "withdraw_js/withdraw.wasm");
const ZKEY = path.join(CIRCUITS, "withdraw_final.zkey");

async function deploy() {
  const [deployer, recipient] = await ethers.getSigners();

  const Poseidon = await ethers.getContractFactory("PoseidonT3");
  const poseidonLib = await Poseidon.deploy();
  await poseidonLib.waitForDeployment();

  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  const Mock = await ethers.getContractFactory("MockERC20");
  const token = await Mock.deploy("USD Coin", "USDC", 18);
  await token.waitForDeployment();

  const denom = ethers.parseEther("1");
  const Vault = await ethers.getContractFactory("PrismVault", {
    libraries: { PoseidonT3: await poseidonLib.getAddress() },
  });
  const vault = await Vault.deploy(
    await verifier.getAddress(),
    await token.getAddress(),
    denom,
    TREE_LEVELS
  );
  await vault.waitForDeployment();

  return { deployer, recipient, poseidonLib, verifier, token, vault, denom };
}

describe("Prism end-to-end (real zk withdraw)", function () {
  this.timeout(120_000);

  it("on-chain Poseidon matches the circuit's Poseidon (consistency)", async function () {
    const { poseidonLib } = await deploy();
    const a = 1234567890n;
    const b = 9876543210n;
    const onchain: bigint = await poseidonLib.getFunction("hash")([a, b]);
    const offchain = await poseidon([a, b]);
    expect(onchain).to.equal(offchain);
  });

  it("deposits, proves membership in zk, and withdraws to a fresh recipient", async function () {
    const { deployer, recipient, token, vault, denom } = await deploy();

    await (await token.mint(deployer.address, denom)).wait();
    await (await token.approve(await vault.getAddress(), denom)).wait();

    const note = await createNote();
    await (await vault.deposit(note.commitment)).wait();

    // Rebuild the tree off-chain from the (single) deposited commitment.
    const tree = await MerkleTree.build([note.commitment]);
    expect(tree.root).to.equal(await vault.getLastRoot());

    const proof = await generateWithdrawProof({
      note,
      tree,
      leafIndex: 0,
      recipient: recipient.address,
      wasmPath: WASM,
      zkeyPath: ZKEY,
    });

    expect(await token.balanceOf(recipient.address)).to.equal(0n);
    await expect(
      vault.withdraw(proof.a, proof.b, proof.c, tree.root, note.nullifierHash, recipient.address)
    ).to.emit(vault, "Withdrawal");

    expect(await token.balanceOf(recipient.address)).to.equal(denom);
    expect(await vault.isSpent(note.nullifierHash)).to.equal(true);
  });

  it("rejects a replayed nullifier (double-spend)", async function () {
    const { deployer, recipient, token, vault, denom } = await deploy();
    await (await token.mint(deployer.address, denom * 2n)).wait();
    await (await token.approve(await vault.getAddress(), denom * 2n)).wait();

    const note = await createNote();
    await (await vault.deposit(note.commitment)).wait();
    const tree = await MerkleTree.build([note.commitment]);
    const proof = await generateWithdrawProof({
      note,
      tree,
      leafIndex: 0,
      recipient: recipient.address,
      wasmPath: WASM,
      zkeyPath: ZKEY,
    });

    await (
      await vault.withdraw(proof.a, proof.b, proof.c, tree.root, note.nullifierHash, recipient.address)
    ).wait();

    await expect(
      vault.withdraw(proof.a, proof.b, proof.c, tree.root, note.nullifierHash, recipient.address)
    ).to.be.revertedWithCustomError(vault, "NullifierAlreadySpent");
  });

  it("rejects a proof re-targeted to a different recipient", async function () {
    const { deployer, recipient, token, vault, denom } = await deploy();
    const [, , attacker] = await ethers.getSigners();
    await (await token.mint(deployer.address, denom)).wait();
    await (await token.approve(await vault.getAddress(), denom)).wait();

    const note = await createNote();
    await (await vault.deposit(note.commitment)).wait();
    const tree = await MerkleTree.build([note.commitment]);
    const proof = await generateWithdrawProof({
      note,
      tree,
      leafIndex: 0,
      recipient: recipient.address,
      wasmPath: WASM,
      zkeyPath: ZKEY,
    });

    // Proof was bound to `recipient`; using it for `attacker` must fail.
    await expect(
      vault.withdraw(proof.a, proof.b, proof.c, tree.root, note.nullifierHash, attacker.address)
    ).to.be.revertedWithCustomError(vault, "InvalidWithdrawProof");
  });
});
