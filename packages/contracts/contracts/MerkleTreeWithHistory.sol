// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoseidonT3} from "poseidon-solidity/PoseidonT3.sol";

/// @title MerkleTreeWithHistory
/// @notice Fixed-depth incremental Merkle tree with a rolling root history,
///         hashed with circomlib-compatible Poseidon (t=3) so the on-chain tree
///         matches the `withdraw.circom` membership circuit exactly.
/// @dev Adapted from the Tornado Cash design, with MiMC swapped for Poseidon.
contract MerkleTreeWithHistory {
    uint256 internal constant FIELD_SIZE =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // keccak256("prism") % FIELD_SIZE — nothing-up-my-sleeve empty-leaf value.
    uint256 internal constant ZERO_VALUE =
        20516652017007664073629451204112493887988919387149521211184607474122666234029;

    uint32 public immutable levels;
    uint32 public constant ROOT_HISTORY_SIZE = 30;

    // Cached zero subtree roots, zeros[0] = ZERO_VALUE, zeros[i] = H(zeros[i-1], zeros[i-1]).
    uint256[] internal cachedZeros;
    mapping(uint256 => uint256) public filledSubtrees;
    mapping(uint256 => uint256) public roots;

    uint32 public currentRootIndex;
    uint32 public nextIndex;

    constructor(uint32 _levels) {
        require(_levels > 0, "levels must be > 0");
        require(_levels < 32, "levels must be < 32");
        levels = _levels;

        uint256 z = ZERO_VALUE;
        cachedZeros.push(z);
        for (uint32 i = 0; i < _levels; i++) {
            filledSubtrees[i] = z;
            z = PoseidonT3.hash([z, z]);
            cachedZeros.push(z);
        }
        // roots[0] is the root of a fully-empty tree (cachedZeros[levels]).
        roots[0] = z;
    }

    /// @notice Hash two field elements with Poseidon(t=3).
    function hashLeftRight(uint256 left, uint256 right) public pure returns (uint256) {
        require(left < FIELD_SIZE, "left out of field");
        require(right < FIELD_SIZE, "right out of field");
        return PoseidonT3.hash([left, right]);
    }

    function zeros(uint256 i) public view returns (uint256) {
        return cachedZeros[i];
    }

    /// @notice Insert a leaf and return its index.
    function _insert(uint256 leaf) internal returns (uint32 index) {
        uint32 _nextIndex = nextIndex;
        require(_nextIndex != uint32(2) ** levels, "Merkle tree is full");
        require(leaf < FIELD_SIZE, "leaf out of field");

        uint32 currentIndex = _nextIndex;
        uint256 currentLevelHash = leaf;
        uint256 left;
        uint256 right;

        for (uint32 i = 0; i < levels; i++) {
            if (currentIndex % 2 == 0) {
                left = currentLevelHash;
                right = cachedZeros[i];
                filledSubtrees[i] = currentLevelHash;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }
            currentLevelHash = PoseidonT3.hash([left, right]);
            currentIndex /= 2;
        }

        uint32 newRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        currentRootIndex = newRootIndex;
        roots[newRootIndex] = currentLevelHash;
        nextIndex = _nextIndex + 1;
        return _nextIndex;
    }

    /// @notice Whether `_root` is in the recent root history.
    function isKnownRoot(uint256 _root) public view returns (bool) {
        if (_root == 0) return false;
        uint32 _currentRootIndex = currentRootIndex;
        uint32 i = _currentRootIndex;
        do {
            if (_root == roots[i]) return true;
            if (i == 0) i = ROOT_HISTORY_SIZE;
            i--;
        } while (i != _currentRootIndex);
        return false;
    }

    function getLastRoot() public view returns (uint256) {
        return roots[currentRootIndex];
    }
}
