// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPVMCryptoCore
/// @notice Interface for the PVM Rust precompile that handles heavy cryptography
/// @dev On Polkadot Hub, this calls into the PVM Rust precompile at a reserved address.
///      On EVM-only chains/testing, a Solidity fallback implementation is used.
interface IPVMCryptoCore {
    /// @notice Generate a Pedersen commitment: C = v*G + r*H
    /// @param value The value to commit to
    /// @param blinding The blinding factor (randomness)
    /// @return commitment The resulting commitment point (compressed)
    function pedersenCommit(uint256 value, uint256 blinding) external pure returns (uint256 commitment);

    /// @notice Verify a Pedersen commitment
    /// @param commitment The commitment to verify
    /// @param value The claimed value
    /// @param blinding The claimed blinding factor
    /// @return valid True if the commitment matches
    function pedersenVerify(uint256 commitment, uint256 value, uint256 blinding) external pure returns (bool valid);

    /// @notice Generate a range proof that value is in [0, 2^64)
    /// @param value The value to prove range for
    /// @param blinding The blinding factor used in the commitment
    /// @return proof The serialized range proof
    function generateRangeProof(uint256 value, uint256 blinding) external pure returns (bytes memory proof);

    /// @notice Verify a range proof
    /// @param commitment The Pedersen commitment
    /// @param proof The serialized range proof
    /// @return valid True if the proof is valid
    function verifyRangeProof(uint256 commitment, bytes calldata proof) external pure returns (bool valid);

    /// @notice Compute Poseidon hash (PVM-accelerated, ~14x cheaper than EVM)
    /// @param left First input
    /// @param right Second input
    /// @return hash The Poseidon hash result
    function poseidonHash(uint256 left, uint256 right) external pure returns (uint256 hash);

    /// @notice Verify a nullifier hasn't been spent
    /// @param nullifierHash The nullifier hash to check
    /// @param merkleRoot The Merkle root to verify against
    /// @param proof The ZK proof of valid nullifier derivation
    /// @return valid True if the nullifier proof is valid
    function verifyNullifier(
        uint256 nullifierHash,
        uint256 merkleRoot,
        bytes calldata proof
    ) external pure returns (bool valid);
}
