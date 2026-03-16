"use client";

import { useState } from "react";
import { connectWallet, switchToPolkadotHub, truncateAddress, type WalletState } from "@/lib/wallet";

interface HeaderProps {
  wallet: WalletState | null;
  onConnect: (wallet: WalletState) => void;
}

export default function Header({ wallet, onConnect }: HeaderProps) {
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      await switchToPolkadotHub();
      const w = await connectWallet();
      onConnect(w);
    } catch (err: any) {
      console.error("Connect failed:", err);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-[var(--prism-border)]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg prism-gradient" />
        <h1 className="text-xl font-bold">
          <span className="prism-gradient-text">Prism</span>
          <span className="text-[var(--prism-text-muted)] font-normal ml-2 text-sm">Protocol</span>
        </h1>
      </div>

      <nav className="flex items-center gap-6 text-sm text-[var(--prism-text-muted)]">
        <a href="#deposit" className="hover:text-white transition-colors">Deposit</a>
        <a href="#withdraw" className="hover:text-white transition-colors">Withdraw</a>
        <a href="#swap" className="hover:text-white transition-colors">Private Swap</a>
        <a href="#bridge" className="hover:text-white transition-colors">Cross-VM</a>
        <a href="#xcm" className="hover:text-white transition-colors">XCM</a>
      </nav>

      {wallet?.connected ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--prism-surface-light)] border border-[var(--prism-border)]">
            <div className="w-2 h-2 rounded-full bg-[var(--prism-success)]" />
            <span className="text-sm font-mono">{truncateAddress(wallet.address!)}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="prism-button text-sm"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </header>
  );
}
