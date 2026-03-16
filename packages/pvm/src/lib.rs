//! Prism PVM Crypto Core
//!
//! Rust precompile implementations for Polkadot Hub's PolkaVM.
//! These provide ~14x cheaper cryptographic operations compared to EVM Solidity equivalents.
//!
//! When compiled to RISC-V and deployed on PVM, these functions are callable
//! from Solidity contracts via the cross-VM precompile interface.

pub mod poseidon;
pub mod pedersen;
pub mod merkle;
pub mod nullifier;
pub mod range_proof;

/// Precompile entry point — dispatches calls from EVM Solidity contracts
/// Protocol: first 4 bytes = function selector, remaining = ABI-encoded arguments
#[no_mangle]
pub extern "C" fn call(input: &[u8]) -> Vec<u8> {
    if input.len() < 4 {
        return vec![0u8; 32]; // return zero on invalid input
    }

    let selector = &input[..4];
    let data = &input[4..];

    match selector {
        // poseidonHash(uint256,uint256) -> uint256
        [0x3f, 0x21, 0xd8, 0x4e] => {
            if data.len() < 64 {
                return vec![0u8; 32];
            }
            let left = decode_uint256(&data[..32]);
            let right = decode_uint256(&data[32..64]);
            let result = poseidon::hash(left, right);
            encode_uint256(result)
        }

        // pedersenCommit(uint256,uint256) -> uint256
        [0xa1, 0x2d, 0xf3, 0x40] => {
            if data.len() < 64 {
                return vec![0u8; 32];
            }
            let value = decode_uint256(&data[..32]);
            let blinding = decode_uint256(&data[32..64]);
            let commitment = pedersen::commit(value, blinding);
            encode_uint256(commitment)
        }

        // pedersenVerify(uint256,uint256,uint256) -> bool
        [0xb2, 0x3e, 0xf4, 0x51] => {
            if data.len() < 96 {
                return vec![0u8; 32];
            }
            let commitment = decode_uint256(&data[..32]);
            let value = decode_uint256(&data[32..64]);
            let blinding = decode_uint256(&data[64..96]);
            let valid = pedersen::verify(commitment, value, blinding);
            encode_bool(valid)
        }

        // verifyNullifier(uint256,uint256,bytes) -> bool
        [0xc3, 0x4f, 0xd5, 0x62] => {
            let valid = nullifier::verify_from_abi(data);
            encode_bool(valid)
        }

        // verifyRangeProof(uint256,bytes) -> bool
        [0xd4, 0x50, 0xe6, 0x73] => {
            let valid = range_proof::verify_from_abi(data);
            encode_bool(valid)
        }

        _ => vec![0u8; 32], // unknown selector
    }
}

fn decode_uint256(data: &[u8]) -> [u8; 32] {
    let mut result = [0u8; 32];
    let len = data.len().min(32);
    result[32 - len..].copy_from_slice(&data[..len]);
    result
}

fn encode_uint256(value: [u8; 32]) -> Vec<u8> {
    value.to_vec()
}

fn encode_bool(value: bool) -> Vec<u8> {
    let mut result = vec![0u8; 32];
    if value {
        result[31] = 1;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_poseidon_hash_deterministic() {
        let a = [0u8; 32];
        let b = [0u8; 32];
        let h1 = poseidon::hash(a, b);
        let h2 = poseidon::hash(a, b);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_poseidon_hash_different_inputs() {
        let a = [0u8; 32];
        let mut b = [0u8; 32];
        b[31] = 1;
        let h1 = poseidon::hash(a, a);
        let h2 = poseidon::hash(a, b);
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_pedersen_commit_verify() {
        let mut value = [0u8; 32];
        value[31] = 100;
        let mut blinding = [0u8; 32];
        blinding[31] = 42;
        let commitment = pedersen::commit(value, blinding);
        assert!(pedersen::verify(commitment, value, blinding));
    }

    #[test]
    fn test_pedersen_invalid_verify() {
        let mut value = [0u8; 32];
        value[31] = 100;
        let mut blinding = [0u8; 32];
        blinding[31] = 42;
        let commitment = pedersen::commit(value, blinding);

        let mut wrong_value = [0u8; 32];
        wrong_value[31] = 101;
        assert!(!pedersen::verify(commitment, wrong_value, blinding));
    }

    #[test]
    fn test_merkle_proof() {
        let leaves: Vec<[u8; 32]> = (0..4u8)
            .map(|i| {
                let mut leaf = [0u8; 32];
                leaf[31] = i;
                leaf
            })
            .collect();

        let tree = merkle::MerkleTree::new(&leaves);
        let proof = tree.generate_proof(0);
        assert!(tree.verify_proof(0, &leaves[0], &proof));
    }

    #[test]
    fn test_nullifier_derivation() {
        let mut secret = [0u8; 32];
        secret[31] = 99;
        let nullifier = nullifier::derive_nullifier(&secret);
        let nullifier2 = nullifier::derive_nullifier(&secret);
        assert_eq!(nullifier, nullifier2);
    }

    #[test]
    fn test_range_proof() {
        let mut value = [0u8; 32];
        value[31] = 255; // valid: < 2^64
        let mut blinding = [0u8; 32];
        blinding[31] = 1;
        let proof = range_proof::generate(value, blinding);
        assert!(range_proof::verify(value, &proof));
    }
}
