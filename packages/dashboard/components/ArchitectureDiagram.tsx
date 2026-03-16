"use client";

export default function ArchitectureDiagram() {
  return (
    <div className="prism-card">
      <h2 className="text-xs uppercase tracking-widest text-[var(--prism-text-muted)] mb-5">Architecture</h2>

      <div className="space-y-5 text-[11px]">
        {/* EVM */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">
            track 1 &mdash; evm
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { name: "PrismVault", desc: "deposit/withdraw" },
              { name: "PrismRouter", desc: "multi-vault" },
              { name: "CrossVMBridge", desc: "evm/pvm/xcm" },
            ].map((c) => (
              <div key={c.name} className="border border-[var(--prism-border)] p-3" style={{ borderRadius: "2px" }}>
                <div className="font-bold text-[var(--prism-text)]">{c.name}</div>
                <div className="text-[var(--prism-text-muted)] text-[10px]">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connector */}
        <div className="text-center text-[var(--prism-text-muted)] text-[10px] py-1">
          &darr; cross-vm precompile calls &darr;
        </div>

        {/* PVM */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">
            track 2 &mdash; pvm rust
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { name: "Poseidon", desc: "hash" },
              { name: "Pedersen", desc: "commit" },
              { name: "RangeProof", desc: "bounds" },
              { name: "Nullifier", desc: "anti-dupe" },
            ].map((m) => (
              <div key={m.name} className="border border-[var(--prism-border)] p-3" style={{ borderRadius: "2px" }}>
                <div className="font-bold text-[var(--prism-accent)]">{m.name}</div>
                <div className="text-[var(--prism-text-muted)] text-[10px]">{m.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-[10px] text-[var(--prism-accent)]">
            14x cheaper than EVM
          </div>
        </div>

        {/* XCM */}
        <div className="text-center text-[var(--prism-text-muted)] text-[10px] py-1">
          &darr; xcm messages &darr;
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">
            cross-chain
          </div>
          <div className="flex gap-1">
            {["Asset Hub", "Moonbeam", "Astar", "Bifrost", "Acala"].map((chain) => (
              <div
                key={chain}
                className="flex-1 border border-[var(--prism-border)] py-2 text-center text-[10px] text-[var(--prism-text-muted)]"
                style={{ borderRadius: "2px" }}
              >
                {chain}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
