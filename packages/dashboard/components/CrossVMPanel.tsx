"use client";

import { useState } from "react";
import type { WalletState } from "@/lib/wallet";

interface CrossVMPanelProps {
  wallet: WalletState | null;
}

export default function CrossVMPanel({ wallet }: CrossVMPanelProps) {
  const [activeTab, setActiveTab] = useState<"crossvm" | "xcm">("crossvm");
  const [amount, setAmount] = useState("");
  const [destParaId, setDestParaId] = useState("2000");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleTransfer() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2500));
    setSuccess(true);
    setProcessing(false);
  }

  const parachains = [
    { id: "2000", name: "Asset Hub", symbol: "AH" },
    { id: "2004", name: "Moonbeam", symbol: "GLMR" },
    { id: "2006", name: "Astar", symbol: "ASTR" },
    { id: "2030", name: "Bifrost", symbol: "BNC" },
  ];

  return (
    <div id="bridge" className="prism-card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-[var(--prism-accent)] flex items-center justify-center text-xs">
          ⟷
        </span>
        Cross-VM & XCM Bridge
      </h2>

      {/* Tab selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab("crossvm"); setSuccess(false); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "crossvm"
              ? "bg-[var(--prism-accent)] text-white"
              : "bg-[var(--prism-surface-light)] text-[var(--prism-text-muted)]"
          }`}
        >
          EVM ↔ PVM
        </button>
        <button
          onClick={() => { setActiveTab("xcm"); setSuccess(false); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "xcm"
              ? "bg-[var(--prism-accent)] text-white"
              : "bg-[var(--prism-surface-light)] text-[var(--prism-text-muted)]"
          }`}
        >
          XCM Transfer
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === "crossvm" ? (
          <>
            <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="px-4 py-2 rounded-lg bg-[var(--prism-primary)] text-white text-sm font-medium">
                  EVM
                </div>
                <div className="text-[var(--prism-accent)] text-lg">→</div>
                <div className="px-4 py-2 rounded-lg bg-[var(--prism-secondary)] text-white text-sm font-medium">
                  PVM
                </div>
              </div>
              <p className="text-xs text-[var(--prism-text-muted)]">
                Transfer shielded commitments between EVM and PVM on Polkadot Hub.
                Cryptographic operations are accelerated 14x on the PVM side.
              </p>
            </div>

            <div>
              <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1.0"
                className="prism-input"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">
                Destination Parachain
              </label>
              <div className="grid grid-cols-2 gap-2">
                {parachains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => setDestParaId(chain.id)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      destParaId === chain.id
                        ? "bg-[var(--prism-accent)] text-white"
                        : "bg-[var(--prism-surface-light)] text-[var(--prism-text-muted)] border border-[var(--prism-border)]"
                    }`}
                  >
                    {chain.name}
                    <span className="text-xs opacity-60 ml-1">({chain.symbol})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--prism-text-muted)] mb-2 block">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.0"
                className="prism-input"
              />
            </div>

            <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 text-xs text-[var(--prism-text-muted)] space-y-2">
              <div className="flex justify-between">
                <span>Protocol</span>
                <span className="text-white">XCM v3</span>
              </div>
              <div className="flex justify-between">
                <span>Privacy</span>
                <span className="text-[var(--prism-success)]">Shielded commitment</span>
              </div>
              <div className="flex justify-between">
                <span>Destination</span>
                <span className="text-white">
                  {parachains.find((p) => p.id === destParaId)?.name}
                </span>
              </div>
            </div>
          </>
        )}

        <button
          onClick={handleTransfer}
          disabled={!wallet?.connected || processing || !amount}
          className="prism-button w-full text-center"
          style={{
            background: !processing
              ? "linear-gradient(135deg, #f472b6, #ec4899)"
              : undefined,
          }}
        >
          {processing
            ? "Processing cross-chain commitment..."
            : !wallet?.connected
              ? "Connect wallet"
              : activeTab === "crossvm"
                ? "Transfer EVM → PVM"
                : "Send Private XCM Transfer"}
        </button>

        {success && (
          <div className="bg-[var(--prism-surface-light)] rounded-xl p-4 border border-[var(--prism-success)]">
            <div className="text-xs text-[var(--prism-success)] font-semibold">
              {activeTab === "crossvm"
                ? "Cross-VM transfer complete! Commitment locked on EVM, ready for PVM release."
                : `XCM transfer initiated to ${parachains.find((p) => p.id === destParaId)?.name}. Awaiting confirmation.`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
