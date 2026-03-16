import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism Protocol — Private DeFi on Polkadot Hub",
  description:
    "Cross-VM privacy-preserving DeFi router. Deposit, swap, and transfer tokens privately using PVM-accelerated cryptography.",
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
