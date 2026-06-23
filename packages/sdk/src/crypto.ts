import { ethers } from "ethers";
import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";

/** BN254 scalar field prime — the field all commitments live in. */
export const FIELD_PRIME =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** keccak256("prism") % FIELD_PRIME — must match MerkleTreeWithHistory.ZERO_VALUE. */
export const ZERO_VALUE =
  20516652017007664073629451204112493887988919387149521211184607474122666234029n;

/** Default tree depth — must match `Withdraw(20)` in withdraw.circom. */
export const TREE_LEVELS = 20;

let _poseidon: any = null;

/** Lazily build the circomlib Poseidon instance (matches the circuit + contract). */
export async function getPoseidon() {
  if (!_poseidon) _poseidon = await buildPoseidon();
  return _poseidon;
}

/** Poseidon hash of field elements, returned as a bigint in the field. */
export async function poseidon(inputs: bigint[]): Promise<bigint> {
  const p = await getPoseidon();
  return p.F.toObject(p(inputs)) as bigint;
}

export interface DepositNote {
  /** Private witness — never goes on-chain. */
  nullifier: bigint;
  /** Private witness — never goes on-chain. */
  secret: bigint;
  /** Public leaf stored in the Merkle tree: Poseidon(nullifier, secret). */
  commitment: bigint;
  /** Revealed at withdraw to prevent double-spend: Poseidon(nullifier). */
  nullifierHash: bigint;
  /** Portable backup string. */
  noteString: string;
}

function randomFieldElement(): bigint {
  // 31 bytes keeps us safely under the field modulus.
  return BigInt(ethers.hexlify(ethers.randomBytes(31))) % FIELD_PRIME;
}

/** Create a fresh deposit note (random nullifier + secret). */
export async function createNote(): Promise<DepositNote> {
  const nullifier = randomFieldElement();
  const secret = randomFieldElement();
  return fromSecrets(nullifier, secret);
}

/** Rebuild a note's public values from its private witnesses. */
export async function fromSecrets(nullifier: bigint, secret: bigint): Promise<DepositNote> {
  const commitment = await poseidon([nullifier, secret]);
  const nullifierHash = await poseidon([nullifier]);
  const noteString = `prism-v1-${nullifier.toString(16)}-${secret.toString(16)}`;
  return { nullifier, secret, commitment, nullifierHash, noteString };
}

/** Parse a `prism-v1-<nullifier>-<secret>` note string. */
export async function parseNote(noteString: string): Promise<DepositNote> {
  const m = noteString.match(/^prism-v1-([0-9a-f]+)-([0-9a-f]+)$/);
  if (!m) throw new Error("Invalid note string");
  return fromSecrets(BigInt("0x" + m[1]), BigInt("0x" + m[2]));
}

/**
 * Off-chain mirror of the on-chain incremental Merkle tree. Rebuild it from the
 * ordered list of deposited commitments to produce a membership path.
 */
export class MerkleTree {
  readonly levels: number;
  private zeros: bigint[] = [];
  private layers: bigint[][] = [];

  private constructor(levels: number) {
    this.levels = levels;
  }

  static async build(leaves: bigint[], levels = TREE_LEVELS): Promise<MerkleTree> {
    const t = new MerkleTree(levels);
    let z = ZERO_VALUE;
    t.zeros = [z];
    for (let i = 0; i < levels; i++) {
      z = await poseidon([z, z]);
      t.zeros.push(z);
    }
    t.layers = [leaves.slice()];
    for (let i = 0; i < levels; i++) {
      const cur = t.layers[i];
      const next: bigint[] = [];
      for (let j = 0; j < cur.length; j += 2) {
        const left = cur[j];
        const right = j + 1 < cur.length ? cur[j + 1] : t.zeros[i];
        next.push(await poseidon([left, right]));
      }
      t.layers.push(next);
    }
    return t;
  }

  get root(): bigint {
    const top = this.layers[this.levels];
    return top.length ? top[0] : this.zeros[this.levels];
  }

  /** Merkle path for the leaf at `index`: sibling elements + index bits. */
  proof(index: number): { pathElements: bigint[]; pathIndices: number[] } {
    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];
    let idx = index;
    for (let i = 0; i < this.levels; i++) {
      const layer = this.layers[i];
      const isRight = idx % 2;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      const sibling = siblingIdx < layer.length ? layer[siblingIdx] : this.zeros[i];
      pathElements.push(sibling);
      pathIndices.push(isRight);
      idx = Math.floor(idx / 2);
    }
    return { pathElements, pathIndices };
  }
}

/** Groth16 proof formatted for the Solidity verifier. */
export interface SolidityProof {
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
  publicSignals: bigint[];
}

/**
 * Generate a Groth16 withdraw proof. `wasmPath` and `zkeyPath` point at the
 * artifacts produced by `packages/circuits/scripts/build.sh`.
 */
export async function generateWithdrawProof(params: {
  note: DepositNote;
  tree: MerkleTree;
  leafIndex: number;
  recipient: string;
  wasmPath: string;
  zkeyPath: string;
}): Promise<SolidityProof> {
  const { note, tree, leafIndex, recipient, wasmPath, zkeyPath } = params;
  const { pathElements, pathIndices } = tree.proof(leafIndex);

  const input = {
    root: tree.root.toString(),
    nullifierHash: note.nullifierHash.toString(),
    recipient: BigInt(recipient).toString(),
    nullifier: note.nullifier.toString(),
    secret: note.secret.toString(),
    pathElements: pathElements.map((x) => x.toString()),
    pathIndices: pathIndices.map((x) => x.toString()),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

  return {
    a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    // snarkjs returns B in the order Solidity expects once each pair is reversed.
    b: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    publicSignals: publicSignals.map((s: string) => BigInt(s)),
  };
}
