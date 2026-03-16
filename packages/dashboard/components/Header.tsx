"use client";

import { useState } from "react";
import { connectWallet, truncateAddress, type WalletState } from "@/lib/wallet";

interface HeaderProps {
  wallet: WalletState | null;
  onConnect: (wallet: WalletState) => void;
}

export default function Header({ wallet, onConnect }: HeaderProps) {
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const w = await connectWallet();
      onConnect(w);
    } catch (err: any) {
      console.error("Connect failed:", err);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--prism-border)]">
      <div className="flex items-center gap-3">
        <span className="text-[var(--prism-accent)] text-lg font-bold">//</span>
        <h1 className="text-sm font-bold uppercase tracking-widest">
          Prism
          <span className="text-[var(--prism-text-muted)] font-normal ml-2 tracking-normal lowercase">protocol</span>
        </h1>
      </div>

      <nav className="flex items-center gap-6 text-xs text-[var(--prism-text-muted)] uppercase tracking-wider">
        <a href="#deposit" className="hover:text-[var(--prism-text)] transition-colors">Deposit</a>
        <a href="#withdraw" className="hover:text-[var(--prism-text)] transition-colors">Withdraw</a>
        <a href="#swap" className="hover:text-[var(--prism-text)] transition-colors">Swap</a>
        <a href="#bridge" className="hover:text-[var(--prism-text)] transition-colors">Bridge</a>
      </nav>

      {wallet?.connected ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--prism-success)]" />
          <span className="font-mono">{truncateAddress(wallet.address!)}</span>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="prism-button"
        >
          {connecting ? "connecting..." : "Connect"}
        </button>
      )}
    </header>
  );
}
