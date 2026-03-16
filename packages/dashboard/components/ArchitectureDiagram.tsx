"use client";

export default function ArchitectureDiagram() {
  return (
    <div className="prism-card">
      <h2 className="text-lg font-semibold mb-4">Architecture</h2>

      <div className="space-y-4">
        {/* EVM Layer */}
        <div className="relative">
          <div className="text-xs text-[var(--prism-text-muted)] mb-2 uppercase tracking-wider">
            Track 1 — EVM Smart Contracts
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--prism-primary)] bg-opacity-20 border border-[var(--prism-primary)] rounded-xl p-3 text-center">
              <div className="text-xs font-semibold text-[var(--prism-primary-light)]">PrismVault</div>
              <div className="text-[10px] text-[var(--prism-text-muted)] mt-1">Deposit/Withdraw</div>
            </div>
            <div className="bg-[var(--prism-primary)] bg-opacity-20 border border-[var(--prism-primary)] rounded-xl p-3 text-center">
              <div className="text-xs font-semibold text-[var(--prism-primary-light)]">PrismRouter</div>
              <div className="text-[10px] text-[var(--prism-text-muted)] mt-1">Multi-vault routing</div>
            </div>
            <div className="bg-[var(--prism-primary)] bg-opacity-20 border border-[var(--prism-primary)] rounded-xl p-3 text-center">
              <div className="text-xs font-semibold text-[var(--prism-primary-light)]">CrossVMBridge</div>
              <div className="text-[10px] text-[var(--prism-text-muted)] mt-1">EVM ↔ PVM</div>
            </div>
          </div>
        </div>

        {/* Cross-VM arrow */}
        <div className="flex items-center justify-center">
          <div className="h-8 w-px bg-gradient-to-b from-[var(--prism-primary)] to-[var(--prism-secondary)]" />
          <span className="absolute text-xs text-[var(--prism-text-muted)] bg-[var(--prism-surface)] px-2">
            Cross-VM Precompile Calls
          </span>
        </div>

        {/* PVM Layer */}
        <div>
          <div className="text-xs text-[var(--prism-text-muted)] mb-2 uppercase tracking-wider">
            Track 2 — PVM Rust Precompiles
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "Poseidon", desc: "ZK Hash" },
              { name: "Pedersen", desc: "Commitments" },
              { name: "RangeProof", desc: "Value bounds" },
              { name: "Nullifier", desc: "Anti-double-spend" },
            ].map((mod) => (
              <div
                key={mod.name}
                className="bg-[var(--prism-secondary)] bg-opacity-20 border border-[var(--prism-secondary)] rounded-xl p-3 text-center"
              >
                <div className="text-xs font-semibold text-[var(--prism-secondary)]">{mod.name}</div>
                <div className="text-[10px] text-[var(--prism-text-muted)] mt-1">{mod.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] px-3 py-1 rounded-full bg-[var(--prism-success)] bg-opacity-20 text-[var(--prism-success)] font-medium">
              14x cheaper than EVM
            </span>
          </div>
        </div>

        {/* XCM Layer */}
        <div className="flex items-center justify-center">
          <div className="h-8 w-px bg-gradient-to-b from-[var(--prism-secondary)] to-[var(--prism-accent)]" />
          <span className="absolute text-xs text-[var(--prism-text-muted)] bg-[var(--prism-surface)] px-2">
            XCM Messages
          </span>
        </div>

        <div>
          <div className="text-xs text-[var(--prism-text-muted)] mb-2 uppercase tracking-wider">
            Cross-Chain — XCM Private Transfers
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {["Asset Hub", "Moonbeam", "Astar", "Bifrost", "Acala"].map((chain) => (
              <div
                key={chain}
                className="flex-shrink-0 bg-[var(--prism-accent)] bg-opacity-20 border border-[var(--prism-accent)] rounded-xl px-4 py-2 text-center"
              >
                <div className="text-xs font-medium text-[var(--prism-accent)]">{chain}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
