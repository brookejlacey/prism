import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CrossVMBridge", function () {
  async function deployFixture() {
    const [owner, alice, relayer] = await ethers.getSigners();

    const PVMCore = await ethers.getContractFactory("PVMCryptoCoreFallback");
    const pvmCore = await PVMCore.deploy();
    const pvmCoreAddr = await pvmCore.getAddress();

    const CrossVMBridge = await ethers.getContractFactory("CrossVMBridge");
    const bridge = await CrossVMBridge.deploy(pvmCoreAddr);

    await bridge.addRelayer(relayer.address);

    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 18);
    const usdcAddr = await usdc.getAddress();

    return { owner, alice, relayer, pvmCore, bridge, usdc, usdcAddr };
  }

  describe("Cross-VM Operations", function () {
    it("should lock a commitment for cross-VM transfer", async function () {
      const { alice, bridge, usdcAddr } = await loadFixture(deployFixture);

      const commitment = 123456789n;
      const tx = await bridge.connect(alice).lockForCrossVM(commitment, 1, ethers.parseEther("1"), usdcAddr);
      await tx.wait();

      const c = await bridge.getCrossVMCommitment(0);
      expect(c.commitment).to.equal(commitment);
      expect(c.targetVM).to.equal(1); // PVM
      expect(c.released).to.be.false;
    });

    it("should release a commitment by trusted relayer", async function () {
      const { alice, relayer, bridge, usdcAddr } = await loadFixture(deployFixture);

      await bridge.connect(alice).lockForCrossVM(123n, 1, ethers.parseEther("1"), usdcAddr);
      await bridge.connect(relayer).releaseCrossVM(0, 456n);

      const c = await bridge.getCrossVMCommitment(0);
      expect(c.released).to.be.true;
    });

    it("should reject release from non-relayer", async function () {
      const { alice, bridge, usdcAddr } = await loadFixture(deployFixture);

      await bridge.connect(alice).lockForCrossVM(123n, 1, ethers.parseEther("1"), usdcAddr);
      await expect(bridge.connect(alice).releaseCrossVM(0, 456n)).to.be.revertedWith("Not a trusted relayer");
    });

    it("should reject double release", async function () {
      const { alice, relayer, bridge, usdcAddr } = await loadFixture(deployFixture);

      await bridge.connect(alice).lockForCrossVM(123n, 1, ethers.parseEther("1"), usdcAddr);
      await bridge.connect(relayer).releaseCrossVM(0, 456n);
      await expect(bridge.connect(relayer).releaseCrossVM(0, 789n)).to.be.revertedWith("Already released");
    });
  });

  describe("XCM Private Transfers", function () {
    it("should initiate an XCM private transfer", async function () {
      const { alice, bridge } = await loadFixture(deployFixture);

      const commitment = 999n;
      const destParaId = 2000; // Asset Hub
      const destAddr = ethers.toUtf8Bytes("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");

      const tx = await bridge
        .connect(alice)
        .initiateXCMPrivateTransfer(commitment, destParaId, destAddr, ethers.parseEther("10"));
      await tx.wait();

      const t = await bridge.getXCMTransfer(0);
      expect(t.commitment).to.equal(commitment);
      expect(t.destParaId).to.equal(destParaId);
      expect(t.completed).to.be.false;
    });

    it("should confirm XCM transfer by relayer", async function () {
      const { alice, relayer, bridge } = await loadFixture(deployFixture);

      const destAddr = ethers.toUtf8Bytes("5GrwvaEF");
      await bridge.connect(alice).initiateXCMPrivateTransfer(111n, 2000, destAddr, ethers.parseEther("1"));
      await bridge.connect(relayer).confirmXCMTransfer(0);

      const t = await bridge.getXCMTransfer(0);
      expect(t.completed).to.be.true;
    });
  });

  describe("Stats", function () {
    it("should track operation counts", async function () {
      const { alice, bridge, usdcAddr } = await loadFixture(deployFixture);

      await bridge.connect(alice).lockForCrossVM(1n, 0, ethers.parseEther("1"), usdcAddr);
      await bridge.connect(alice).lockForCrossVM(2n, 1, ethers.parseEther("2"), usdcAddr);

      const destAddr = ethers.toUtf8Bytes("dest");
      await bridge.connect(alice).initiateXCMPrivateTransfer(3n, 1000, destAddr, ethers.parseEther("1"));

      const [crossVM, xcm] = await bridge.getStats();
      expect(crossVM).to.equal(2);
      expect(xcm).to.equal(1);
    });
  });

  describe("Admin", function () {
    it("should add and remove relayers", async function () {
      const { owner, alice, bridge } = await loadFixture(deployFixture);

      await bridge.addRelayer(alice.address);
      expect(await bridge.trustedRelayers(alice.address)).to.be.true;

      await bridge.removeRelayer(alice.address);
      expect(await bridge.trustedRelayers(alice.address)).to.be.false;
    });

    it("should only allow owner for admin functions", async function () {
      const { alice, bridge } = await loadFixture(deployFixture);
      await expect(bridge.connect(alice).addRelayer(alice.address)).to.be.reverted;
    });
  });
});
