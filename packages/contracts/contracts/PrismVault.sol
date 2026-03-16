// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/PoseidonHasher.sol";
import "./libraries/MerkleTree.sol";
import "./interfaces/IPVMCryptoCore.sol";

/// @title PrismVault
/// @notice Private deposit/withdraw vault using commitment schemes
/// @dev Track 1 (EVM) core contract — users deposit tokens with a commitment,
///      then withdraw using a nullifier proof without revealing the link between
///      deposit and withdrawal addresses.
contract PrismVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MerkleTree for MerkleTree.Tree;

    // --- Events ---
    event Deposit(uint256 indexed commitment, uint256 leafIndex, uint256 timestamp);
    event Withdrawal(address indexed to, uint256 nullifierHash, uint256 amount);
    event PrivateSwapInitiated(uint256 indexed swapId, uint256 commitment);
    event PrivateSwapCompleted(uint256 indexed swapId);

    // --- Errors ---
    error InvalidCommitment();
    error CommitmentAlreadyExists();
    error InvalidMerkleRoot();
    error NullifierAlreadySpent();
    error InvalidWithdrawProof();
    error InvalidDenomination();
    error InsufficientBalance();
    error ZeroAddress();

    // --- State ---
    IPVMCryptoCore public immutable pvmCore;
    IERC20 public immutable token;
    uint256 public immutable denomination;

    MerkleTree.Tree private commitmentTree;
    mapping(uint256 => bool) public commitments;
    mapping(uint256 => bool) public nullifiers;

    // Swap state
    uint256 public nextSwapId;
    struct PrivateSwap {
        uint256 inputCommitment;
        uint256 outputCommitment;
        address targetToken;
        uint256 minOutput;
        bool completed;
    }
    mapping(uint256 => PrivateSwap) public swaps;

    // Stats
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    constructor(address _token, uint256 _denomination, address _pvmCore) {
        if (_token == address(0) || _pvmCore == address(0)) revert ZeroAddress();
        if (_denomination == 0) revert InvalidDenomination();

        token = IERC20(_token);
        denomination = _denomination;
        pvmCore = IPVMCryptoCore(_pvmCore);
        commitmentTree.init();
    }

    /// @notice Deposit tokens with a privacy commitment
    /// @param commitment The Poseidon hash commitment = H(secret, nullifier)
    function deposit(uint256 commitment) external nonReentrant {
        if (commitment == 0) revert InvalidCommitment();
        if (commitments[commitment]) revert CommitmentAlreadyExists();

        commitments[commitment] = true;
        uint256 leafIndex = commitmentTree.insert(commitment);
        totalDeposits++;

        token.safeTransferFrom(msg.sender, address(this), denomination);

        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    /// @notice Deposit native token (DOT on Polkadot Hub) with a privacy commitment
    /// @param commitment The Poseidon hash commitment
    function depositNative(uint256 commitment) external payable nonReentrant {
        if (commitment == 0) revert InvalidCommitment();
        if (commitments[commitment]) revert CommitmentAlreadyExists();
        if (msg.value != denomination) revert InvalidDenomination();

        commitments[commitment] = true;
        uint256 leafIndex = commitmentTree.insert(commitment);
        totalDeposits++;

        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    /// @notice Withdraw tokens using a nullifier proof (breaks the deposit-withdrawal link)
    /// @param recipient The address to send tokens to
    /// @param nullifierHash The nullifier hash (derived from deposit secret)
    /// @param root The Merkle root to prove against
    /// @param proof The ZK proof data (verified by PVM on Polkadot Hub)
    function withdraw(
        address recipient,
        uint256 nullifierHash,
        uint256 root,
        bytes calldata proof
    ) external nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (nullifiers[nullifierHash]) revert NullifierAlreadySpent();
        if (!commitmentTree.isKnownRoot(root)) revert InvalidMerkleRoot();

        // Verify proof via PVM crypto core (Rust precompile on Polkadot Hub)
        bool valid = pvmCore.verifyNullifier(nullifierHash, root, proof);
        if (!valid) revert InvalidWithdrawProof();

        nullifiers[nullifierHash] = true;
        totalWithdrawals++;

        token.safeTransfer(recipient, denomination);

        emit Withdrawal(recipient, nullifierHash, denomination);
    }

    /// @notice Withdraw native tokens using a nullifier proof
    function withdrawNative(
        address payable recipient,
        uint256 nullifierHash,
        uint256 root,
        bytes calldata proof
    ) external nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (nullifiers[nullifierHash]) revert NullifierAlreadySpent();
        if (!commitmentTree.isKnownRoot(root)) revert InvalidMerkleRoot();

        bool valid = pvmCore.verifyNullifier(nullifierHash, root, proof);
        if (!valid) revert InvalidWithdrawProof();

        nullifiers[nullifierHash] = true;
        totalWithdrawals++;

        (bool success, ) = recipient.call{value: denomination}("");
        require(success, "Native transfer failed");

        emit Withdrawal(recipient, nullifierHash, denomination);
    }

    /// @notice Initiate a private swap (deposit side)
    /// @param inputCommitment Commitment to the input tokens
    /// @param targetToken The token to swap into
    /// @param minOutput Minimum output amount
    /// @return swapId The swap identifier
    function initiatePrivateSwap(
        uint256 inputCommitment,
        address targetToken,
        uint256 minOutput
    ) external nonReentrant returns (uint256 swapId) {
        if (inputCommitment == 0) revert InvalidCommitment();

        swapId = nextSwapId++;
        swaps[swapId] = PrivateSwap({
            inputCommitment: inputCommitment,
            outputCommitment: 0,
            targetToken: targetToken,
            minOutput: minOutput,
            completed: false
        });

        emit PrivateSwapInitiated(swapId, inputCommitment);
    }

    /// @notice Complete a private swap with output commitment
    /// @param swapId The swap to complete
    /// @param outputCommitment Commitment to the output tokens
    /// @param nullifierHash Nullifier for the input commitment
    /// @param root Merkle root
    /// @param proof ZK proof
    function completePrivateSwap(
        uint256 swapId,
        uint256 outputCommitment,
        uint256 nullifierHash,
        uint256 root,
        bytes calldata proof
    ) external nonReentrant {
        PrivateSwap storage swap = swaps[swapId];
        require(!swap.completed, "Swap already completed");
        require(swap.inputCommitment != 0, "Swap does not exist");

        if (nullifiers[nullifierHash]) revert NullifierAlreadySpent();
        if (!commitmentTree.isKnownRoot(root)) revert InvalidMerkleRoot();

        bool valid = pvmCore.verifyNullifier(nullifierHash, root, proof);
        if (!valid) revert InvalidWithdrawProof();

        nullifiers[nullifierHash] = true;
        swap.outputCommitment = outputCommitment;
        swap.completed = true;

        // Insert output commitment into tree for the receiver
        commitments[outputCommitment] = true;
        commitmentTree.insert(outputCommitment);

        emit PrivateSwapCompleted(swapId);
    }

    // --- View functions ---

    function getMerkleRoot() external view returns (uint256) {
        return commitmentTree.root;
    }

    function getNextIndex() external view returns (uint256) {
        return commitmentTree.nextIndex;
    }

    function isSpent(uint256 nullifierHash) external view returns (bool) {
        return nullifiers[nullifierHash];
    }

    function isCommitted(uint256 commitment) external view returns (bool) {
        return commitments[commitment];
    }

    function getStats() external view returns (uint256 deposits, uint256 withdrawals, uint256 poolBalance) {
        deposits = totalDeposits;
        withdrawals = totalWithdrawals;
        poolBalance = token.balanceOf(address(this));
    }

    receive() external payable {}
}
