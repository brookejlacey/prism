"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatsGrid from "@/components/StatsGrid";
import DepositPanel from "@/components/DepositPanel";
import WithdrawPanel from "@/components/WithdrawPanel";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import type { WalletState } from "@/lib/wallet";

export default function Home() {
  const [wallet, setWallet] = useState<WalletState | null>(null);

  return (
    <div className="min-h-screen">
      <Header wallet={wallet} onConnect={setWallet} />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Interface preview banner */}
        <div className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--prism-text-muted)] py-2 px-4 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
          Interface preview · the verifiable flow lives in the contracts, circuit and SDK tests
        </div>

        {/* Hero */}
        <section className="py-16 border-b border-[var(--prism-border)]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--prism-text-muted)] mb-4">
            Polkadot Hub · PolkaVM EVM · Groth16
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            <span className="prism-gradient-text">Private DeFi</span>
            <br />
            on Polkadot Hub
          </h1>
          <p className="text-[var(--prism-text-muted)] max-w-xl text-sm leading-relaxed">
            A zk-SNARK shielded pool. Deposit a fixed denomination behind a
            Poseidon commitment, then withdraw to any address by proving you own
            a deposit in zero knowledge. The proof is generated client side and
            verified on-chain. Nothing links the two transactions.
          </p>
          <div className="flex items-center gap-4 mt-6 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
              Groth16 zk-SNARK
            </span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--prism-accent)] text-[var(--prism-accent)]" style={{ borderRadius: "2px" }}>
              Poseidon Merkle tree
            </span>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 border border-[var(--prism-border)]" style={{ borderRadius: "2px" }}>
              bn128 precompiles
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

        {/* Architecture */}
        <section>
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
                description:
                  "Pick a random nullifier and secret, post Poseidon(nullifier, secret) as a commitment, and send the fixed denomination. The leaf joins the Merkle tree.",
              },
              {
                step: "02",
                title: "Keep the note",
                description:
                  "Your note holds the nullifier and secret. It is the only thing that can withdraw the deposit, and it never touches the chain.",
              },
              {
                step: "03",
                title: "Prove",
                description:
                  "The SDK builds a Groth16 proof that your commitment is in the tree and reveals only the nullifier hash. The secret stays a private witness.",
              },
              {
                step: "04",
                title: "Withdraw",
                description:
                  "The vault verifies the proof through the bn128 precompiles and pays any recipient you choose. No link to the deposit address.",
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
          Prism Protocol · zk-SNARK shielded pool on Polkadot Hub
        </footer>
      </main>
    </div>
  );
}
