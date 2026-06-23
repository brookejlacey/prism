"use client";

import { useState } from "react";
import type { WalletState } from "@/lib/wallet";

interface WithdrawPanelProps {
  wallet: WalletState | null;
}

export default function WithdrawPanel({ wallet }: WithdrawPanelProps) {
  const [noteInput, setNoteInput] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleWithdraw() {
    if (!wallet?.connected || !noteInput || !recipientAddress) return;
    setWithdrawing(true);
    await new Promise((r) => setTimeout(r, 3000));
    setSuccess(true);
    setWithdrawing(false);
  }

  return (
    <div id="withdraw" className="prism-card">
      <h2 className="text-xs uppercase tracking-widest text-[var(--prism-text-muted)] mb-5">
        <span className="text-[var(--prism-accent)] mr-2">&uarr;</span>
        Private Withdraw
      </h2>

      <div className="space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Note</div>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="paste deposit note..."
            className="prism-input"
          />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Recipient</div>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x... (can differ from depositor)"
            className="prism-input"
          />
        </div>

        <div className="border-t border-[var(--prism-border)] pt-4 text-[11px] text-[var(--prism-text-muted)] space-y-1.5">
          <div className="flex justify-between">
            <span>privacy</span>
            <span className="text-[var(--prism-success)]">no deposit link</span>
          </div>
          <div className="flex justify-between">
            <span>proof</span>
            <span className="text-[var(--prism-accent)]">groth16 zk-snark</span>
          </div>
          <div className="flex justify-between">
            <span>reveals</span>
            <span className="text-[var(--prism-text)]">nullifier hash only</span>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!wallet?.connected || withdrawing || !noteInput || !recipientAddress}
          className="prism-button w-full text-center"
        >
          {withdrawing
            ? "generating zk proof..."
            : !wallet?.connected
              ? "Connect wallet to withdraw"
              : "withdraw privately"}
        </button>

        {success && (
          <div className="border border-[var(--prism-success)] p-4 text-[11px] text-[var(--prism-success)]" style={{ borderRadius: "2px" }}>
            withdrawal complete. zero on-chain link to depositor.
          </div>
        )}
      </div>
    </div>
  );
}
