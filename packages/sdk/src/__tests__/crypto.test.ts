import { describe, it, expect } from "vitest";
import {
  poseidon,
  createNote,
  fromSecrets,
  parseNote,
  MerkleTree,
  FIELD_PRIME,
  ZERO_VALUE,
} from "../crypto";

describe("poseidon", () => {
  it("is deterministic and field-bounded", async () => {
    const a = await poseidon([42n, 99n]);
    const b = await poseidon([42n, 99n]);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0n);
    expect(a).toBeLessThan(FIELD_PRIME);
  });

  it("is order-sensitive", async () => {
    expect(await poseidon([1n, 2n])).not.toBe(await poseidon([2n, 1n]));
  });
});

describe("notes", () => {
  it("derives commitment and nullifierHash from secrets", async () => {
    const note = await fromSecrets(123n, 456n);
    expect(note.commitment).toBe(await poseidon([123n, 456n]));
    expect(note.nullifierHash).toBe(await poseidon([123n]));
  });

  it("round-trips through the note string", async () => {
    const note = await createNote();
    const restored = await parseNote(note.noteString);
    expect(restored.nullifier).toBe(note.nullifier);
    expect(restored.secret).toBe(note.secret);
    expect(restored.commitment).toBe(note.commitment);
    expect(restored.nullifierHash).toBe(note.nullifierHash);
  });

  it("creates distinct random notes", async () => {
    const a = await createNote();
    const b = await createNote();
    expect(a.commitment).not.toBe(b.commitment);
  });
});

describe("MerkleTree", () => {
  it("an empty tree's root is the zero-subtree root", async () => {
    const empty = await MerkleTree.build([]);
    let z = ZERO_VALUE;
    for (let i = 0; i < empty.levels; i++) z = await poseidon([z, z]);
    expect(empty.root).toBe(z);
  });

  it("a one-leaf path reconstructs the root", async () => {
    const note = await fromSecrets(7n, 8n);
    const tree = await MerkleTree.build([note.commitment]);
    const { pathElements, pathIndices } = tree.proof(0);

    let cur = note.commitment;
    for (let i = 0; i < tree.levels; i++) {
      cur = pathIndices[i]
        ? await poseidon([pathElements[i], cur])
        : await poseidon([cur, pathElements[i]]);
    }
    expect(cur).toBe(tree.root);
  });

  it("distinguishes two leaves' paths", async () => {
    const n0 = await fromSecrets(1n, 1n);
    const n1 = await fromSecrets(2n, 2n);
    const tree = await MerkleTree.build([n0.commitment, n1.commitment]);
    expect(tree.proof(0).pathElements[0]).toBe(n1.commitment);
    expect(tree.proof(1).pathElements[0]).toBe(n0.commitment);
  });
});
