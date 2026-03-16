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
  chainId: "0x190F1B41",
  chainName: "Polkadot Hub Testnet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: ["https://services.polkadothub-rpc.com/testnet"],
  blockExplorerUrls: ["https://blockscout-polkadothub-testnet.parity-testnet.parity.io"],
};

/**
 * Find MetaMask specifically — other Polkadot wallet extensions
 * (SubWallet, Talisman) inject their own window.ethereum and break
 * standard EVM connect flows with evmAsk.js errors.
 */
function getProvider(): any {
  if (!window.ethereum) return null;

  // If MetaMask is the only provider, use it directly
  if (window.ethereum.isMetaMask && !window.ethereum.providers) {
    return window.ethereum;
  }

  // Multiple providers injected — find MetaMask
  if (window.ethereum.providers?.length) {
    const metamask = window.ethereum.providers.find((p: any) => p.isMetaMask);
    if (metamask) return metamask;
  }

  // Fallback to whatever is there
  return window.ethereum;
}

export async function connectWallet(): Promise<WalletState> {
  const eth = getProvider();
  if (!eth) {
    throw new Error("No EVM wallet found. Install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(eth);
  const accounts = await provider.send("eth_requestAccounts", []);

  if (accounts.length === 0) {
    throw new Error("No accounts found");
  }

  // Try to switch chain after connecting — don't block if it fails
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLKADOT_HUB_TESTNET.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [POLKADOT_HUB_TESTNET],
        });
      } catch {
        // user rejected — continue on whatever chain they're on
      }
    }
  }

  // Re-create provider after potential chain switch
  const freshProvider = new ethers.BrowserProvider(eth);
  const signer = await freshProvider.getSigner();
  const network = await freshProvider.getNetwork();

  return {
    connected: true,
    address: accounts[0],
    chainId: Number(network.chainId),
    provider: freshProvider,
    signer,
  };
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
