// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PrismVault.sol";

/// @title PrismRouter
/// @notice Front door for the shielded pools. Indexes vaults by (token,
///         denomination) so a caller deposits/withdraws against the right
///         anonymity set, and exposes an optimal-denomination split for an
///         arbitrary amount.
contract PrismRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event VaultRegistered(address indexed token, uint256 denomination, address vault);
    event PrivateDeposit(address indexed token, uint256 denomination, uint256 commitment);

    // token => denomination => vault
    mapping(address => mapping(uint256 => address)) public vaults;
    address[] public allVaults;
    mapping(address => uint256[]) public denominations;
    address[] public supportedTokens;
    mapping(address => bool) public isSupported;

    uint256 public totalPrivateDeposits;

    constructor() Ownable(msg.sender) {}

    /// @notice Register a deployed PrismVault for a (token, denomination) pair.
    function registerVault(address token, uint256 denomination, address vault) external onlyOwner {
        require(vaults[token][denomination] == address(0), "Vault already exists");
        require(vault != address(0), "Zero vault");
        vaults[token][denomination] = vault;
        allVaults.push(vault);

        if (!isSupported[token]) {
            isSupported[token] = true;
            supportedTokens.push(token);
        }
        denominations[token].push(denomination);

        emit VaultRegistered(token, denomination, vault);
    }

    /// @notice Deposit through the router into the matching vault.
    /// @dev The router pulls tokens from the caller and deposits on their behalf,
    ///      so the caller approves the router rather than each vault.
    function deposit(address token, uint256 denomination, uint256 commitment) external nonReentrant {
        address vault = vaults[token][denomination];
        require(vault != address(0), "No vault for this pair");

        IERC20(token).safeTransferFrom(msg.sender, address(this), denomination);
        IERC20(token).forceApprove(vault, denomination);
        PrismVault(vault).deposit(commitment);

        totalPrivateDeposits++;
        emit PrivateDeposit(token, denomination, commitment);
    }

    /// @notice Split `amount` into the fewest fixed-denomination deposits.
    function getOptimalSplit(
        address token,
        uint256 amount
    ) external view returns (uint256[] memory denoms, uint256[] memory counts) {
        uint256[] memory tokenDenoms = denominations[token];
        denoms = new uint256[](tokenDenoms.length);
        counts = new uint256[](tokenDenoms.length);

        uint256 remaining = amount;
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
}
