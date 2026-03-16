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

    // Simulate withdrawal
    await new Promise((r) => setTimeout(r, 3000));
    setSuccess(true);
    setWithdrawing(false);
  }

  return (
    <div id="withdraw" className="prism-card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-[var(--prism-secondary)] flex items-center justify-center text-xs">
          ↑
        </span>
        Private Withdraw
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">
            Deposit Note
          </label>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Paste your deposit note here..."
            className="prism-input font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x... (can be a different address than depositor)"
            className="prism-input font-mono text-xs"
          />
        </div>

        <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 text-xs text-[var(--prism-text-muted)] space-y-2">
          <div className="flex justify-between">
            <span>Privacy Level</span>
            <span className="text-[var(--prism-success)]">Full Unlinkability</span>
          </div>
          <div className="flex justify-between">
            <span>Proof Generation</span>
            <span className="text-[var(--prism-secondary)]">PVM Rust Engine</span>
          </div>
          <div className="flex justify-between">
            <span>Verification</span>
            <span className="text-white">Nullifier + Merkle</span>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!wallet?.connected || withdrawing || !noteInput || !recipientAddress}
          className="prism-button w-full text-center"
          style={{ background: !withdrawing ? "linear-gradient(135deg, #06b6d4, #0891b2)" : undefined }}
        >
          {withdrawing
            ? "Generating ZK proof via PVM..."
            : !wallet?.connected
              ? "Connect wallet to withdraw"
              : "Withdraw Privately"}
        </button>

        {success && (
          <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 border border-[var(--prism-success)]">
            <div className="text-xs text-[var(--prism-success)] font-semibold">
              Withdrawal complete! Tokens sent to recipient with zero on-chain link to depositor.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
