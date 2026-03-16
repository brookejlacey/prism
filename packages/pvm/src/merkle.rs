//! Merkle tree implementation using Poseidon hashing
//!
//! Provides efficient proof generation and verification for the commitment tree.

use crate::poseidon;

pub const TREE_DEPTH: usize = 20;

pub struct MerkleTree {
    leaves: Vec<[u8; 32]>,
    layers: Vec<Vec<[u8; 32]>>,
}

impl MerkleTree {
    /// Build a Merkle tree from leaves
    pub fn new(leaves: &[[u8; 32]]) -> Self {
        let mut padded = leaves.to_vec();
        // Pad to next power of 2
        let next_pow2 = padded.len().next_power_of_two();
        while padded.len() < next_pow2 {
            padded.push([0u8; 32]);
        }

        let mut layers = vec![padded.clone()];
        let mut current = padded;

        while current.len() > 1 {
            let mut next = Vec::with_capacity(current.len() / 2);
            for chunk in current.chunks(2) {
                next.push(poseidon::hash(chunk[0], chunk[1]));
            }
            layers.push(next.clone());
            current = next;
        }

        MerkleTree {
            leaves: leaves.to_vec(),
            layers,
        }
    }

    /// Get the Merkle root
    pub fn root(&self) -> [u8; 32] {
        self.layers.last().map(|l| l[0]).unwrap_or([0u8; 32])
    }

    /// Generate a Merkle proof for a leaf at given index
    pub fn generate_proof(&self, index: usize) -> Vec<[u8; 32]> {
        let mut proof = Vec::new();
        let mut idx = index;

        for layer in &self.layers[..self.layers.len() - 1] {
            let sibling_idx = if idx % 2 == 0 { idx + 1 } else { idx - 1 };
            if sibling_idx < layer.len() {
                proof.push(layer[sibling_idx]);
            } else {
                proof.push([0u8; 32]);
            }
            idx /= 2;
        }

        proof
    }

    /// Verify a Merkle proof
    pub fn verify_proof(&self, index: usize, leaf: &[u8; 32], proof: &[[u8; 32]]) -> bool {
        let mut current = *leaf;
        let mut idx = index;

        for sibling in proof {
            if idx % 2 == 0 {
                current = poseidon::hash(current, *sibling);
            } else {
                current = poseidon::hash(*sibling, current);
            }
            idx /= 2;
        }

        current == self.root()
    }

    /// Get the number of leaves
    pub fn len(&self) -> usize {
        self.leaves.len()
    }

    pub fn is_empty(&self) -> bool {
        self.leaves.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_leaf(val: u8) -> [u8; 32] {
        let mut leaf = [0u8; 32];
        leaf[31] = val;
        leaf
    }

    #[test]
    fn test_single_leaf() {
        let leaves = vec![make_leaf(1)];
        let tree = MerkleTree::new(&leaves);
        let root = tree.root();
        assert_ne!(root, [0u8; 32]);
    }

    #[test]
    fn test_proof_verification() {
        let leaves: Vec<[u8; 32]> = (0..8).map(make_leaf).collect();
        let tree = MerkleTree::new(&leaves);

        for i in 0..8 {
            let proof = tree.generate_proof(i);
            assert!(tree.verify_proof(i, &leaves[i], &proof));
        }
    }

    #[test]
    fn test_invalid_proof() {
        let leaves: Vec<[u8; 32]> = (0..4).map(make_leaf).collect();
        let tree = MerkleTree::new(&leaves);

        let proof = tree.generate_proof(0);
        // Wrong leaf should fail
        assert!(!tree.verify_proof(0, &make_leaf(99), &proof));
    }

    #[test]
    fn test_deterministic_root() {
        let leaves: Vec<[u8; 32]> = (0..4).map(make_leaf).collect();
        let tree1 = MerkleTree::new(&leaves);
        let tree2 = MerkleTree::new(&leaves);
        assert_eq!(tree1.root(), tree2.root());
    }
}
