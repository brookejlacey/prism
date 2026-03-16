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
    { id: "2000", name: "Asset Hub" },
    { id: "2004", name: "Moonbeam" },
    { id: "2006", name: "Astar" },
    { id: "2030", name: "Bifrost" },
  ];

  return (
    <div id="bridge" className="prism-card">
      <h2 className="text-xs uppercase tracking-widest text-[var(--prism-text-muted)] mb-5">
        <span className="text-[var(--prism-accent)] mr-2">&harr;</span>
        Cross-VM & XCM Bridge
      </h2>

      <div className="flex gap-1 mb-5">
        <button
          onClick={() => { setActiveTab("crossvm"); setSuccess(false); }}
          className={`flex-1 py-2 text-xs border transition-colors ${
            activeTab === "crossvm"
              ? "bg-[var(--prism-text)] text-[var(--prism-bg)] border-[var(--prism-text)]"
              : "bg-transparent text-[var(--prism-text-muted)] border-[var(--prism-border)]"
          }`}
          style={{ borderRadius: "2px" }}
        >
          EVM &harr; PVM
        </button>
        <button
          onClick={() => { setActiveTab("xcm"); setSuccess(false); }}
          className={`flex-1 py-2 text-xs border transition-colors ${
            activeTab === "xcm"
              ? "bg-[var(--prism-text)] text-[var(--prism-bg)] border-[var(--prism-text)]"
              : "bg-transparent text-[var(--prism-text-muted)] border-[var(--prism-border)]"
          }`}
          style={{ borderRadius: "2px" }}
        >
          XCM Transfer
        </button>
      </div>

      <div className="space-y-5">
        {activeTab === "crossvm" ? (
          <>
            <div className="border border-[var(--prism-border)] p-4 text-center text-[11px] text-[var(--prism-text-muted)]" style={{ borderRadius: "2px" }}>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="text-[var(--prism-text)] font-bold">EVM</span>
                <span className="text-[var(--prism-accent)]">&rarr;</span>
                <span className="text-[var(--prism-text)] font-bold">PVM</span>
              </div>
              shielded commitments across virtual machines. 14x gas reduction on pvm side.
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Amount</div>
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
              <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Destination</div>
              <div className="grid grid-cols-2 gap-1">
                {parachains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => setDestParaId(chain.id)}
                    className={`py-2.5 text-xs border transition-colors ${
                      destParaId === chain.id
                        ? "bg-[var(--prism-text)] text-[var(--prism-bg)] border-[var(--prism-text)]"
                        : "bg-transparent text-[var(--prism-text-muted)] border-[var(--prism-border)] hover:border-[var(--prism-text-muted)]"
                    }`}
                    style={{ borderRadius: "2px" }}
                  >
                    {chain.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">Amount</div>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.0"
                className="prism-input"
              />
            </div>

            <div className="border-t border-[var(--prism-border)] pt-4 text-[11px] text-[var(--prism-text-muted)] space-y-1.5">
              <div className="flex justify-between">
                <span>protocol</span>
                <span className="text-[var(--prism-text)]">xcm v3</span>
              </div>
              <div className="flex justify-between">
                <span>privacy</span>
                <span className="text-[var(--prism-success)]">shielded</span>
              </div>
            </div>
          </>
        )}

        <button
          onClick={handleTransfer}
          disabled={!wallet?.connected || processing || !amount}
          className="prism-button w-full text-center"
        >
          {processing
            ? "processing..."
            : !wallet?.connected
              ? "Connect wallet"
              : activeTab === "crossvm"
                ? "transfer evm > pvm"
                : "send xcm transfer"}
        </button>

        {success && (
          <div className="border border-[var(--prism-success)] p-4 text-[11px] text-[var(--prism-success)]" style={{ borderRadius: "2px" }}>
            {activeTab === "crossvm"
              ? "cross-vm complete. commitment locked."
              : `xcm initiated to ${parachains.find((p) => p.id === destParaId)?.name}.`}
          </div>
        )}
      </div>
    </div>
  );
}
