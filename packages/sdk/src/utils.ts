import { ethers } from "ethers";

export const DENOMINATIONS = {
  "0.1": ethers.parseEther("0.1"),
  "1": ethers.parseEther("1"),
  "10": ethers.parseEther("10"),
  "100": ethers.parseEther("100"),
} as const;

export type DenominationTier = keyof typeof DENOMINATIONS;

/**
 * Format a denomination value to a human-readable string
 */
export function formatDenomination(value: bigint, decimals: number = 18): string {
  return ethers.formatUnits(value, decimals);
}

/**
 * Parse a denomination string to bigint
 */
export function parseDenomination(value: string, decimals: number = 18): bigint {
  return ethers.parseUnits(value, decimals);
}

/**
 * Get the optimal split of an amount into standard denominations
 * Returns the fewest deposits needed to cover the amount
 */
export function getOptimalSplit(
  amount: bigint
): { denomination: bigint; count: number }[] {
  const result: { denomination: bigint; count: number }[] = [];
  let remaining = amount;

  const sortedDenoms = Object.values(DENOMINATIONS).sort((a, b) =>
    a > b ? -1 : 1
  );

  for (const denom of sortedDenoms) {
    if (denom <= remaining) {
      const count = Number(remaining / denom);
      result.push({ denomination: denom, count });
      remaining -= denom * BigInt(count);
    }
  }

  return result;
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a large number with comma separators
 */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}
