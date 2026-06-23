import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism Protocol · Private DeFi on Polkadot Hub",
  description:
    "A zk-SNARK shielded pool on Polkadot Hub. Deposit and withdraw tokens with no on-chain link between the two, using Groth16 proofs verified by the bn128 precompiles.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="mesh-bg" />
        {children}
      </body>
    </html>
  );
}
