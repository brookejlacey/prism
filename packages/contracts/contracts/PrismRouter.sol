// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PrismVault.sol";
import "./interfaces/IPVMCryptoCore.sol";

/// @title PrismRouter
/// @notice Routes private transactions across multiple vaults and token pairs
/// @dev Aggregates liquidity across denomination-specific vaults and provides
///      a unified interface for private DeFi operations.
contract PrismRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Events ---
    event VaultRegistered(address indexed token, uint256 denomination, address vault);
    event PrivateTransfer(uint256 indexed transferId, address indexed token, uint256 timestamp);
    event CrossVMSwapInitiated(uint256 indexed swapId, address fromToken, address toToken);

    // --- State ---
    IPVMCryptoCore public pvmCore;

    // token => denomination => vault
    mapping(address => mapping(uint256 => address)) public vaults;
    // All registered vault addresses
    address[] public allVaults;
    // Supported denominations per token
    mapping(address => uint256[]) public denominations;
    // Supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public isSupported;

    // Transfer tracking
    uint256 public totalPrivateTransfers;

    // Standard denomination tiers (in token decimals)
    uint256[] public standardDenominations;

    constructor(address _pvmCore) Ownable(msg.sender) {
        pvmCore = IPVMCryptoCore(_pvmCore);
        // Standard tiers: 0.1, 1, 10, 100 (scaled by 1e18)
        standardDenominations.push(0.1 ether);
        standardDenominations.push(1 ether);
        standardDenominations.push(10 ether);
        standardDenominations.push(100 ether);
    }

    /// @notice Register a new vault for a token/denomination pair
    /// @param token The ERC20 token address
    /// @param denomination The fixed deposit denomination
    /// @param vault The PrismVault address
    function registerVault(address token, uint256 denomination, address vault) external onlyOwner {
        require(vaults[token][denomination] == address(0), "Vault already exists");
        vaults[token][denomination] = vault;
        allVaults.push(vault);

        if (!isSupported[token]) {
            isSupported[token] = true;
            supportedTokens.push(token);
        }
        denominations[token].push(denomination);

        emit VaultRegistered(token, denomination, vault);
    }

    /// @notice Deploy vaults for a token with all standard denominations
    /// @param token The ERC20 token address
    function deployStandardVaults(address token) external onlyOwner {
        for (uint256 i = 0; i < standardDenominations.length; i++) {
            uint256 denom = standardDenominations[i];
            if (vaults[token][denom] == address(0)) {
                PrismVault vault = new PrismVault(token, denom, address(pvmCore));
                vaults[token][denom] = address(vault);
                allVaults.push(address(vault));
                denominations[token].push(denom);
            }
        }

        if (!isSupported[token]) {
            isSupported[token] = true;
            supportedTokens.push(token);
        }
    }

    /// @notice Private deposit through the router
    /// @param token The token to deposit
    /// @param denomination The vault denomination to use
    /// @param commitment The privacy commitment
    function deposit(address token, uint256 denomination, uint256 commitment) external nonReentrant {
        address vault = vaults[token][denomination];
        require(vault != address(0), "No vault for this pair");

        IERC20(token).safeTransferFrom(msg.sender, address(this), denomination);
        IERC20(token).approve(vault, denomination);
        PrismVault(payable(vault)).deposit(commitment);

        totalPrivateTransfers++;
        emit PrivateTransfer(totalPrivateTransfers, token, block.timestamp);
    }

    /// @notice Private withdrawal through the router
    /// @param token The token to withdraw
    /// @param denomination The vault denomination
    /// @param recipient Withdrawal address
    /// @param nullifierHash The nullifier hash
    /// @param root Merkle root
    /// @param proof ZK proof data
    function withdraw(
        address token,
        uint256 denomination,
        address recipient,
        uint256 nullifierHash,
        uint256 root,
        bytes calldata proof
    ) external nonReentrant {
        address vault = vaults[token][denomination];
        require(vault != address(0), "No vault for this pair");

        PrismVault(payable(vault)).withdraw(recipient, nullifierHash, root, proof);
    }

    /// @notice Get optimal denomination split for a given amount
    /// @dev Splits an amount into the fewest vault deposits
    /// @param token The token address
    /// @param amount The total amount to deposit
    /// @return denoms The denominations to use
    /// @return counts The number of deposits per denomination
    function getOptimalSplit(
        address token,
        uint256 amount
    ) external view returns (uint256[] memory denoms, uint256[] memory counts) {
        uint256[] memory tokenDenoms = denominations[token];
        denoms = new uint256[](tokenDenoms.length);
        counts = new uint256[](tokenDenoms.length);

        uint256 remaining = amount;

        // Greedy: largest denominations first
        for (uint256 i = tokenDenoms.length; i > 0; i--) {
            uint256 denom = tokenDenoms[i - 1];
            if (denom <= remaining) {
                uint256 count = remaining / denom;
                denoms[i - 1] = denom;
                counts[i - 1] = count;
                remaining -= count * denom;
            }
        }
    }

    // --- View functions ---

    function getVault(address token, uint256 denomination) external view returns (address) {
        return vaults[token][denomination];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    function getDenominations(address token) external view returns (uint256[] memory) {
        return denominations[token];
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function getProtocolStats() external view returns (
        uint256 totalVaults,
        uint256 totalTokens,
        uint256 transfers
    ) {
        totalVaults = allVaults.length;
        totalTokens = supportedTokens.length;
        transfers = totalPrivateTransfers;
    }
}
