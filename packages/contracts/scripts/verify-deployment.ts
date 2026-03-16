import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let passed = 0;
let failed = 0;

function header(msg: string) {
  console.log(`\n${BOLD}${CYAN}=== ${msg} ===${RESET}`);
}

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`  ${GREEN}PASS${RESET} ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failed++;
    console.log(`  ${RED}FAIL${RESET} ${label}${detail ? ` (${detail})` : ""}`);
  }
}

function loadAddresses(): Record<string, string> {
  // Try dashboard .env.local first, then root .env, then process.env
  const dashboardEnvPath = path.resolve(__dirname, "../../dashboard/.env.local");
  const rootEnvPath = path.resolve(__dirname, "../../../.env");

  const addresses: Record<string, string> = {
    pvmCore: "",
    usdc: "",
    vault: "",
    router: "",
    bridge: "",
  };

  // Try reading from dashboard .env.local
  for (const envPath of [dashboardEnvPath, rootEnvPath]) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, value] = trimmed.split("=", 2);

        if (key === "NEXT_PUBLIC_PVM_CORE_ADDRESS" || key === "PVM_CORE_ADDRESS")
          addresses.pvmCore = addresses.pvmCore || value;
        if (key === "NEXT_PUBLIC_USDC_ADDRESS" || key === "USDC_ADDRESS")
          addresses.usdc = addresses.usdc || value;
        if (key === "NEXT_PUBLIC_VAULT_ADDRESS" || key === "VAULT_ADDRESS")
          addresses.vault = addresses.vault || value;
        if (key === "NEXT_PUBLIC_ROUTER_ADDRESS" || key === "ROUTER_ADDRESS")
          addresses.router = addresses.router || value;
        if (key === "NEXT_PUBLIC_BRIDGE_ADDRESS" || key === "BRIDGE_ADDRESS")
          addresses.bridge = addresses.bridge || value;
      }
    }
  }

  // Fallback to process.env
  addresses.pvmCore = addresses.pvmCore || process.env.PVM_CORE_ADDRESS || process.env.NEXT_PUBLIC_PVM_CORE_ADDRESS || "";
  addresses.usdc = addresses.usdc || process.env.USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ADDRESS || "";
  addresses.vault = addresses.vault || process.env.VAULT_ADDRESS || process.env.NEXT_PUBLIC_VAULT_ADDRESS || "";
  addresses.router = addresses.router || process.env.ROUTER_ADDRESS || process.env.NEXT_PUBLIC_ROUTER_ADDRESS || "";
  addresses.bridge = addresses.bridge || process.env.BRIDGE_ADDRESS || process.env.NEXT_PUBLIC_BRIDGE_ADDRESS || "";

  return addresses;
}

async function main() {
  header("Prism Protocol - Deployment Verification");

  const network = await ethers.provider.getNetwork();
  console.log(`  Network: chainId=${network.chainId}`);

  const addresses = loadAddresses();
  console.log(`\n${BOLD}  Addresses loaded:${RESET}`);
  for (const [name, addr] of Object.entries(addresses)) {
    const status = addr && ethers.isAddress(addr) ? GREEN + addr + RESET : RED + "(missing)" + RESET;
    console.log(`    ${name}: ${status}`);
  }

  // Pre-check: all addresses must be valid
  const missing = Object.entries(addresses).filter(([_, v]) => !v || !ethers.isAddress(v));
  if (missing.length > 0) {
    console.error(
      `\n${RED}Missing addresses: ${missing.map(([k]) => k).join(", ")}${RESET}`
    );
    console.error("Run deploy-testnet.ts first or set addresses in .env");
    process.exitCode = 1;
    return;
  }

  // ---- 1. Verify PVMCryptoCoreFallback ----
  header("PVMCryptoCoreFallback");
  try {
    const pvmCore = await ethers.getContractAt("PVMCryptoCoreFallback", addresses.pvmCore);

    // Test poseidonHash
    const hashResult = await pvmCore.poseidonHash(1, 2);
    check("poseidonHash(1, 2)", hashResult > 0n, `result=${hashResult}`);

    // Test pedersenCommit
    const commitment = await pvmCore.pedersenCommit(100, 42);
    check("pedersenCommit(100, 42)", commitment > 0n, `commitment=${commitment}`);

    // Test pedersenVerify
    const isValid = await pvmCore.pedersenVerify(commitment, 100, 42);
    check("pedersenVerify matches commit", isValid === true);

    const isInvalid = await pvmCore.pedersenVerify(commitment, 999, 42);
    check("pedersenVerify rejects wrong value", isInvalid === false);

    // Test generateRangeProof + verifyRangeProof
    const proof = await pvmCore.generateRangeProof(1000, 42);
    check("generateRangeProof(1000, 42)", proof.length > 0, `proof length=${proof.length}`);

    const proofValid = await pvmCore.verifyRangeProof(commitment, proof);
    check("verifyRangeProof returns", typeof proofValid === "boolean");
  } catch (err: any) {
    check("PVMCryptoCoreFallback contract reachable", false, err.message);
  }

  // ---- 2. Verify MockERC20 USDC ----
  header("MockERC20 (USDC)");
  try {
    const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);

    const name = await usdc.name();
    check("Token name", name === "USD Coin", name);

    const symbol = await usdc.symbol();
    check("Token symbol", symbol === "USDC", symbol);

    const decimals = await usdc.decimals();
    check("Token decimals", decimals === 18n, `${decimals}`);

    const [deployer] = await ethers.getSigners();
    if (deployer) {
      const balance = await usdc.balanceOf(deployer.address);
      check(
        "Deployer USDC balance > 0",
        balance > 0n,
        `${ethers.formatEther(balance)} USDC`
      );
    }
  } catch (err: any) {
    check("MockERC20 contract reachable", false, err.message);
  }

  // ---- 3. Verify PrismVault ----
  header("PrismVault");
  try {
    const vault = await ethers.getContractAt("PrismVault", addresses.vault);

    const token = await vault.token();
    check(
      "Vault token matches USDC",
      token.toLowerCase() === addresses.usdc.toLowerCase(),
      token
    );

    const denomination = await vault.denomination();
    check(
      "Vault denomination is 1 USDC",
      denomination === ethers.parseEther("1"),
      ethers.formatEther(denomination)
    );

    const pvmCoreAddr = await vault.pvmCore();
    check(
      "Vault pvmCore matches deployed",
      pvmCoreAddr.toLowerCase() === addresses.pvmCore.toLowerCase(),
      pvmCoreAddr
    );

    const merkleRoot = await vault.getMerkleRoot();
    check("getMerkleRoot() callable", merkleRoot >= 0n, `root=${merkleRoot}`);

    const nextIndex = await vault.getNextIndex();
    check("getNextIndex() callable", nextIndex >= 0n, `nextIndex=${nextIndex}`);

    const [deposits, withdrawals, poolBalance] = await vault.getStats();
    check("getStats() callable", true, `deposits=${deposits}, withdrawals=${withdrawals}, pool=${ethers.formatEther(poolBalance)}`);
  } catch (err: any) {
    check("PrismVault contract reachable", false, err.message);
  }

  // ---- 4. Verify PrismRouter ----
  header("PrismRouter");
  try {
    const router = await ethers.getContractAt("PrismRouter", addresses.router);

    const pvmCoreAddr = await router.pvmCore();
    check(
      "Router pvmCore matches deployed",
      pvmCoreAddr.toLowerCase() === addresses.pvmCore.toLowerCase(),
      pvmCoreAddr
    );

    const [deployer] = await ethers.getSigners();
    if (deployer) {
      const owner = await router.owner();
      check(
        "Router owner is deployer",
        owner.toLowerCase() === deployer.address.toLowerCase(),
        owner
      );
    }

    // Check vault registration
    const registeredVault = await router.getVault(
      addresses.usdc,
      ethers.parseEther("1")
    );
    check(
      "1 USDC vault registered in router",
      registeredVault.toLowerCase() === addresses.vault.toLowerCase(),
      registeredVault
    );

    const supportedTokens = await router.getSupportedTokens();
    check(
      "USDC in supported tokens",
      supportedTokens.some(
        (t: string) => t.toLowerCase() === addresses.usdc.toLowerCase()
      ),
      `${supportedTokens.length} token(s)`
    );

    const allVaults = await router.getAllVaults();
    check("getAllVaults() returns vaults", allVaults.length > 0, `${allVaults.length} vault(s)`);

    const [totalVaults, totalTokens, transfers] = await router.getProtocolStats();
    check(
      "getProtocolStats() callable",
      totalVaults > 0n,
      `vaults=${totalVaults}, tokens=${totalTokens}, transfers=${transfers}`
    );

    const denoms = await router.getDenominations(addresses.usdc);
    check("getDenominations() for USDC", denoms.length > 0, `${denoms.length} denomination(s)`);
  } catch (err: any) {
    check("PrismRouter contract reachable", false, err.message);
  }

  // ---- 5. Verify CrossVMBridge ----
  header("CrossVMBridge");
  try {
    const bridge = await ethers.getContractAt("CrossVMBridge", addresses.bridge);

    const pvmCoreAddr = await bridge.pvmCore();
    check(
      "Bridge pvmCore matches deployed",
      pvmCoreAddr.toLowerCase() === addresses.pvmCore.toLowerCase(),
      pvmCoreAddr
    );

    const [deployer] = await ethers.getSigners();
    if (deployer) {
      const owner = await bridge.owner();
      check(
        "Bridge owner is deployer",
        owner.toLowerCase() === deployer.address.toLowerCase(),
        owner
      );

      const isRelayer = await bridge.trustedRelayers(deployer.address);
      check("Deployer is trusted relayer", isRelayer === true);
    }

    const [crossVM, xcm] = await bridge.getStats();
    check("getStats() callable", true, `crossVM=${crossVM}, xcm=${xcm}`);

    const nextCommitmentId = await bridge.nextCommitmentId();
    check("nextCommitmentId callable", nextCommitmentId >= 0n, `${nextCommitmentId}`);

    const nextTransferId = await bridge.nextTransferId();
    check("nextTransferId callable", nextTransferId >= 0n, `${nextTransferId}`);
  } catch (err: any) {
    check("CrossVMBridge contract reachable", false, err.message);
  }

  // ---- Summary ----
  header("Verification Summary");
  console.log("");
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}`);
  console.log("");

  if (failed > 0) {
    console.log(`${RED}Some checks failed. Review the output above.${RESET}`);
    process.exitCode = 1;
  } else {
    console.log(`${GREEN}All checks passed. Deployment is healthy.${RESET}`);
  }
}

main().catch((error) => {
  console.error(`\n${RED}Verification failed:${RESET}`, error.message || error);
  process.exitCode = 1;
});
