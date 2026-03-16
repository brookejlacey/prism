// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPVMCryptoCore.sol";
import "./libraries/PoseidonHasher.sol";

/// @title CrossVMBridge
/// @notice Bridges private transactions between EVM and PVM on Polkadot Hub
/// @dev Enables shielded cross-VM operations by coordinating commitments
///      across both virtual machines. Uses XCM for cross-chain private transfers.
contract CrossVMBridge is Ownable, ReentrancyGuard {

    // --- Events ---
    event CrossVMCommitmentLocked(uint256 indexed commitmentId, uint256 commitment, uint8 targetVM);
    event CrossVMCommitmentReleased(uint256 indexed commitmentId, uint256 nullifierHash);
    event XCMPrivateTransferInitiated(uint256 indexed transferId, uint32 destParaId, uint256 commitment);
    event XCMPrivateTransferCompleted(uint256 indexed transferId);

    // --- Types ---
    enum VMTarget { EVM, PVM }

    struct CrossVMCommitment {
        uint256 commitment;
        VMTarget sourceVM;
        VMTarget targetVM;
        uint256 amount;
        address token;
        bool released;
        uint256 timestamp;
    }

    struct XCMTransfer {
        uint256 commitment;
        uint32 destParaId;
        bytes destAddress;
        uint256 amount;
        bool completed;
        uint256 timestamp;
    }

    // --- State ---
    IPVMCryptoCore public pvmCore;

    mapping(uint256 => CrossVMCommitment) public crossVMCommitments;
    uint256 public nextCommitmentId;

    mapping(uint256 => XCMTransfer) public xcmTransfers;
    uint256 public nextTransferId;

    // Trusted relayers that can confirm cross-VM operations
    mapping(address => bool) public trustedRelayers;

    // Stats
    uint256 public totalCrossVMOperations;
    uint256 public totalXCMTransfers;

    constructor(address _pvmCore) Ownable(msg.sender) {
        pvmCore = IPVMCryptoCore(_pvmCore);
    }

    /// @notice Lock a commitment for cross-VM transfer (EVM → PVM)
    /// @param commitment The privacy commitment
    /// @param targetVM The target virtual machine (0=EVM, 1=PVM)
    /// @param amount The amount being transferred
    /// @param token The token address
    /// @return commitmentId The cross-VM commitment ID
    function lockForCrossVM(
        uint256 commitment,
        VMTarget targetVM,
        uint256 amount,
        address token
    ) external nonReentrant returns (uint256 commitmentId) {
        require(commitment != 0, "Invalid commitment");

        commitmentId = nextCommitmentId++;
        crossVMCommitments[commitmentId] = CrossVMCommitment({
            commitment: commitment,
            sourceVM: VMTarget.EVM,
            targetVM: targetVM,
            amount: amount,
            token: token,
            released: false,
            timestamp: block.timestamp
        });

        totalCrossVMOperations++;
        emit CrossVMCommitmentLocked(commitmentId, commitment, uint8(targetVM));
    }

    /// @notice Release a cross-VM commitment (called by trusted relayer after PVM confirmation)
    /// @param commitmentId The commitment to release
    /// @param nullifierHash The nullifier hash proving the PVM side completed
    function releaseCrossVM(
        uint256 commitmentId,
        uint256 nullifierHash
    ) external nonReentrant {
        require(trustedRelayers[msg.sender], "Not a trusted relayer");

        CrossVMCommitment storage c = crossVMCommitments[commitmentId];
        require(!c.released, "Already released");
        require(c.commitment != 0, "Commitment does not exist");

        c.released = true;
        emit CrossVMCommitmentReleased(commitmentId, nullifierHash);
    }

    /// @notice Initiate a private cross-chain transfer via XCM
    /// @param commitment The privacy commitment for the transferred tokens
    /// @param destParaId The destination parachain ID
    /// @param destAddress The destination address (encoded for the target chain)
    /// @param amount The amount to transfer
    /// @return transferId The XCM transfer ID
    function initiateXCMPrivateTransfer(
        uint256 commitment,
        uint32 destParaId,
        bytes calldata destAddress,
        uint256 amount
    ) external payable nonReentrant returns (uint256 transferId) {
        require(commitment != 0, "Invalid commitment");
        require(destAddress.length > 0, "Invalid destination");

        transferId = nextTransferId++;
        xcmTransfers[transferId] = XCMTransfer({
            commitment: commitment,
            destParaId: destParaId,
            destAddress: destAddress,
            amount: amount,
            completed: false,
            timestamp: block.timestamp
        });

        totalXCMTransfers++;

        // In production, this would call the XCM precompile to send a cross-chain message
        // For Polkadot Hub, the XCM precompile is at a reserved address
        // _sendXCMMessage(destParaId, commitment, amount, destAddress);

        emit XCMPrivateTransferInitiated(transferId, destParaId, commitment);
    }

    /// @notice Confirm an XCM transfer was received on the destination chain
    /// @param transferId The transfer to confirm
    function confirmXCMTransfer(uint256 transferId) external {
        require(trustedRelayers[msg.sender], "Not a trusted relayer");

        XCMTransfer storage t = xcmTransfers[transferId];
        require(!t.completed, "Already completed");
        require(t.commitment != 0, "Transfer does not exist");

        t.completed = true;
        emit XCMPrivateTransferCompleted(transferId);
    }

    // --- Admin ---

    function addRelayer(address relayer) external onlyOwner {
        trustedRelayers[relayer] = true;
    }

    function removeRelayer(address relayer) external onlyOwner {
        trustedRelayers[relayer] = false;
    }

    function updatePVMCore(address _pvmCore) external onlyOwner {
        pvmCore = IPVMCryptoCore(_pvmCore);
    }

    // --- View functions ---

    function getCrossVMCommitment(uint256 id) external view returns (CrossVMCommitment memory) {
        return crossVMCommitments[id];
    }

    function getXCMTransfer(uint256 id) external view returns (XCMTransfer memory) {
        return xcmTransfers[id];
    }

    function getStats() external view returns (uint256 crossVM, uint256 xcm) {
        crossVM = totalCrossVMOperations;
        xcm = totalXCMTransfers;
    }
}
