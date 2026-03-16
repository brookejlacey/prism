"use client";

import { DEMO_STATS } from "@/lib/contracts";

interface Stat {
  label: string;
  value: string;
  subtitle: string;
  color: string;
}

export default function StatsGrid() {
  const stats: Stat[] = [
    {
      label: "Anonymity Set",
      value: DEMO_STATS.anonymitySet.toString(),
      subtitle: "Active shielded deposits",
      color: "var(--prism-primary)",
    },
    {
      label: "Total Deposits",
      value: DEMO_STATS.totalDeposits.toString(),
      subtitle: "Private deposits made",
      color: "var(--prism-secondary)",
    },
    {
      label: "Cross-VM Transfers",
      value: DEMO_STATS.crossVMTransfers.toString(),
      subtitle: "EVM ↔ PVM operations",
      color: "var(--prism-accent)",
    },
    {
      label: "PVM Gas Savings",
      value: DEMO_STATS.evmGasSaved,
      subtitle: "vs. pure EVM crypto ops",
      color: "var(--prism-success)",
    },
    {
      label: "XCM Transfers",
      value: DEMO_STATS.xcmTransfers.toString(),
      subtitle: "Cross-chain private transfers",
      color: "var(--prism-warning)",
    },
    {
      label: "Supported Tokens",
      value: DEMO_STATS.supportedTokens.length.toString(),
      subtitle: DEMO_STATS.supportedTokens.join(", "),
      color: "var(--prism-primary-light)",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="prism-card">
          <div className="text-xs uppercase tracking-wider text-[var(--prism-text-muted)] mb-2">
            {stat.label}
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>
            {stat.value}
          </div>
          <div className="text-xs text-[var(--prism-text-muted)]">{stat.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
