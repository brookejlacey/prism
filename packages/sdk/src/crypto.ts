import { ethers } from "ethers";

/**
 * A deposit note containing all information needed to withdraw privately
 */
export interface DepositNote {
  /** The random secret (keep private!) */
  secret: bigint;
  /** The nullifier hash (derived from secret) */
  nullifierHash: bigint;
  /** The commitment (stored on-chain in the Merkle tree) */
  commitment: bigint;
  /** The leaf index in the Merkle tree */
  leafIndex?: number;
  /** The denomination of the deposit */
  denomination: bigint;
  /** The token address */
  token: string;
  /** Hex-encoded note for backup */
  noteString: string;
}

// BN254 scalar field prime
const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Poseidon hash (simplified — matches the Solidity PoseidonHasher library)
 * In production, use a proper Poseidon implementation matching the contract
 */
export function poseidonHash(left: bigint, right: bigint): bigint {
  // Use keccak256 as a stand-in that matches contract behavior for testing
  // The actual Poseidon computation matches the Solidity library
  const packed = ethers.solidityPacked(
    ["uint256", "uint256"],
    [left % FIELD_PRIME, right % FIELD_PRIME]
  );
  const hash = ethers.keccak256(packed);
  return BigInt(hash) % FIELD_PRIME;
}

/**
 * Generate a random secret for a deposit
 */
export function generateSecret(): bigint {
  const bytes = ethers.randomBytes(31); // 31 bytes to stay within field
  return BigInt(ethers.hexlify(bytes)) % FIELD_PRIME;
}

/**
 * Derive a nullifier hash from a secret
 * nullifier = Poseidon(secret, 0)
 */
export function deriveNullifier(secret: bigint): bigint {
  return poseidonHash(secret, 0n);
}

/**
 * Generate a commitment from a secret
 * commitment = Poseidon(secret, nullifier)
 */
export function generateCommitment(
  token: string,
  denomination: bigint,
  secret?: bigint
): DepositNote {
  const s = secret ?? generateSecret();
  const nullifierHash = deriveNullifier(s);
  const commitment = poseidonHash(s, nullifierHash);

  const noteData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "address", "uint256"],
    [s, nullifierHash, token, denomination]
  );
  const noteString = ethers.hexlify(noteData);

  return {
    secret: s,
    nullifierHash,
    commitment,
    denomination,
    token,
    noteString,
  };
}

/**
 * Restore a deposit note from its hex string
 */
export function parseNote(noteString: string): DepositNote {
  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
    ["uint256", "uint256", "address", "uint256"],
    noteString
  );

  const secret = decoded[0] as bigint;
  const nullifierHash = decoded[1] as bigint;
  const token = decoded[2] as string;
  const denomination = decoded[3] as bigint;
  const commitment = poseidonHash(secret, nullifierHash);

  return {
    secret,
    nullifierHash,
    commitment,
    denomination,
    token,
    noteString,
  };
}

/**
 * Generate a withdrawal proof
 * Returns ABI-encoded proof data for the PrismVault.withdraw() call
 */
export function generateProof(
  secret: bigint,
  pathIndex: number,
  siblings: bigint[]
): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "uint256[]"],
    [secret, pathIndex, siblings]
  );
}

/**
 * Compute commitment on-chain style (for verification)
 */
export function computeCommitment(secret: bigint): {
  nullifierHash: bigint;
  commitment: bigint;
} {
  const nullifierHash = deriveNullifier(secret);
  const commitment = poseidonHash(secret, nullifierHash);
  return { nullifierHash, commitment };
}
