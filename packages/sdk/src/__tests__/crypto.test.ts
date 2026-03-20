import { describe, it, expect } from "vitest";
import {
  generateSecret,
  poseidonHash,
  deriveNullifier,
  generateCommitment,
  parseNote,
  generateProof,
  computeCommitment,
} from "../crypto";
import { ethers } from "ethers";

const FIELD_PRIME =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

describe("generateSecret", () => {
  it("returns a value within the BN254 field", () => {
    const secret = generateSecret();
    expect(secret).toBeGreaterThan(0n);
    expect(secret).toBeLessThan(FIELD_PRIME);
  });

  it("returns different values on successive calls", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
  });
});

describe("poseidonHash", () => {
  it("is deterministic", () => {
    const a = poseidonHash(42n, 99n);
    const b = poseidonHash(42n, 99n);
    expect(a).toBe(b);
  });

  it("produces different outputs for different inputs", () => {
    const a = poseidonHash(1n, 2n);
    const b = poseidonHash(2n, 1n);
    expect(a).not.toBe(b);
  });

  it("returns a value within the field", () => {
    const h = poseidonHash(123n, 456n);
    expect(h).toBeGreaterThanOrEqual(0n);
    expect(h).toBeLessThan(FIELD_PRIME);
  });
});

describe("deriveNullifier", () => {
  it("is deterministic", () => {
    const secret = 12345n;
    expect(deriveNullifier(secret)).toBe(deriveNullifier(secret));
  });

  it("equals poseidonHash(secret, 0)", () => {
    const secret = 99999n;
    expect(deriveNullifier(secret)).toBe(poseidonHash(secret, 0n));
  });
});

describe("generateCommitment / parseNote round-trip", () => {
  it("round-trips through noteString encoding", () => {
    const token = "0x" + "ab".repeat(20);
    const denomination = ethers.parseEther("1");

    const note = generateCommitment(token, denomination);
    const restored = parseNote(note.noteString);

    expect(restored.secret).toBe(note.secret);
    expect(restored.nullifierHash).toBe(note.nullifierHash);
    expect(restored.commitment).toBe(note.commitment);
    expect(restored.denomination).toBe(note.denomination);
    expect(restored.token.toLowerCase()).toBe(token.toLowerCase());
  });

  it("produces a consistent commitment from a fixed secret", () => {
    const token = "0x" + "00".repeat(20);
    const denomination = ethers.parseEther("10");
    const secret = 777n;

    const a = generateCommitment(token, denomination, secret);
    const b = generateCommitment(token, denomination, secret);

    expect(a.commitment).toBe(b.commitment);
    expect(a.nullifierHash).toBe(b.nullifierHash);
    expect(a.noteString).toBe(b.noteString);
  });
});

describe("computeCommitment", () => {
  it("matches generateCommitment output for the same secret", () => {
    const token = "0x" + "ff".repeat(20);
    const denomination = ethers.parseEther("0.1");
    const secret = 42n;

    const note = generateCommitment(token, denomination, secret);
    const computed = computeCommitment(secret);

    expect(computed.commitment).toBe(note.commitment);
    expect(computed.nullifierHash).toBe(note.nullifierHash);
  });
});

describe("generateProof", () => {
  it("returns valid ABI-encoded bytes", () => {
    const proof = generateProof(123n, 0, [1n, 2n, 3n]);
    expect(proof).toMatch(/^0x[0-9a-f]+$/i);

    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["uint256", "uint256", "uint256[]"],
      proof
    );
    expect(decoded[0]).toBe(123n);
    expect(decoded[1]).toBe(0n);
    expect(decoded[2]).toEqual([1n, 2n, 3n]);
  });
});
