import { expect } from "chai";
import { ethers } from "hardhat";
import { createNote, TREE_LEVELS } from "@prism/sdk";

async function fixture() {
  const [deployer, alice, bob] = await ethers.getSigners();

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

  for (const who of [alice, bob]) {
    await (await token.mint(who.address, ethers.parseEther("100"))).wait();
    await (await token.connect(who).approve(await vault.getAddress(), ethers.MaxUint256)).wait();
  }

  return { deployer, alice, bob, token, vault, denom };
}

describe("PrismVault", function () {
  this.timeout(60_000);

  it("deploys with the expected parameters and an initial root", async function () {
    const { vault, token, denom } = await fixture();
    expect(await vault.token()).to.equal(await token.getAddress());
    expect(await vault.denomination()).to.equal(denom);
    expect(await vault.levels()).to.equal(TREE_LEVELS);
    expect(await vault.getLastRoot()).to.not.equal(0n);
    expect(await vault.isKnownRoot(await vault.getLastRoot())).to.equal(true);
  });

  it("accepts a deposit and advances the Merkle root", async function () {
    const { vault, alice } = await fixture();
    const rootBefore = await vault.getLastRoot();
    const note = await createNote();

    await expect(vault.connect(alice).deposit(note.commitment)).to.emit(vault, "Deposit");
    expect(await vault.getLastRoot()).to.not.equal(rootBefore);

    const [deposits, withdrawals, , anonymitySet] = await vault.getStats();
    expect(deposits).to.equal(1n);
    expect(withdrawals).to.equal(0n);
    expect(anonymitySet).to.equal(1n);
  });

  it("rejects a zero or out-of-field commitment", async function () {
    const { vault, alice } = await fixture();
    await expect(vault.connect(alice).deposit(0n)).to.be.revertedWithCustomError(
      vault,
      "InvalidCommitment"
    );
    const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    await expect(vault.connect(alice).deposit(FIELD)).to.be.revertedWithCustomError(
      vault,
      "InvalidCommitment"
    );
  });

  it("rejects a duplicate commitment", async function () {
    const { vault, alice, bob } = await fixture();
    const note = await createNote();
    await (await vault.connect(alice).deposit(note.commitment)).wait();
    await expect(vault.connect(bob).deposit(note.commitment)).to.be.revertedWithCustomError(
      vault,
      "CommitmentAlreadyExists"
    );
  });

  it("rejects a withdraw against an unknown root", async function () {
    const { vault, alice } = await fixture();
    const z: [bigint, bigint] = [0n, 0n];
    const zz: [[bigint, bigint], [bigint, bigint]] = [z, z];
    await expect(
      vault.connect(alice).withdraw(z, zz, z, 12345n, 1n, alice.address)
    ).to.be.revertedWithCustomError(vault, "UnknownMerkleRoot");
  });
});
