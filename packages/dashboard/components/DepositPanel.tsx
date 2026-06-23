"use client";

import { useState } from "react";
import type { WalletState } from "@/lib/wallet";

interface DepositPanelProps {
  wallet: WalletState | null;
}

const DENOMINATIONS = ["0.1", "1", "10", "100"];
const TOKENS = [
  { symbol: "USDC", icon: "$" },
  { symbol: "DOT", icon: "." },
  { symbol: "WND", icon: "w" },
];

export default function DepositPanel({ wallet }: DepositPanelProps) {
  const [selectedToken, setSelectedToken] = useState(0);
  const [selectedDenom, setSelectedDenom] = useState(1);
  const [depositing, setDepositing] = useState(false);
  const [noteString, setNoteString] = useState<string | null>(null);

  async function handleDeposit() {
    if (!wallet?.connected) return;
    setDepositing(true);
    await new Promise((r) => setTimeout(r, 2000));
    const rand = () =>
      Array.from(crypto.getRandomValues(new Uint8Array(31)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    setNoteString(`prism-v1-${rand()}-${rand()}`);
    setDepositing(false);
  }

  return (
    <div id="deposit" className="prism-card">
      <h2 className="text-xs uppercase tracking-widest text-[var(--prism-text-muted)] mb-5">
        <span className="text-[var(--prism-accent)] mr-2">&darr;</span>
        Private Deposit
      </h2>

      <div className="space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Token</div>
          <div className="flex gap-1">
            {TOKENS.map((token, i) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(i)}
                className={`flex-1 py-2.5 text-xs transition-colors border ${
                  selectedToken === i
                    ? "bg-[var(--prism-text)] text-[var(--prism-bg)] border-[var(--prism-text)]"
                    : "bg-transparent text-[var(--prism-text-muted)] border-[var(--prism-border)] hover:border-[var(--prism-text-muted)]"
                }`}
                style={{ borderRadius: "2px" }}
              >
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Amount</div>
          <div className="flex gap-1">
            {DENOMINATIONS.map((denom, i) => (
              <button
                key={denom}
                onClick={() => setSelectedDenom(i)}
                className={`flex-1 py-2.5 text-xs transition-colors border ${
                  selectedDenom === i
                    ? "bg-[var(--prism-text)] text-[var(--prism-bg)] border-[var(--prism-text)]"
                    : "bg-transparent text-[var(--prism-text-muted)] border-[var(--prism-border)] hover:border-[var(--prism-text-muted)]"
                }`}
                style={{ borderRadius: "2px" }}
              >
                {denom}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--prism-border)] pt-4 text-[11px] text-[var(--prism-text-muted)] space-y-1.5">
          <div className="flex justify-between">
            <span>anonymity set</span>
            <span className="text-[var(--prism-text)]">142 deposits</span>
          </div>
          <div className="flex justify-between">
            <span>commitment</span>
            <span className="text-[var(--prism-accent)]">poseidon(nullifier, secret)</span>
          </div>
          <div className="flex justify-between">
            <span>tree</span>
            <span className="text-[var(--prism-text)]">depth-20 merkle</span>
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={!wallet?.connected || depositing}
          className="prism-button w-full text-center"
        >
          {depositing
            ? "generating commitment..."
            : !wallet?.connected
              ? "Connect wallet to deposit"
              : `deposit ${DENOMINATIONS[selectedDenom]} ${TOKENS[selectedToken].symbol}`}
        </button>

        {noteString && (
          <div className="border border-[var(--prism-success)] p-4" style={{ borderRadius: "2px" }}>
            <div className="text-[10px] uppercase tracking-widest text-[var(--prism-success)] mb-2">
              deposit confirmed · save this note
            </div>
            <div className="text-[11px] break-all bg-[var(--prism-bg)] p-3 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
              {noteString}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(noteString)}
              className="prism-button-secondary text-[10px] mt-3 py-1.5 px-3"
            >
              copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
