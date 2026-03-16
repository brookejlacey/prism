import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ANSI colors for console output
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function log(msg: string) {
  console.log(`${CYAN}[Prism]${RESET} ${msg}`);
}

function success(msg: string) {
  console.log(`${GREEN}  OK${RESET} ${msg}`);
}

function warn(msg: string) {
  console.log(`${YELLOW}  WARN${RESET} ${msg}`);
}

function header(msg: string) {
  console.log(`\n${BOLD}${CYAN}=== ${msg} ===${RESET}`);
}

async function waitForTx(tx: any, label: string) {
  log(`Waiting for ${label} tx: ${tx.hash}`);
  const receipt = await tx.wait();
  if (receipt.status === 0) {
    throw new Error(`Transaction reverted: ${label} (${tx.hash})`);
  }
  success(`${label} confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function main() {
  header("Prism Protocol - Westend Testnet Deployment");

  // ---- Pre-flight checks ----
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer signer found. Set PRIVATE_KEY in your .env file."
    );
  }

  const network = await ethers.provider.getNetwork();
  log(`Network: chainId=${network.chainId}, deployer=${deployer.address}`);

  if (network.chainId !== 420420421n) {
    warn(
      `Expected Polkadot Hub Westend (chainId 420420421), got ${network.chainId}. Continuing anyway...`
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  log(`Deployer balance: ${ethers.formatEther(balance)} WND`);

  if (balance === 0n) {
    throw new Error(
      "Deployer has zero balance. Fund your account at https://faucet.polkadot.io/"
    );
  }

  const addresses: Record<string, string> = {};

  // ---- 1. Deploy PVMCryptoCoreFallback ----
  header("1/5 - Deploying PVMCryptoCoreFallback");
  try {
    const PVMCore = await ethers.getContractFactory("PVMCryptoCoreFallback");
    log("Sending deployment transaction...");
    const pvmCore = await PVMCore.deploy();
    await pvmCore.waitForDeployment();
    addresses.pvmCore = await pvmCore.getAddress();
    success(`PVMCryptoCoreFallback deployed at ${addresses.pvmCore}`);
  } catch (err: any) {
    console.error(`${RED}Failed to deploy PVMCryptoCoreFallback:${RESET}`, err.message);
    throw err;
  }

  // ---- 2. Deploy Mock USDC ----
  header("2/5 - Deploying MockERC20 (USDC)");
  try {
    const MockToken = await ethers.getContractFactory("MockERC20");
    log("Sending deployment transaction...");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 18);
    await usdc.waitForDeployment();
    addresses.usdc = await usdc.getAddress();
    success(`MockERC20 USDC deployed at ${addresses.usdc}`);

    // Mint some test USDC to deployer
    const mintAmount = ethers.parseEther("10000");
    const mintTx = await usdc.mint(deployer.address, mintAmount);
    await waitForTx(mintTx, "Mint 10,000 USDC to deployer");
  } catch (err: any) {
    console.error(`${RED}Failed to deploy MockERC20:${RESET}`, err.message);
    throw err;
  }

  // ---- 3. Deploy PrismVault (1 USDC denomination) ----
  header("3/5 - Deploying PrismVault (1 USDC)");
  try {
    const PrismVault = await ethers.getContractFactory("PrismVault");
    const denomination = ethers.parseEther("1");
    log(`Denomination: ${ethers.formatEther(denomination)} USDC`);
    log("Sending deployment transaction...");
    const vault = await PrismVault.deploy(
      addresses.usdc,
      denomination,
      addresses.pvmCore
    );
    await vault.waitForDeployment();
    addresses.vault = await vault.getAddress();
    success(`PrismVault deployed at ${addresses.vault}`);
  } catch (err: any) {
    console.error(`${RED}Failed to deploy PrismVault:${RESET}`, err.message);
    throw err;
  }

  // ---- 4. Deploy PrismRouter ----
  header("4/5 - Deploying PrismRouter");
  try {
    const PrismRouter = await ethers.getContractFactory("PrismRouter");
    log("Sending deployment transaction...");
    const router = await PrismRouter.deploy(addresses.pvmCore);
    await router.waitForDeployment();
    addresses.router = await router.getAddress();
    success(`PrismRouter deployed at ${addresses.router}`);
  } catch (err: any) {
    console.error(`${RED}Failed to deploy PrismRouter:${RESET}`, err.message);
    throw err;
  }

  // ---- 5. Deploy CrossVMBridge ----
  header("5/5 - Deploying CrossVMBridge");
  try {
    const CrossVMBridge = await ethers.getContractFactory("CrossVMBridge");
    log("Sending deployment transaction...");
    const bridge = await CrossVMBridge.deploy(addresses.pvmCore);
    await bridge.waitForDeployment();
    addresses.bridge = await bridge.getAddress();
    success(`CrossVMBridge deployed at ${addresses.bridge}`);
  } catch (err: any) {
    console.error(`${RED}Failed to deploy CrossVMBridge:${RESET}`, err.message);
    throw err;
  }

  // ---- Configure: Register vault with router ----
  header("Configuring Contracts");

  try {
    const router = await ethers.getContractAt("PrismRouter", addresses.router);
    const registerTx = await router.registerVault(
      addresses.usdc,
      ethers.parseEther("1"),
      addresses.vault
    );
    await waitForTx(registerTx, "Register 1 USDC vault with router");
  } catch (err: any) {
    console.error(`${RED}Failed to register vault:${RESET}`, err.message);
    throw err;
  }

  // ---- Configure: Add deployer as trusted relayer ----
  try {
    const bridge = await ethers.getContractAt("CrossVMBridge", addresses.bridge);
    const relayerTx = await bridge.addRelayer(deployer.address);
    await waitForTx(relayerTx, "Add deployer as trusted relayer");
  } catch (err: any) {
    console.error(`${RED}Failed to add relayer:${RESET}`, err.message);
    throw err;
  }

  // Add additional relayers if configured
  const additionalRelayers = process.env.ADDITIONAL_RELAYERS;
  if (additionalRelayers) {
    const bridge = await ethers.getContractAt("CrossVMBridge", addresses.bridge);
    const relayers = additionalRelayers.split(",").map((r) => r.trim());
    for (const relayer of relayers) {
      if (ethers.isAddress(relayer)) {
        try {
          const tx = await bridge.addRelayer(relayer);
          await waitForTx(tx, `Add relayer ${relayer}`);
        } catch (err: any) {
          warn(`Failed to add relayer ${relayer}: ${err.message}`);
        }
      } else {
        warn(`Skipping invalid relayer address: ${relayer}`);
      }
    }
  }

  // ---- Write dashboard .env.local ----
  header("Writing Dashboard Environment");

  const dashboardEnvPath = path.resolve(
    __dirname,
    "../../dashboard/.env.local"
  );
  const dashboardEnvContent = [
    "# Auto-generated by deploy-testnet.ts",
    `# Deployed on ${new Date().toISOString()}`,
    `# Network: Polkadot Hub Westend (chainId ${network.chainId})`,
    `# Deployer: ${deployer.address}`,
    "",
    `NEXT_PUBLIC_PVM_CORE_ADDRESS=${addresses.pvmCore}`,
    `NEXT_PUBLIC_USDC_ADDRESS=${addresses.usdc}`,
    `NEXT_PUBLIC_VAULT_ADDRESS=${addresses.vault}`,
    `NEXT_PUBLIC_ROUTER_ADDRESS=${addresses.router}`,
    `NEXT_PUBLIC_BRIDGE_ADDRESS=${addresses.bridge}`,
    "",
  ].join("\n");

  try {
    fs.writeFileSync(dashboardEnvPath, dashboardEnvContent, "utf-8");
    success(`Wrote ${dashboardEnvPath}`);
  } catch (err: any) {
    warn(`Could not write dashboard .env.local: ${err.message}`);
    warn("You can manually set these in packages/dashboard/.env.local:");
    console.log(dashboardEnvContent);
  }

  // ---- Write root .env addresses (append/update) ----
  const rootEnvPath = path.resolve(__dirname, "../../../.env");
  try {
    let envContent = "";
    if (fs.existsSync(rootEnvPath)) {
      envContent = fs.readFileSync(rootEnvPath, "utf-8");
    }
    const updates: Record<string, string> = {
      PVM_CORE_ADDRESS: addresses.pvmCore,
      USDC_ADDRESS: addresses.usdc,
      VAULT_ADDRESS: addresses.vault,
      ROUTER_ADDRESS: addresses.router,
      BRIDGE_ADDRESS: addresses.bridge,
    };
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
    fs.writeFileSync(rootEnvPath, envContent.trim() + "\n", "utf-8");
    success(`Updated ${rootEnvPath} with deployed addresses`);
  } catch (err: any) {
    warn(`Could not update root .env: ${err.message}`);
  }

  // ---- Summary ----
  header("Deployment Complete");
  console.log("");
  console.log(`${BOLD}  Contract Addresses:${RESET}`);
  console.log(`    PVMCryptoCoreFallback: ${addresses.pvmCore}`);
  console.log(`    MockERC20 USDC:        ${addresses.usdc}`);
  console.log(`    PrismVault (1 USDC):   ${addresses.vault}`);
  console.log(`    PrismRouter:           ${addresses.router}`);
  console.log(`    CrossVMBridge:         ${addresses.bridge}`);
  console.log("");
  console.log(`${BOLD}  Deployer:${RESET} ${deployer.address}`);
  console.log(`${BOLD}  Network:${RESET}  Polkadot Hub Westend (${network.chainId})`);
  console.log(`${BOLD}  Explorer:${RESET} https://assethub-westend.subscan.io/`);
  console.log("");
  console.log(
    `${GREEN}Dashboard env written to packages/dashboard/.env.local${RESET}`
  );
  console.log(
    `${GREEN}Run 'pnpm --filter dashboard dev' to start the dashboard${RESET}`
  );
  console.log("");
}

main().catch((error) => {
  console.error(`\n${RED}Deployment failed:${RESET}`, error.message || error);
  process.exitCode = 1;
});
