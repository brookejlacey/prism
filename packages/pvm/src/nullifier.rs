//! Nullifier derivation and verification
//!
//! Nullifiers prevent double-spending while maintaining privacy.
//! Each deposit's secret produces a unique nullifier that reveals nothing about the deposit.

use crate::poseidon;

/// Derive a nullifier from a secret
/// nullifier = Poseidon(secret, 0)
pub fn derive_nullifier(secret: &[u8; 32]) -> [u8; 32] {
    poseidon::hash(*secret, [0u8; 32])
}

/// Derive a commitment from a secret and its nullifier
/// commitment = Poseidon(secret, nullifier)
pub fn derive_commitment(secret: &[u8; 32]) -> [u8; 32] {
    let nullifier = derive_nullifier(secret);
    poseidon::hash(*secret, nullifier)
}

/// Verify a nullifier against a Merkle proof
pub fn verify(
    nullifier_hash: &[u8; 32],
    secret: &[u8; 32],
    merkle_root: &[u8; 32],
    path_index: usize,
    siblings: &[[u8; 32]],
) -> bool {
    // 1. Verify nullifier derives from secret
    let expected_nullifier = derive_nullifier(secret);
    if *nullifier_hash != expected_nullifier {
        return false;
    }

    // 2. Derive commitment
    let commitment = poseidon::hash(*secret, expected_nullifier);

    // 3. Verify Merkle proof
    let mut current = commitment;
    let mut idx = path_index;
    for sibling in siblings {
        if idx % 2 == 0 {
            current = poseidon::hash(current, *sibling);
        } else {
            current = poseidon::hash(*sibling, current);
        }
        idx /= 2;
    }

    current == *merkle_root
}

/// ABI-decode and verify a nullifier proof (called from precompile dispatch)
pub fn verify_from_abi(data: &[u8]) -> bool {
    if data.len() < 96 {
        return false;
    }

    let mut nullifier_hash = [0u8; 32];
    nullifier_hash.copy_from_slice(&data[..32]);

    let mut merkle_root = [0u8; 32];
    merkle_root.copy_from_slice(&data[32..64]);

    // The proof bytes contain: secret (32) + path_index (32) + siblings (32 * n)
    // Offset and length from ABI encoding
    if data.len() < 128 {
        return false;
    }

    let proof_offset = u64::from_be_bytes(data[88..96].try_into().unwrap_or([0u8; 8])) as usize;
    if proof_offset + 32 > data.len() {
        return false;
    }

    let proof_start = 64 + proof_offset;
    if proof_start + 32 > data.len() {
        return false;
    }

    let proof_len = u64::from_be_bytes(
        data[proof_start + 24..proof_start + 32]
            .try_into()
            .unwrap_or([0u8; 8]),
    ) as usize;

    let proof_data_start = proof_start + 32;
    if proof_data_start + proof_len > data.len() {
        return false;
    }

    let proof_data = &data[proof_data_start..proof_data_start + proof_len];
    if proof_data.len() < 64 {
        return false;
    }

    let mut secret = [0u8; 32];
    secret.copy_from_slice(&proof_data[..32]);

    let mut path_index_bytes = [0u8; 8];
    path_index_bytes.copy_from_slice(&proof_data[56..64]);
    let path_index = u64::from_be_bytes(path_index_bytes) as usize;

    let siblings_data = &proof_data[64..];
    let num_siblings = siblings_data.len() / 32;
    let siblings: Vec<[u8; 32]> = (0..num_siblings)
        .map(|i| {
            let mut s = [0u8; 32];
            s.copy_from_slice(&siblings_data[i * 32..(i + 1) * 32]);
            s
        })
        .collect();

    verify(&nullifier_hash, &secret, &merkle_root, path_index, &siblings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::merkle::MerkleTree;

    #[test]
    fn test_nullifier_deterministic() {
        let mut secret = [0u8; 32];
        secret[31] = 42;
        assert_eq!(derive_nullifier(&secret), derive_nullifier(&secret));
    }

    #[test]
    fn test_different_secrets_different_nullifiers() {
        let mut s1 = [0u8; 32];
        s1[31] = 1;
        let mut s2 = [0u8; 32];
        s2[31] = 2;
        assert_ne!(derive_nullifier(&s1), derive_nullifier(&s2));
    }

    #[test]
    fn test_full_verify_flow() {
        // Create secret and derive commitment
        let mut secret = [0u8; 32];
        secret[31] = 99;
        let commitment = derive_commitment(&secret);
        let nullifier_hash = derive_nullifier(&secret);

        // Build a tree with this commitment
        let leaves = vec![commitment];
        let tree = MerkleTree::new(&leaves);
        let proof = tree.generate_proof(0);
        let root = tree.root();

        // Verify
        assert!(verify(&nullifier_hash, &secret, &root, 0, &proof));
    }

    #[test]
    fn test_wrong_secret_fails() {
        let mut secret = [0u8; 32];
        secret[31] = 99;
        let commitment = derive_commitment(&secret);
        let nullifier_hash = derive_nullifier(&secret);

        let leaves = vec![commitment];
        let tree = MerkleTree::new(&leaves);
        let proof = tree.generate_proof(0);
        let root = tree.root();

        let mut wrong_secret = [0u8; 32];
        wrong_secret[31] = 100;
        assert!(!verify(&nullifier_hash, &wrong_secret, &root, 0, &proof));
    }
}
