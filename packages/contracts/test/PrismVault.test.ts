import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PrismVault", function () {
  async function deployFixture() {
    const [owner, alice, bob, relayer] = await ethers.getSigners();

    // Deploy PVM Core Fallback
    const PVMCore = await ethers.getContractFactory("PVMCryptoCoreFallback");
    const pvmCore = await PVMCore.deploy();
    const pvmCoreAddr = await pvmCore.getAddress();

    // Deploy Mock USDC
    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 18);
    const usdcAddr = await usdc.getAddress();

    // Deploy Vault with 1 USDC denomination
    const denomination = ethers.parseEther("1");
    const PrismVault = await ethers.getContractFactory("PrismVault");
    const vault = await PrismVault.deploy(usdcAddr, denomination, pvmCoreAddr);
    const vaultAddr = await vault.getAddress();

    // Mint tokens to users
    await usdc.mint(alice.address, ethers.parseEther("1000"));
    await usdc.mint(bob.address, ethers.parseEther("1000"));

    // Approve vault
    await usdc.connect(alice).approve(vaultAddr, ethers.MaxUint256);
    await usdc.connect(bob).approve(vaultAddr, ethers.MaxUint256);

    return { owner, alice, bob, relayer, pvmCore, usdc, vault, denomination, pvmCoreAddr, vaultAddr, usdcAddr };
  }

  // Helper to generate a commitment from a secret
  async function generateCommitment(pvmCore: any, secret: bigint) {
    const nullifierHash = await pvmCore.poseidonHash(secret, 0n);
    const commitment = await pvmCore.poseidonHash(secret, nullifierHash);
    return { secret, nullifierHash, commitment };
  }

  describe("Deployment", function () {
    it("should deploy with correct parameters", async function () {
      const { vault, usdc, denomination, pvmCoreAddr, usdcAddr } = await loadFixture(deployFixture);
      expect(await vault.token()).to.equal(usdcAddr);
      expect(await vault.denomination()).to.equal(denomination);
      expect(await vault.pvmCore()).to.equal(pvmCoreAddr);
    });

    it("should initialize Merkle tree", async function () {
      const { vault } = await loadFixture(deployFixture);
      expect(await vault.getNextIndex()).to.equal(0);
      const root = await vault.getMerkleRoot();
      expect(root).to.not.equal(0);
    });
  });

  describe("Deposits", function () {
    it("should accept a deposit with valid commitment", async function () {
      const { alice, vault, pvmCore, usdc, denomination, vaultAddr } = await loadFixture(deployFixture);
      const { commitment } = await generateCommitment(pvmCore, 12345n);

      const balanceBefore = await usdc.balanceOf(alice.address);
      const tx = await vault.connect(alice).deposit(commitment);
      const receipt = await tx.wait();

      expect(await usdc.balanceOf(alice.address)).to.equal(balanceBefore - denomination);
      expect(await usdc.balanceOf(vaultAddr)).to.equal(denomination);
      expect(await vault.isCommitted(commitment)).to.be.true;
      expect(await vault.getNextIndex()).to.equal(1);
      expect(await vault.totalDeposits()).to.equal(1);
    });

    it("should reject zero commitment", async function () {
      const { alice, vault } = await loadFixture(deployFixture);
      await expect(vault.connect(alice).deposit(0)).to.be.revertedWithCustomError(vault, "InvalidCommitment");
    });

    it("should reject duplicate commitment", async function () {
      const { alice, vault, pvmCore } = await loadFixture(deployFixture);
      const { commitment } = await generateCommitment(pvmCore, 12345n);

      await vault.connect(alice).deposit(commitment);
      await expect(vault.connect(alice).deposit(commitment)).to.be.revertedWithCustomError(
        vault,
        "CommitmentAlreadyExists"
      );
    });

    it("should handle multiple deposits from different users", async function () {
      const { alice, bob, vault, pvmCore } = await loadFixture(deployFixture);

      const c1 = await generateCommitment(pvmCore, 111n);
      const c2 = await generateCommitment(pvmCore, 222n);
      const c3 = await generateCommitment(pvmCore, 333n);

      await vault.connect(alice).deposit(c1.commitment);
      await vault.connect(bob).deposit(c2.commitment);
      await vault.connect(alice).deposit(c3.commitment);

      expect(await vault.getNextIndex()).to.equal(3);
      expect(await vault.totalDeposits()).to.equal(3);
    });

    it("should emit Deposit event", async function () {
      const { alice, vault, pvmCore } = await loadFixture(deployFixture);
      const { commitment } = await generateCommitment(pvmCore, 99999n);

      await expect(vault.connect(alice).deposit(commitment))
        .to.emit(vault, "Deposit")
        .withArgs(commitment, 0, (v: any) => v > 0);
    });
  });

  describe("Native Deposits", function () {
    it("should accept native token deposit", async function () {
      const { alice, vault, pvmCore, denomination } = await loadFixture(deployFixture);
      const { commitment } = await generateCommitment(pvmCore, 55555n);

      await vault.connect(alice).depositNative(commitment, { value: denomination });
      expect(await vault.isCommitted(commitment)).to.be.true;
    });

    it("should reject wrong denomination for native deposit", async function () {
      const { alice, vault, pvmCore } = await loadFixture(deployFixture);
      const { commitment } = await generateCommitment(pvmCore, 55555n);

      await expect(
        vault.connect(alice).depositNative(commitment, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(vault, "InvalidDenomination");
    });
  });

  describe("Merkle Tree", function () {
    it("should update root after each deposit", async function () {
      const { alice, vault, pvmCore } = await loadFixture(deployFixture);
      const rootBefore = await vault.getMerkleRoot();

      const { commitment } = await generateCommitment(pvmCore, 42n);
      await vault.connect(alice).deposit(commitment);

      const rootAfter = await vault.getMerkleRoot();
      expect(rootAfter).to.not.equal(rootBefore);
    });
  });

  describe("Private Swaps", function () {
    it("should initiate a private swap", async function () {
      const { alice, vault, pvmCore, usdcAddr } = await loadFixture(deployFixture);
      const { commitment } = await generateCommitment(pvmCore, 777n);

      const tx = await vault.connect(alice).initiatePrivateSwap(commitment, usdcAddr, ethers.parseEther("0.9"));
      await tx.wait();

      const swap = await vault.swaps(0);
      expect(swap.inputCommitment).to.equal(commitment);
      expect(swap.targetToken).to.equal(usdcAddr);
      expect(swap.completed).to.be.false;
    });
  });

  describe("Stats", function () {
    it("should track deposit and withdrawal counts", async function () {
      const { alice, bob, vault, pvmCore, denomination, vaultAddr, usdc } = await loadFixture(deployFixture);

      const c1 = await generateCommitment(pvmCore, 1n);
      const c2 = await generateCommitment(pvmCore, 2n);

      await vault.connect(alice).deposit(c1.commitment);
      await vault.connect(bob).deposit(c2.commitment);

      const [deposits, withdrawals, poolBalance] = await vault.getStats();
      expect(deposits).to.equal(2);
      expect(withdrawals).to.equal(0);
      expect(poolBalance).to.equal(denomination * 2n);
    });
  });
});
