// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MerkleTreeWithHistory.sol";

interface IVerifier {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[3] calldata input
    ) external view returns (bool);
}

/// @title PrismVault
/// @notice A fixed-denomination shielded pool. Depositors add a commitment to a
///         Poseidon Merkle tree; withdrawers prove, in zero knowledge, that they
///         know the opening of some commitment in the tree without revealing
///         which one. The deposit/withdraw link is never published on-chain.
/// @dev The withdraw proof is a Groth16 proof over `withdraw.circom`. Public
///      inputs: [merkleRoot, nullifierHash, recipient]. The secret/nullifier
///      remain private witnesses and never touch the chain.
contract PrismVault is MerkleTreeWithHistory, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IVerifier public immutable verifier;
    IERC20 public immutable token;
    uint256 public immutable denomination;

    mapping(uint256 => bool) public commitments;
    mapping(uint256 => bool) public nullifierHashes;

    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    event Deposit(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address indexed to, uint256 nullifierHash);

    error InvalidCommitment();
    error CommitmentAlreadyExists();
    error UnknownMerkleRoot();
    error NullifierAlreadySpent();
    error InvalidWithdrawProof();
    error InvalidDenomination();
    error ZeroAddress();

    constructor(
        address _verifier,
        address _token,
        uint256 _denomination,
        uint32 _levels
    ) MerkleTreeWithHistory(_levels) {
        if (_verifier == address(0) || _token == address(0)) revert ZeroAddress();
        if (_denomination == 0) revert InvalidDenomination();
        verifier = IVerifier(_verifier);
        token = IERC20(_token);
        denomination = _denomination;
    }

    /// @notice Deposit `denomination` tokens against a commitment.
    /// @param commitment Poseidon(nullifier, secret), computed client-side.
    function deposit(uint256 commitment) external nonReentrant {
        if (commitment == 0 || commitment >= FIELD_SIZE) revert InvalidCommitment();
        if (commitments[commitment]) revert CommitmentAlreadyExists();

        commitments[commitment] = true;
        uint32 leafIndex = _insert(commitment);
        totalDeposits++;

        token.safeTransferFrom(msg.sender, address(this), denomination);

        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    /// @notice Withdraw `denomination` tokens to `recipient` by proving membership
    ///         in zero knowledge. Reveals only the nullifierHash (to block reuse).
    /// @param a,b,c Groth16 proof points.
    /// @param root The Merkle root the proof was built against (must be recent).
    /// @param nullifierHash The spent-marker derived from the deposit nullifier.
    /// @param recipient Where to send the tokens (bound into the proof).
    function withdraw(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint256 root,
        uint256 nullifierHash,
        address recipient
    ) external nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadySpent();
        if (!isKnownRoot(root)) revert UnknownMerkleRoot();

        uint[3] memory input = [root, nullifierHash, uint256(uint160(recipient))];
        if (!verifier.verifyProof(a, b, c, input)) revert InvalidWithdrawProof();

        nullifierHashes[nullifierHash] = true;
        totalWithdrawals++;

        token.safeTransfer(recipient, denomination);

        emit Withdrawal(recipient, nullifierHash);
    }

    function isSpent(uint256 nullifierHash) external view returns (bool) {
        return nullifierHashes[nullifierHash];
    }

    function getStats()
        external
        view
        returns (uint256 deposits, uint256 withdrawals, uint256 poolBalance, uint256 anonymitySet)
    {
        deposits = totalDeposits;
        withdrawals = totalWithdrawals;
        poolBalance = token.balanceOf(address(this));
        anonymitySet = totalDeposits;
    }
}
