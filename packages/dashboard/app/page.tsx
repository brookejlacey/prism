"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatsGrid from "@/components/StatsGrid";
import DepositPanel from "@/components/DepositPanel";
import WithdrawPanel from "@/components/WithdrawPanel";
import CrossVMPanel from "@/components/CrossVMPanel";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import type { WalletState } from "@/lib/wallet";

export default function Home() {
  const [wallet, setWallet] = useState<WalletState | null>(null);

  return (
    <div className="min-h-screen">
      <Header wallet={wallet} onConnect={setWallet} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="text-center py-12">
          <h1 className="text-5xl font-bold mb-4">
            <span className="prism-gradient-text">Private DeFi</span>
            <br />
            <span className="text-[var(--prism-text)]">on Polkadot Hub</span>
          </h1>
          <p className="text-[var(--prism-text-muted)] max-w-2xl mx-auto text-lg">
            The first cross-VM privacy layer using PVM Rust precompiles for
            accelerated cryptography. Deposit, swap, and transfer tokens
            privately — 14x cheaper than pure EVM.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--prism-primary)] bg-opacity-20 text-[var(--prism-primary-light)] border border-[var(--prism-primary)] border-opacity-30">
              Track 1: EVM Smart Contracts
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--prism-secondary)] bg-opacity-20 text-[var(--prism-secondary)] border border-[var(--prism-secondary)] border-opacity-30">
              Track 2: PVM Precompiles
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--prism-accent)] bg-opacity-20 text-[var(--prism-accent)] border border-[var(--prism-accent)] border-opacity-30">
              XCM Cross-Chain
            </span>
          </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-sm text-[var(--prism-text-muted)] uppercase tracking-wider mb-4">
            Protocol Metrics
          </h2>
          <StatsGrid />
        </section>

        {/* Main actions */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepositPanel wallet={wallet} />
          <WithdrawPanel wallet={wallet} />
        </section>

        {/* Cross-VM & Architecture */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CrossVMPanel wallet={wallet} />
          <ArchitectureDiagram />
        </section>

        {/* How it works */}
        <section className="prism-card">
          <h2 className="text-lg font-semibold mb-6">How Prism Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Deposit",
                description:
                  "User deposits tokens with a Poseidon commitment. The commitment hides the depositor's identity.",
                color: "var(--prism-primary)",
              },
              {
                step: "2",
                title: "PVM Proves",
                description:
                  "Rust precompiles on PVM generate Pedersen commitments and range proofs 14x cheaper than EVM.",
                color: "var(--prism-secondary)",
              },
              {
                step: "3",
                title: "Withdraw",
                description:
                  "User proves knowledge of a valid commitment using a nullifier — no link to the original deposit.",
                color: "var(--prism-accent)",
              },
              {
                step: "4",
                title: "Cross-Chain",
                description:
                  "XCM enables private transfers across parachains. Commitments travel, identities don't.",
                color: "var(--prism-success)",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3"
                  style={{ backgroundColor: item.color, opacity: 0.9 }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-xs text-[var(--prism-text-muted)]">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-[var(--prism-text-muted)] py-8 border-t border-[var(--prism-border)]">
          <p>
            Prism Protocol — Built for the Polkadot Solidity Hackathon 2026
          </p>
          <p className="mt-1">
            Powered by Polkadot Hub | EVM + PVM + XCM
          </p>
        </footer>
      </main>
    </div>
  );
}
