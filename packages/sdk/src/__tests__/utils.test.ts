import { describe, it, expect } from "vitest";
import {
  DENOMINATIONS,
  formatDenomination,
  parseDenomination,
  getOptimalSplit,
  truncateAddress,
  formatNumber,
} from "../utils";
import { ethers } from "ethers";

describe("formatDenomination", () => {
  it("formats wei to ether string", () => {
    expect(formatDenomination(ethers.parseEther("1"))).toBe("1.0");
    expect(formatDenomination(ethers.parseEther("0.1"))).toBe("0.1");
    expect(formatDenomination(ethers.parseEther("100"))).toBe("100.0");
  });
});

describe("parseDenomination", () => {
  it("parses ether string to wei", () => {
    expect(parseDenomination("1")).toBe(ethers.parseEther("1"));
    expect(parseDenomination("0.1")).toBe(ethers.parseEther("0.1"));
  });

  it("round-trips with formatDenomination", () => {
    const val = parseDenomination("10");
    expect(formatDenomination(val)).toBe("10.0");
  });
});

describe("getOptimalSplit", () => {
  it("splits 111.1 into 1x100 + 1x10 + 1x1 + 1x0.1", () => {
    const amount = ethers.parseEther("111.1");
    const splits = getOptimalSplit(amount);

    const map = new Map(splits.map((s) => [s.denomination, s.count]));
    expect(map.get(DENOMINATIONS["100"])).toBe(1);
    expect(map.get(DENOMINATIONS["10"])).toBe(1);
    expect(map.get(DENOMINATIONS["1"])).toBe(1);
    expect(map.get(DENOMINATIONS["0.1"])).toBe(1);
  });

  it("handles exact denomination amounts", () => {
    const splits = getOptimalSplit(ethers.parseEther("10"));
    expect(splits).toHaveLength(1);
    expect(splits[0].denomination).toBe(DENOMINATIONS["10"]);
    expect(splits[0].count).toBe(1);
  });

  it("returns empty for zero amount", () => {
    expect(getOptimalSplit(0n)).toEqual([]);
  });
});

describe("truncateAddress", () => {
  it("truncates a standard address", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateAddress(addr)).toBe("0x1234...5678");
  });
});

describe("formatNumber", () => {
  it("formats with locale separators", () => {
    const result = formatNumber(1000000);
    expect(result).toContain("000");
  });
});
