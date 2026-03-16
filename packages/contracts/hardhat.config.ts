import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import * as path from "path";
import * as dotenv from "dotenv";

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    polkadotHub: {
      url: process.env.POLKADOT_HUB_RPC || "https://services.polkadothub-rpc.com/testnet",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 420420417,
      timeout: 120000,
      httpHeaders: {},
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
