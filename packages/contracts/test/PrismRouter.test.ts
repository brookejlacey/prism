import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PrismRouter", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const PVMCore = await ethers.getContractFactory("PVMCryptoCoreFallback");
    const pvmCore = await PVMCore.deploy();
    const pvmCoreAddr = await pvmCore.getAddress();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 18);
    const usdcAddr = await usdc.getAddress();

    const denomination = ethers.parseEther("1");
    const PrismVault = await ethers.getContractFactory("PrismVault");
    const vault = await PrismVault.deploy(usdcAddr, denomination, pvmCoreAddr);
    const vaultAddr = await vault.getAddress();

    const PrismRouter = await ethers.getContractFactory("PrismRouter");
    const router = await PrismRouter.deploy(pvmCoreAddr);
    const routerAddr = await router.getAddress();

    await router.registerVault(usdcAddr, denomination, vaultAddr);

    await usdc.mint(alice.address, ethers.parseEther("1000"));
    await usdc.connect(alice).approve(routerAddr, ethers.MaxUint256);

    // Also approve the vault for the router
    // The router transfers to itself then to vault, so vault needs router approval
    // Actually the router does transferFrom user -> router, then approve vault, then vault.deposit
    // So we just need user -> router approval (done above)

    return { owner, alice, bob, pvmCore, usdc, vault, router, denomination, pvmCoreAddr, vaultAddr, routerAddr, usdcAddr };
  }

  describe("Vault Registration", function () {
    it("should register a vault", async function () {
      const { router, usdcAddr, vaultAddr, denomination } = await loadFixture(deployFixture);
      expect(await router.getVault(usdcAddr, denomination)).to.equal(vaultAddr);
    });

    it("should track supported tokens", async function () {
      const { router, usdcAddr } = await loadFixture(deployFixture);
      const tokens = await router.getSupportedTokens();
      expect(tokens).to.include(usdcAddr);
    });

    it("should reject duplicate vault registration", async function () {
      const { router, usdcAddr, vaultAddr, denomination } = await loadFixture(deployFixture);
      await expect(router.registerVault(usdcAddr, denomination, vaultAddr)).to.be.revertedWith(
        "Vault already exists"
      );
    });

    it("should only allow owner to register vaults", async function () {
      const { alice, router, usdcAddr, vaultAddr } = await loadFixture(deployFixture);
      await expect(
        router.connect(alice).registerVault(usdcAddr, ethers.parseEther("10"), vaultAddr)
      ).to.be.reverted;
    });
  });

  describe("Router Deposits", function () {
    it("should deposit through router", async function () {
      const { alice, router, pvmCore, usdc, denomination, vaultAddr, usdcAddr } = await loadFixture(deployFixture);

      const secret = 12345n;
      const nullifierHash = await pvmCore.poseidonHash(secret, 0n);
      const commitment = await pvmCore.poseidonHash(secret, nullifierHash);

      const balBefore = await usdc.balanceOf(alice.address);
      await router.connect(alice).deposit(usdcAddr, denomination, commitment);

      expect(await usdc.balanceOf(alice.address)).to.equal(balBefore - denomination);
      expect(await router.totalPrivateTransfers()).to.equal(1);
    });
  });

  describe("Protocol Stats", function () {
    it("should return correct stats", async function () {
      const { router } = await loadFixture(deployFixture);
      const [totalVaults, totalTokens, transfers] = await router.getProtocolStats();
      expect(totalVaults).to.equal(1);
      expect(totalTokens).to.equal(1);
      expect(transfers).to.equal(0);
    });
  });

  describe("Deploy Standard Vaults", function () {
    it("should deploy all standard denomination vaults for a token", async function () {
      const { owner, router, usdcAddr } = await loadFixture(deployFixture);

      const MockToken = await ethers.getContractFactory("MockERC20");
      const dai = await MockToken.deploy("DAI", "DAI", 18);
      const daiAddr = await dai.getAddress();

      await router.deployStandardVaults(daiAddr);
      const denoms = await router.getDenominations(daiAddr);
      expect(denoms.length).to.equal(4);
    });
  });
});
