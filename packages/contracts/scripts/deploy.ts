import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Prism Protocol with account:", deployer.address);

  // 1. Deploy PVM Crypto Core Fallback (EVM implementation)
  console.log("\n--- Deploying PVM Crypto Core Fallback ---");
  const PVMCore = await ethers.getContractFactory("PVMCryptoCoreFallback");
  const pvmCore = await PVMCore.deploy();
  await pvmCore.waitForDeployment();
  const pvmCoreAddr = await pvmCore.getAddress();
  console.log("PVMCryptoCoreFallback:", pvmCoreAddr);

  // 2. Deploy Mock USDC for testing
  console.log("\n--- Deploying Mock USDC ---");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const usdc = await MockToken.deploy("USD Coin", "USDC", 18);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("Mock USDC:", usdcAddr);

  // 3. Deploy PrismVault (1 USDC denomination)
  console.log("\n--- Deploying PrismVault (1 USDC) ---");
  const PrismVault = await ethers.getContractFactory("PrismVault");
  const vault = await PrismVault.deploy(usdcAddr, ethers.parseEther("1"), pvmCoreAddr);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("PrismVault (1 USDC):", vaultAddr);

  // 4. Deploy PrismRouter
  console.log("\n--- Deploying PrismRouter ---");
  const PrismRouter = await ethers.getContractFactory("PrismRouter");
  const router = await PrismRouter.deploy(pvmCoreAddr);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("PrismRouter:", routerAddr);

  // 5. Deploy CrossVMBridge
  console.log("\n--- Deploying CrossVMBridge ---");
  const CrossVMBridge = await ethers.getContractFactory("CrossVMBridge");
  const bridge = await CrossVMBridge.deploy(pvmCoreAddr);
  await bridge.waitForDeployment();
  const bridgeAddr = await bridge.getAddress();
  console.log("CrossVMBridge:", bridgeAddr);

  // 6. Register vault with router
  console.log("\n--- Configuring Router ---");
  await router.registerVault(usdcAddr, ethers.parseEther("1"), vaultAddr);
  console.log("Registered 1 USDC vault with router");

  // 7. Add deployer as trusted relayer on bridge
  await bridge.addRelayer(deployer.address);
  console.log("Added deployer as trusted relayer");

  console.log("\n=== Deployment Complete ===");
  console.log({
    pvmCore: pvmCoreAddr,
    usdc: usdcAddr,
    vault: vaultAddr,
    router: routerAddr,
    bridge: bridgeAddr,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
