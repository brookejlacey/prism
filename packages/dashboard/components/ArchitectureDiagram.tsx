"use client";

export default function ArchitectureDiagram() {
  return (
    <div className="prism-card">
      <h2 className="text-xs uppercase tracking-widest text-[var(--prism-text-muted)] mb-5">Architecture</h2>

      <div className="space-y-5 text-[11px]">
        {/* Client */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">
            client (off-chain)
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { name: "SDK", desc: "note + merkle path" },
              { name: "withdraw.circom", desc: "membership circuit" },
              { name: "snarkjs", desc: "Groth16 prover" },
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
          &darr; proof + public inputs &darr;
        </div>

        {/* On-chain */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--prism-text-muted)] mb-2">
            Polkadot Hub (PolkaVM EVM)
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { name: "PrismRouter", desc: "indexes vaults" },
              { name: "PrismVault", desc: "shielded pool" },
              { name: "Groth16Verifier", desc: "checks the proof" },
              { name: "PoseidonT3", desc: "merkle hashing" },
            ].map((c) => (
              <div key={c.name} className="border border-[var(--prism-border)] p-3" style={{ borderRadius: "2px" }}>
                <div className="font-bold text-[var(--prism-accent)]">{c.name}</div>
                <div className="text-[var(--prism-text-muted)] text-[10px]">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-[10px] text-[var(--prism-accent)]">
            verification runs on the bn128 pairing precompiles
          </div>
        </div>
      </div>
    </div>
  );
}
