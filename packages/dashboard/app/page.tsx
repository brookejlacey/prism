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

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Demo mode banner */}
        <div className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--prism-text-muted)] py-2 px-4 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
          Demo Mode &mdash; Simulating protocol interactions on Paseo testnet
        </div>

        {/* Hero */}
        <section className="py-16 border-b border-[var(--prism-border)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--prism-text-muted)] mb-4">
            Polkadot Hub &middot; EVM + PVM + XCM
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            <span className="prism-gradient-text">Private DeFi</span>
            <br />
            on Polkadot Hub
          </h1>
          <p className="text-[var(--prism-text-muted)] max-w-xl text-sm leading-relaxed">
            Cross-VM privacy layer with PVM Rust precompiles for
            accelerated cryptography. Deposit, swap, and transfer tokens
            privately&mdash;14x cheaper than pure EVM.
          </p>
          <div className="flex items-center gap-4 mt-6">
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
              Track 1: EVM Smart Contracts
            </span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--prism-accent)] text-[var(--prism-accent)]" style={{ borderRadius: "2px" }}>
              Track 2: PVM Precompiles
            </span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
              XCM Cross-Chain
            </span>
          </div>
        </section>

        {/* Stats */}
        <section>
          <StatsGrid />
        </section>

        {/* Actions */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepositPanel wallet={wallet} />
          <WithdrawPanel wallet={wallet} />
        </section>

        {/* Bridge & Architecture */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CrossVMPanel wallet={wallet} />
          <ArchitectureDiagram />
        </section>

        {/* How it works */}
        <section className="prism-card">
          <h2 className="text-xs uppercase tracking-widest text-[var(--prism-text-muted)] mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Deposit",
                description: "Deposit tokens with a Poseidon commitment. The commitment hides the depositor.",
              },
              {
                step: "02",
                title: "PVM Proves",
                description: "Rust precompiles generate Pedersen commitments and range proofs at 14x less gas.",
              },
              {
                step: "03",
                title: "Withdraw",
                description: "Prove knowledge of a commitment via nullifier. No link to the original deposit.",
              },
              {
                step: "04",
                title: "Cross-Chain",
                description: "XCM sends commitments across parachains. Identities never travel.",
              },
            ].map((item) => (
              <div key={item.step}>
                <div className="text-[var(--prism-accent)] font-bold text-lg mb-2">{item.step}</div>
                <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-[11px] text-[var(--prism-text-muted)] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] py-8 border-t border-[var(--prism-border)]">
          Prism Protocol &middot; Polkadot Solidity Hackathon 2026 &middot; EVM + PVM + XCM
        </footer>
      </main>
    </div>
  );
}
