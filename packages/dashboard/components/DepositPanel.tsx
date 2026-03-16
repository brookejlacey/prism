"use client";

import { useState } from "react";
import type { WalletState } from "@/lib/wallet";

interface DepositPanelProps {
  wallet: WalletState | null;
}

const DENOMINATIONS = ["0.1", "1", "10", "100"];
const TOKENS = [
  { symbol: "USDC", name: "USD Coin", icon: "$" },
  { symbol: "DOT", name: "Polkadot", icon: "●" },
  { symbol: "WND", name: "Westend", icon: "W" },
];

export default function DepositPanel({ wallet }: DepositPanelProps) {
  const [selectedToken, setSelectedToken] = useState(0);
  const [selectedDenom, setSelectedDenom] = useState(1);
  const [depositing, setDepositing] = useState(false);
  const [noteString, setNoteString] = useState<string | null>(null);

  async function handleDeposit() {
    if (!wallet?.connected) return;
    setDepositing(true);

    // Simulate deposit for demo
    await new Promise((r) => setTimeout(r, 2000));
    setNoteString(
      `prism-note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
    setDepositing(false);
  }

  return (
    <div id="deposit" className="prism-card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-[var(--prism-primary)] flex items-center justify-center text-xs">
          ↓
        </span>
        Private Deposit
      </h2>

      <div className="space-y-4">
        {/* Token selection */}
        <div>
          <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">Token</label>
          <div className="flex gap-2">
            {TOKENS.map((token, i) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(i)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedToken === i
                    ? "bg-[var(--prism-primary)] text-white"
                    : "bg-[var(--prism-surface-light)] text-[var(--prism-text-muted)] border border-[var(--prism-border)] hover:border-[var(--prism-primary)]"
                }`}
              >
                <span className="mr-1">{token.icon}</span>
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Denomination selection */}
        <div>
          <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">
            Denomination
          </label>
          <div className="flex gap-2">
            {DENOMINATIONS.map((denom, i) => (
              <button
                key={denom}
                onClick={() => setSelectedDenom(i)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedDenom === i
                    ? "bg-[var(--prism-primary)] text-white"
                    : "bg-[var(--prism-surface-light)] text-[var(--prism-text-muted)] border border-[var(--prism-border)] hover:border-[var(--prism-primary)]"
                }`}
              >
                {denom} {TOKENS[selectedToken].symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 text-xs text-[var(--prism-text-muted)] space-y-2">
          <div className="flex justify-between">
            <span>Privacy Pool Size</span>
            <span className="text-white">53 deposits</span>
          </div>
          <div className="flex justify-between">
            <span>Crypto Engine</span>
            <span className="text-[var(--prism-secondary)]">PVM Rust Precompile</span>
          </div>
          <div className="flex justify-between">
            <span>Commitment Scheme</span>
            <span className="text-white">Poseidon + Pedersen</span>
          </div>
        </div>

        {/* Deposit button */}
        <button
          onClick={handleDeposit}
          disabled={!wallet?.connected || depositing}
          className="prism-button w-full text-center"
        >
          {depositing
            ? "Generating commitment..."
            : !wallet?.connected
              ? "Connect wallet to deposit"
              : `Deposit ${DENOMINATIONS[selectedDenom]} ${TOKENS[selectedToken].symbol} Privately`}
        </button>

        {/* Note output */}
        {noteString && (
          <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 border border-[var(--prism-success)]">
            <div className="text-xs text-[var(--prism-success)] font-semibold mb-2">
              Deposit successful! Save this note:
            </div>
            <div className="font-mono text-xs break-all bg-[var(--prism-bg)] p-3 rounded-lg">
              {noteString}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(noteString)}
              className="prism-button-secondary text-xs mt-2 py-2 px-3"
            >
              Copy Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
