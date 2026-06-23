"use client";

import { DEMO_STATS } from "@/lib/contracts";

export default function StatsGrid() {
  const stats = [
    { label: "Anonymity Set", value: DEMO_STATS.anonymitySet.toString(), accent: true },
    { label: "Deposits", value: DEMO_STATS.totalDeposits.toString() },
    { label: "Withdrawals", value: DEMO_STATS.totalWithdrawals.toString() },
    { label: "Pool Balance", value: `${DEMO_STATS.poolBalance} USDC` },
    { label: "Tree Depth", value: DEMO_STATS.treeDepth.toString() },
    { label: "Denominations", value: DEMO_STATS.denominations.join(" / ") },
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
