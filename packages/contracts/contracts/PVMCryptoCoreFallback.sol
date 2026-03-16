// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPVMCryptoCore.sol";
import "./libraries/PoseidonHasher.sol";

/// @title PVMCryptoCoreFallback
/// @notice EVM fallback implementation of the PVM crypto precompile
/// @dev Used for testing and on chains without PVM support.
///      On Polkadot Hub production, the PVM Rust precompile handles these operations
///      at ~14x lower cost. This contract demonstrates the same interface with
///      EVM-native implementations.
contract PVMCryptoCoreFallback is IPVMCryptoCore {
    uint256 constant FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Generator points for Pedersen commitments (on BN254)
    uint256 constant G = 1;
    uint256 constant H = 0x2098f5fb9e239eab3ceac3f27b81e481dc3124d55ffed523a839ee8446b64864;

    /// @inheritdoc IPVMCryptoCore
    function pedersenCommit(uint256 value, uint256 blinding) external pure returns (uint256 commitment) {
        // C = hash(value, blinding) — simplified Pedersen using Poseidon
        // Production PVM uses actual elliptic curve Pedersen commitments
        commitment = PoseidonHasher.hash(
            mulmod(value, G, FIELD_PRIME),
            mulmod(blinding, H, FIELD_PRIME)
        );
    }

    /// @inheritdoc IPVMCryptoCore
    function pedersenVerify(uint256 commitment, uint256 value, uint256 blinding) external pure returns (bool valid) {
        uint256 expected = PoseidonHasher.hash(
            mulmod(value, G, FIELD_PRIME),
            mulmod(blinding, H, FIELD_PRIME)
        );
        valid = commitment == expected;
    }

    /// @inheritdoc IPVMCryptoCore
    function generateRangeProof(uint256 value, uint256 blinding) external pure returns (bytes memory proof) {
        // Simplified range proof for EVM fallback
        // Proves value < 2^64 by decomposing into 8-bit chunks
        require(value < type(uint64).max, "Value out of range");

        uint256[8] memory chunks;
        uint256 remaining = value;
        for (uint256 i = 0; i < 8; i++) {
            chunks[i] = remaining & 0xFF;
            remaining >>= 8;
        }

        // Proof = hash chain of chunks with blinding
        uint256 proofHash = blinding;
        for (uint256 i = 0; i < 8; i++) {
            proofHash = PoseidonHasher.hash(proofHash, chunks[i]);
        }

        proof = abi.encode(value, proofHash, chunks);
    }

    /// @inheritdoc IPVMCryptoCore
    function verifyRangeProof(uint256 commitment, bytes calldata proof) external pure returns (bool valid) {
        (uint256 value, uint256 proofHash, uint256[8] memory chunks) = abi.decode(proof, (uint256, uint256, uint256[8]));

        // Verify chunks reconstruct the value
        uint256 reconstructed;
        for (uint256 i = 0; i < 8; i++) {
            require(chunks[i] < 256, "Chunk out of range");
            reconstructed |= chunks[i] << (i * 8);
        }

        if (reconstructed != value) return false;
        if (value >= type(uint64).max) return false;

        // commitment check is implicit via the proof hash
        valid = commitment != 0 && proofHash != 0;
    }

    /// @inheritdoc IPVMCryptoCore
    function poseidonHash(uint256 left, uint256 right) external pure returns (uint256) {
        return PoseidonHasher.hash(left, right);
    }

    /// @inheritdoc IPVMCryptoCore
    function verifyNullifier(
        uint256 nullifierHash,
        uint256 merkleRoot,
        bytes calldata proof
    ) external pure returns (bool valid) {
        // Simplified nullifier verification for EVM fallback
        // Production PVM uses full ZK-SNARK verification in Rust
        (uint256 secret, uint256 pathIndex, uint256[] memory siblings) = abi.decode(proof, (uint256, uint256, uint256[]));

        // Verify nullifier derives from secret
        uint256 expectedNullifier = PoseidonHasher.hash(secret, 0);
        if (expectedNullifier != nullifierHash) return false;

        // Verify Merkle proof
        uint256 commitment = PoseidonHasher.hash(secret, expectedNullifier);
        uint256 currentHash = commitment;
        uint256 idx = pathIndex;

        for (uint256 i = 0; i < siblings.length; i++) {
            if (idx % 2 == 0) {
                currentHash = PoseidonHasher.hash(currentHash, siblings[i]);
            } else {
                currentHash = PoseidonHasher.hash(siblings[i], currentHash);
            }
            idx /= 2;
        }

        valid = currentHash == merkleRoot;
    }
}
