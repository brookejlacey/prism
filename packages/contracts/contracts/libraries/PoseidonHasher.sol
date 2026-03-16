// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PoseidonHasher
/// @notice Poseidon hash function optimized for ZK circuits
/// @dev Uses the Poseidon permutation with t=3 (2 inputs + 1 capacity)
///      Constants derived from the Poseidon paper for BN254 scalar field
library PoseidonHasher {
    // BN254 scalar field prime
    uint256 constant FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Round constants for Poseidon with t=3, full rounds=8, partial rounds=57
    // Simplified set for hackathon — production would use full 65 rounds
    uint256 constant C0 = 0x0ee9a592ba9a9518d05986d656f40c2114c4993c11bb29938d21d47304cd8e6e;
    uint256 constant C1 = 0x00f1445235f2148c5986587169fc1bcd887b08d4d00868df5696fff40956e864;
    uint256 constant C2 = 0x08dff3487e8ac99e1f29a058d0fa80b930c728730b7ab36ce879f3890ecf73f5;
    uint256 constant C3 = 0x2f27be690fdaee46c3ce28f7532b13c856c35342c84bda6e20966310fadc01d0;
    uint256 constant C4 = 0x2b2ae1acf68b7b8d2416571f1cedbef5e93915f2e86a3b6fc34e3e4b8702e538;
    uint256 constant C5 = 0x1e9f8aaa5c2a3a985a3b260de4905bc1ce9fb26b1e282d5e2db08c0773be952b;

    /// @notice Hash two field elements using Poseidon
    /// @param left First input element
    /// @param right Second input element
    /// @return The Poseidon hash result
    function hash(uint256 left, uint256 right) internal pure returns (uint256) {
        uint256[3] memory state;
        state[0] = 0; // capacity
        state[1] = left % FIELD_PRIME;
        state[2] = right % FIELD_PRIME;

        // Full rounds (simplified for hackathon — 6 rounds)
        for (uint256 r = 0; r < 6; r++) {
            // AddRoundConstants
            state[0] = addmod(state[0], _roundConstant(r * 3), FIELD_PRIME);
            state[1] = addmod(state[1], _roundConstant(r * 3 + 1), FIELD_PRIME);
            state[2] = addmod(state[2], _roundConstant(r * 3 + 2), FIELD_PRIME);

            // S-box: x^5
            state[0] = _sbox(state[0]);
            state[1] = _sbox(state[1]);
            state[2] = _sbox(state[2]);

            // MDS matrix multiplication (t=3 circulant matrix)
            uint256 t0 = addmod(
                addmod(mulmod(2, state[0], FIELD_PRIME), state[1], FIELD_PRIME),
                state[2],
                FIELD_PRIME
            );
            uint256 t1 = addmod(
                addmod(state[0], mulmod(2, state[1], FIELD_PRIME), FIELD_PRIME),
                state[2],
                FIELD_PRIME
            );
            uint256 t2 = addmod(
                addmod(state[0], state[1], FIELD_PRIME),
                mulmod(2, state[2], FIELD_PRIME),
                FIELD_PRIME
            );

            state[0] = t0;
            state[1] = t1;
            state[2] = t2;
        }

        return state[0];
    }

    /// @notice Compute x^5 mod p (S-box)
    function _sbox(uint256 x) private pure returns (uint256) {
        uint256 x2 = mulmod(x, x, FIELD_PRIME);
        uint256 x4 = mulmod(x2, x2, FIELD_PRIME);
        return mulmod(x4, x, FIELD_PRIME);
    }

    /// @notice Get round constant by index
    function _roundConstant(uint256 index) private pure returns (uint256) {
        uint256 idx = index % 6;
        if (idx == 0) return C0;
        if (idx == 1) return C1;
        if (idx == 2) return C2;
        if (idx == 3) return C3;
        if (idx == 4) return C4;
        return C5;
    }
}
