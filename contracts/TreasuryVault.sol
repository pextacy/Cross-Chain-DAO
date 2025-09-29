// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TreasuryVault is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant REACTIVE_ROLE = keccak256("REACTIVE_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    struct AssetConfig {
        address token;
        uint256 targetAllocation; // Percentage (e.g., 5000 = 50%)
        uint256 minBalance;
        bool isActive;
    }

    struct RebalanceAction {
        address tokenFrom;
        address tokenTo;
        uint256 amount;
        uint256 timestamp;
        bytes32 triggeredBy;
    }

    mapping(bytes32 => AssetConfig) public assetConfigs;
    mapping(address => uint256) public assetBalances;

    bytes32[] public assetIds;
    RebalanceAction[] public rebalanceHistory;

    // DEX integration
    address public uniswapV2Router;
    address public uniswapV3Router;

    // State management
    bool public isPaused;
    uint256 public totalValue;
    uint256 public lastRebalanceTimestamp;
    uint256 public rebalanceCooldown = 1 hours;

    event AssetAdded(bytes32 indexed assetId, address indexed token, uint256 targetAllocation);
    event RebalanceExecuted(
        bytes32 indexed feedId,
        address indexed tokenFrom,
        address indexed tokenTo,
        uint256 amount,
        int256 triggerPrice
    );
    event EmergencyPaused(address indexed by, uint256 timestamp);
    event GovernanceAction(address indexed by, string action, bytes data);

    modifier onlyReactive() {
        require(hasRole(REACTIVE_ROLE, msg.sender), "Not authorized reactive");
        _;
    }

    modifier onlyGovernance() {
        require(hasRole(GOVERNANCE_ROLE, msg.sender), "Not authorized governance");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }

    modifier cooldownPassed() {
        require(
            block.timestamp >= lastRebalanceTimestamp + rebalanceCooldown,
            "Cooldown not passed"
        );
        _;
    }

    constructor(
        address _uniswapV2Router,
        address _uniswapV3Router
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);

        uniswapV2Router = _uniswapV2Router;
        uniswapV3Router = _uniswapV3Router;
    }

    function addAsset(
        bytes32 assetId,
        address token,
        uint256 targetAllocation,
        uint256 minBalance
    ) external onlyGovernance {
        require(assetConfigs[assetId].token == address(0), "Asset exists");
        require(targetAllocation <= 10000, "Invalid allocation");

        assetConfigs[assetId] = AssetConfig({
            token: token,
            targetAllocation: targetAllocation,
            minBalance: minBalance,
            isActive: true
        });

        assetIds.push(assetId);
        emit AssetAdded(assetId, token, targetAllocation);
    }

    // Main function called by Reactive Network
    function executeRebalance(
        bytes32 feedId,
        int256 currentPrice,
        uint256 changePercent
    ) external onlyReactive whenNotPaused cooldownPassed nonReentrant {
        // Update total portfolio value
        updatePortfolioValue();

        // Determine rebalancing strategy based on price change
        RebalanceStrategy memory strategy = calculateRebalanceStrategy(
            feedId,
            currentPrice,
            changePercent
        );

        if (strategy.shouldRebalance) {
            executeSwap(
                strategy.fromToken,
                strategy.toToken,
                strategy.amount,
                feedId,
                currentPrice
            );

            lastRebalanceTimestamp = block.timestamp;
        }
    }

    struct RebalanceStrategy {
        bool shouldRebalance;
        address fromToken;
        address toToken;
        uint256 amount;
    }

    function calculateRebalanceStrategy(
        bytes32 feedId,
        int256 currentPrice,
        uint256 changePercent
    ) internal view returns (RebalanceStrategy memory) {
        // Simple strategy: if ETH drops significantly, convert some to USDC
        // If ETH rises significantly, convert some USDC to ETH

        address weth = getAssetByFeedId(feedId);
        address usdc = getStablecoin();

        if (weth == address(0) || usdc == address(0)) {
            return RebalanceStrategy(false, address(0), address(0), 0);
        }

        uint256 currentEthBalance = assetBalances[weth];
        uint256 currentUsdcBalance = assetBalances[usdc];
        uint256 totalPortfolio = currentEthBalance + currentUsdcBalance;

        if (totalPortfolio == 0) {
            return RebalanceStrategy(false, address(0), address(0), 0);
        }

        // Calculate current ETH allocation percentage
        uint256 currentEthAllocation = (currentEthBalance * 10000) / totalPortfolio;
        uint256 targetEthAllocation = assetConfigs[keccak256("ETH")].targetAllocation;

        // If ETH dropped and we're overallocated, sell some ETH for USDC
        if (changePercent >= 1000 && currentEthAllocation > targetEthAllocation + 500) { // 5% threshold
            uint256 rebalanceAmount = (currentEthBalance * (currentEthAllocation - targetEthAllocation)) / 10000;
            return RebalanceStrategy(true, weth, usdc, rebalanceAmount);
        }

        // If ETH rose and we're underallocated, buy ETH with USDC
        if (changePercent >= 1000 && currentEthAllocation < targetEthAllocation - 500) { // 5% threshold
            uint256 targetEthValue = (totalPortfolio * targetEthAllocation) / 10000;
            uint256 additionalEthNeeded = targetEthValue - currentEthBalance;
            return RebalanceStrategy(true, usdc, weth, additionalEthNeeded);
        }

        return RebalanceStrategy(false, address(0), address(0), 0);
    }

    function executeSwap(
        address tokenFrom,
        address tokenTo,
        uint256 amount,
        bytes32 feedId,
        int256 triggerPrice
    ) internal {
        require(tokenFrom != address(0) && tokenTo != address(0), "Invalid tokens");
        require(amount > 0, "Invalid amount");
        require(IERC20(tokenFrom).balanceOf(address(this)) >= amount, "Insufficient balance");

        // For simplicity, implement basic swap logic
        // In production, this would integrate with DEX aggregators

        IERC20(tokenFrom).safeTransfer(uniswapV2Router, amount);

        // Record the rebalance action
        rebalanceHistory.push(RebalanceAction({
            tokenFrom: tokenFrom,
            tokenTo: tokenTo,
            amount: amount,
            timestamp: block.timestamp,
            triggeredBy: feedId
        }));

        // Update balances
        assetBalances[tokenFrom] -= amount;
        // Note: In real implementation, you'd get the actual output amount from the swap
        assetBalances[tokenTo] += amount; // Simplified

        emit RebalanceExecuted(feedId, tokenFrom, tokenTo, amount, triggerPrice);
    }

    function updatePortfolioValue() internal {
        uint256 newTotalValue = 0;
        for (uint256 i = 0; i < assetIds.length; i++) {
            bytes32 assetId = assetIds[i];
            AssetConfig memory config = assetConfigs[assetId];
            if (config.isActive) {
                uint256 balance = IERC20(config.token).balanceOf(address(this));
                assetBalances[config.token] = balance;
                // In production, convert to USD value using price feeds
                newTotalValue += balance;
            }
        }
        totalValue = newTotalValue;
    }

    // Helper functions
    function getAssetByFeedId(bytes32 feedId) internal pure returns (address) {
        // Map feed IDs to token addresses
        if (feedId == keccak256("ETH_USD")) {
            return 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH on mainnet
        }
        return address(0);
    }

    function getStablecoin() internal pure returns (address) {
        return 0xA0b86a33E6417fAcff1a42c5FD8F0B1B34f7bdB; // USDC on mainnet
    }

    // Emergency functions
    function pause() external onlyRole(EMERGENCY_ROLE) {
        isPaused = true;
        emit EmergencyPaused(msg.sender, block.timestamp);
    }

    function unpause() external onlyGovernance {
        isPaused = false;
    }

    // Governance functions
    function updateAssetAllocation(
        bytes32 assetId,
        uint256 newAllocation
    ) external onlyGovernance {
        require(newAllocation <= 10000, "Invalid allocation");
        assetConfigs[assetId].targetAllocation = newAllocation;
    }

    function setReactiveCaller(address caller) external onlyGovernance {
        _grantRole(REACTIVE_ROLE, caller);
    }

    // View functions
    function getPortfolioState() external view returns (
        uint256 _totalValue,
        uint256 _lastRebalance,
        uint256 _rebalanceCount
    ) {
        return (totalValue, lastRebalanceTimestamp, rebalanceHistory.length);
    }

    function getAssetAllocation(bytes32 assetId) external view returns (
        address token,
        uint256 balance,
        uint256 targetAllocation,
        uint256 currentAllocation
    ) {
        AssetConfig memory config = assetConfigs[assetId];
        uint256 balance_ = assetBalances[config.token];
        uint256 currentAllocation_ = totalValue > 0 ? (balance_ * 10000) / totalValue : 0;

        return (config.token, balance_, config.targetAllocation, currentAllocation_);
    }

    // Receive ETH
    receive() external payable {
        assetBalances[address(0)] += msg.value;
    }
}