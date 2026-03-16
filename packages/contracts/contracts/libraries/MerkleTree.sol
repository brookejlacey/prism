// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PoseidonHasher.sol";

/// @title MerkleTree
/// @notice Incremental Merkle tree for commitment storage
/// @dev Uses Poseidon hashing for ZK-friendly proofs
library MerkleTree {
    uint256 constant TREE_DEPTH = 20;
    uint256 constant MAX_LEAVES = 2 ** 20; // ~1M commitments

    struct Tree {
        uint256 nextIndex;
        uint256 root;
        mapping(uint256 => uint256) filledSubtrees;
        mapping(uint256 => uint256) roots; // historical roots
        uint256 rootCount;
    }

    /// @notice Get zero values for each level of the tree
    function zeros(uint256 level) internal pure returns (uint256) {
        if (level == 0) return 0;
        // Precomputed: zeros[i] = hash(zeros[i-1], zeros[i-1])
        if (level == 1) return PoseidonHasher.hash(0, 0);
        if (level == 2) return PoseidonHasher.hash(PoseidonHasher.hash(0, 0), PoseidonHasher.hash(0, 0));
        // For deeper levels, compute iteratively
        uint256 current = 0;
        for (uint256 i = 0; i < level; i++) {
            current = PoseidonHasher.hash(current, current);
        }
        return current;
    }

    /// @notice Initialize the tree with zero values
    function init(Tree storage tree) internal {
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            tree.filledSubtrees[i] = zeros(i);
        }
        tree.root = zeros(TREE_DEPTH);
        tree.roots[0] = tree.root;
        tree.rootCount = 1;
    }

    /// @notice Insert a leaf into the tree
    /// @param tree The tree storage
    /// @param leaf The commitment to insert
    /// @return index The index of the inserted leaf
    function insert(Tree storage tree, uint256 leaf) internal returns (uint256 index) {
        require(tree.nextIndex < MAX_LEAVES, "MerkleTree: tree is full");

        index = tree.nextIndex;
        uint256 currentIndex = index;
        uint256 currentHash = leaf;

        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            if (currentIndex % 2 == 0) {
                tree.filledSubtrees[i] = currentHash;
                currentHash = PoseidonHasher.hash(currentHash, zeros(i));
            } else {
                currentHash = PoseidonHasher.hash(tree.filledSubtrees[i], currentHash);
            }
            currentIndex /= 2;
        }

        tree.root = currentHash;
        tree.roots[tree.rootCount] = currentHash;
        tree.rootCount++;
        tree.nextIndex++;
    }

    /// @notice Check if a root is known (current or historical)
    function isKnownRoot(Tree storage tree, uint256 root) internal view returns (bool) {
        for (uint256 i = 0; i < tree.rootCount; i++) {
            if (tree.roots[i] == root) return true;
        }
        return false;
    }
}
