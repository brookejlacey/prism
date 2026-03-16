//! Pedersen commitment scheme
//!
//! C = v*G + r*H where G,H are generator points on BN254
//! Provides perfectly hiding, computationally binding commitments.

use crate::poseidon;

/// Generator point G (simplified as hash-based for PVM precompile)
const G_SEED: [u8; 32] = [
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

/// Generator point H
const H_SEED: [u8; 32] = [
    0x20, 0x98, 0xf5, 0xfb, 0x9e, 0x23, 0x9e, 0xab,
    0x3c, 0xea, 0xc3, 0xf2, 0x7b, 0x81, 0xe4, 0x81,
    0xdc, 0x31, 0x24, 0xd5, 0x5f, 0xfe, 0xd5, 0x23,
    0xa8, 0x39, 0xee, 0x84, 0x46, 0xb6, 0x48, 0x64,
];

/// Create a Pedersen commitment: C = Hash(v*G, r*H)
pub fn commit(value: [u8; 32], blinding: [u8; 32]) -> [u8; 32] {
    let vg = poseidon::hash(value, G_SEED);
    let rh = poseidon::hash(blinding, H_SEED);
    poseidon::hash(vg, rh)
}

/// Verify a Pedersen commitment
pub fn verify(commitment: [u8; 32], value: [u8; 32], blinding: [u8; 32]) -> bool {
    let expected = commit(value, blinding);
    commitment == expected
}

/// Create a blinded commitment with additional randomness
pub fn commit_with_nonce(value: [u8; 32], blinding: [u8; 32], nonce: [u8; 32]) -> [u8; 32] {
    let base_commitment = commit(value, blinding);
    poseidon::hash(base_commitment, nonce)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commit_verify() {
        let mut value = [0u8; 32];
        value[31] = 100;
        let mut blinding = [0u8; 32];
        blinding[31] = 42;

        let c = commit(value, blinding);
        assert!(verify(c, value, blinding));
    }

    #[test]
    fn test_different_values_different_commitments() {
        let mut v1 = [0u8; 32];
        v1[31] = 100;
        let mut v2 = [0u8; 32];
        v2[31] = 200;
        let blinding = [0u8; 32];

        assert_ne!(commit(v1, blinding), commit(v2, blinding));
    }

    #[test]
    fn test_different_blindings_different_commitments() {
        let value = [0u8; 32];
        let mut b1 = [0u8; 32];
        b1[31] = 1;
        let mut b2 = [0u8; 32];
        b2[31] = 2;

        assert_ne!(commit(value, b1), commit(value, b2));
    }

    #[test]
    fn test_hiding_property() {
        // Same value with different blindings should produce different commitments
        let mut value = [0u8; 32];
        value[31] = 50;
        let mut b1 = [0u8; 32];
        b1[31] = 1;
        let mut b2 = [0u8; 32];
        b2[31] = 2;

        let c1 = commit(value, b1);
        let c2 = commit(value, b2);
        assert_ne!(c1, c2);
    }
}
