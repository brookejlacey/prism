"use client";

import { DEMO_STATS } from "@/lib/contracts";

export default function StatsGrid() {
  const stats = [
    { label: "Anonymity Set", value: DEMO_STATS.anonymitySet.toString() },
    { label: "Deposits", value: DEMO_STATS.totalDeposits.toString() },
    { label: "Cross-VM Ops", value: DEMO_STATS.crossVMTransfers.toString() },
    { label: "PVM Savings", value: DEMO_STATS.evmGasSaved, accent: true },
    { label: "XCM Transfers", value: DEMO_STATS.xcmTransfers.toString() },
    { label: "Tokens", value: DEMO_STATS.supportedTokens.join(" / ") },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--prism-border)]">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-[var(--prism-surface)] p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">
            {stat.label}
          </div>
          <div className={`text-xl font-bold ${stat.accent ? "text-[var(--prism-accent)]" : ""}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
