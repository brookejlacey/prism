import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
}

const POLKADOT_HUB_TESTNET = {
  chainId: "0x19104E45",
  chainName: "Polkadot Hub Westend Testnet",
  nativeCurrency: { name: "WND", symbol: "WND", decimals: 18 },
  rpcUrls: ["https://westend-asset-hub-eth-rpc.polkadot.io"],
  blockExplorerUrls: ["https://assethub-westend.subscan.io"],
};

export async function connectWallet(): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);

  if (accounts.length === 0) {
    throw new Error("No accounts found");
  }

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    connected: true,
    address: accounts[0],
    chainId: Number(network.chainId),
    provider,
    signer,
  };
}

export async function switchToPolkadotHub(): Promise<void> {
  if (!window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLKADOT_HUB_TESTNET.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [POLKADOT_HUB_TESTNET],
      });
    }
  }
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
