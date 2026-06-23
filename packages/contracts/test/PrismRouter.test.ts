import { expect } from "chai";
import { ethers } from "hardhat";
import { createNote, TREE_LEVELS } from "@prism/sdk";

async function fixture() {
  const [deployer, alice] = await ethers.getSigners();

  const Poseidon = await ethers.getContractFactory("PoseidonT3");
  const poseidonLib = await Poseidon.deploy();
  await poseidonLib.waitForDeployment();
  const poseidonAddr = await poseidonLib.getAddress();

  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();

  const Mock = await ethers.getContractFactory("MockERC20");
  const token = await Mock.deploy("USD Coin", "USDC", 18);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();

  const Router = await ethers.getContractFactory("PrismRouter");
  const router = await Router.deploy();
  await router.waitForDeployment();

  const Vault = await ethers.getContractFactory("PrismVault", {
    libraries: { PoseidonT3: poseidonAddr },
  });

  async function deployVault(denom: bigint) {
    const v = await Vault.deploy(verifierAddr, tokenAddr, denom, TREE_LEVELS);
    await v.waitForDeployment();
    return v;
  }

  return { deployer, alice, token, tokenAddr, router, deployVault };
}

describe("PrismRouter", function () {
  this.timeout(60_000);

  it("registers a vault and tracks tokens + denominations", async function () {
    const { router, tokenAddr, deployVault } = await fixture();
    const denom = ethers.parseEther("1");
    const vault = await deployVault(denom);

    await expect(router.registerVault(tokenAddr, denom, await vault.getAddress())).to.emit(
      router,
      "VaultRegistered"
    );
    expect(await router.getVault(tokenAddr, denom)).to.equal(await vault.getAddress());
    expect(await router.getSupportedTokens()).to.deep.equal([tokenAddr]);
    expect(await router.getDenominations(tokenAddr)).to.deep.equal([denom]);
  });

  it("rejects a duplicate registration and non-owner registration", async function () {
    const { router, tokenAddr, deployVault, alice } = await fixture();
    const denom = ethers.parseEther("1");
    const vault = await deployVault(denom);
    await (await router.registerVault(tokenAddr, denom, await vault.getAddress())).wait();

    await expect(
      router.registerVault(tokenAddr, denom, await vault.getAddress())
    ).to.be.revertedWith("Vault already exists");
    await expect(
      router.connect(alice).registerVault(tokenAddr, denom, await vault.getAddress())
    ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
  });

  it("routes a deposit into the matching vault", async function () {
    const { router, token, tokenAddr, deployVault, alice } = await fixture();
    const denom = ethers.parseEther("1");
    const vault = await deployVault(denom);
    await (await router.registerVault(tokenAddr, denom, await vault.getAddress())).wait();

    await (await token.mint(alice.address, denom)).wait();
    await (await token.connect(alice).approve(await router.getAddress(), denom)).wait();

    const note = await createNote();
    await expect(router.connect(alice).deposit(tokenAddr, denom, note.commitment)).to.emit(
      router,
      "PrivateDeposit"
    );
    const [deposits] = await vault.getStats();
    expect(deposits).to.equal(1n);
    expect(await token.balanceOf(await vault.getAddress())).to.equal(denom);
  });

  it("computes an optimal denomination split", async function () {
    const { router, tokenAddr, deployVault } = await fixture();
    const denoms = [ethers.parseEther("1"), ethers.parseEther("10")];
    for (const d of denoms) {
      const v = await deployVault(d);
      await (await router.registerVault(tokenAddr, d, await v.getAddress())).wait();
    }
    const [outDenoms, counts] = await router.getOptimalSplit(tokenAddr, ethers.parseEther("23"));
    // 23 = 2 x 10 + 3 x 1
    const map = new Map(outDenoms.map((d: bigint, i: number) => [d.toString(), counts[i]]));
    expect(map.get(ethers.parseEther("10").toString())).to.equal(2n);
    expect(map.get(ethers.parseEther("1").toString())).to.equal(3n);
  });
});
