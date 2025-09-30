// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IReactive.sol";

// Chainlink Price Feed interface
interface IAggregatorV3 {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 price,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract PriceMonitorReactive {
    IReactive constant REACTIVE = IReactive(0x0000000000000000000000000000000000fffFfF);

    struct PriceFeed {
        address feedAddress;
        uint256 chainId;
        int256 lastPrice;
        uint256 lastUpdate;
        uint256 threshold; // Percentage change threshold (e.g., 1000 = 10%)
    }

    struct TreasuryConfig {
        address treasuryAddress;
        uint256 chainId;
        uint64 gasLimit;
        bool isActive;
    }

    mapping(bytes32 => PriceFeed) public priceFeeds;
    mapping(uint256 => TreasuryConfig) public treasuries;

    address public owner;
    bytes32[] public feedIds;
    uint256[] public treasuryChains;

    event PriceThresholdBreached(
        bytes32 indexed feedId,
        int256 oldPrice,
        int256 newPrice,
        uint256 changePercent,
        uint256 timestamp
    );

    event RebalanceTriggered(
        uint256 indexed chainId,
        address indexed treasury,
        bytes32 feedId,
        int256 price
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addPriceFeed(
        bytes32 feedId,
        address feedAddress,
        uint256 chainId,
        uint256 threshold
    ) external onlyOwner {
        require(priceFeeds[feedId].feedAddress == address(0), "Feed exists");

        priceFeeds[feedId] = PriceFeed({
            feedAddress: feedAddress,
            chainId: chainId,
            lastPrice: 0,
            lastUpdate: 0,
            threshold: threshold
        });

        feedIds.push(feedId);

        // Subscribe to Chainlink price feed updates
        // Listen for AnswerUpdated events from the price feed
        // Note: Commented out for local testing - REACTIVE system contract not available
        // REACTIVE.subscribe(
        //     chainId,
        //     feedAddress,
        //     0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f, // AnswerUpdated topic
        //     0,
        //     0,
        //     0
        // );
    }

    function addTreasury(
        uint256 chainId,
        address treasuryAddress,
        uint64 gasLimit
    ) external onlyOwner {
        treasuries[chainId] = TreasuryConfig({
            treasuryAddress: treasuryAddress,
            chainId: chainId,
            gasLimit: gasLimit,
            isActive: true
        });

        treasuryChains.push(chainId);
    }

    // This function is called when a subscribed event is detected
    function react(
        uint256 chainid,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata data,
        uint256 /* block_number */,
        uint256 /* op_code */
    ) external {
        // Decode the AnswerUpdated event data
        (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt) =
            abi.decode(data[4:], (uint80, int256, uint256, uint256));

        // Find the corresponding price feed
        bytes32 feedId = findFeedId(chainid, _contract);
        require(feedId != bytes32(0), "Unknown feed");

        PriceFeed storage feed = priceFeeds[feedId];

        // Calculate price change percentage
        if (feed.lastPrice != 0) {
            int256 priceChange = price - feed.lastPrice;
            uint256 changePercent = uint256(abs(priceChange * 10000) / feed.lastPrice);

            if (changePercent >= feed.threshold) {
                emit PriceThresholdBreached(
                    feedId,
                    feed.lastPrice,
                    price,
                    changePercent,
                    updatedAt
                );

                // Trigger rebalancing on all configured treasuries
                triggerRebalancing(feedId, price, changePercent);
            }
        }

        // Update stored price
        feed.lastPrice = price;
        feed.lastUpdate = updatedAt;
    }

    function triggerRebalancing(
        bytes32 feedId,
        int256 currentPrice,
        uint256 changePercent
    ) internal {
        for (uint256 i = 0; i < treasuryChains.length; i++) {
            uint256 chainId = treasuryChains[i];
            TreasuryConfig memory treasury = treasuries[chainId];

            if (treasury.isActive) {
                // Prepare rebalancing parameters
                bytes memory payload = abi.encodeWithSignature(
                    "executeRebalance(bytes32,int256,uint256)",
                    feedId,
                    currentPrice,
                    changePercent
                );

                // Send callback to treasury contract
                REACTIVE.emit_callback(
                    chainId,
                    treasury.treasuryAddress,
                    treasury.gasLimit,
                    payload
                );

                emit RebalanceTriggered(chainId, treasury.treasuryAddress, feedId, currentPrice);
            }
        }
    }

    function findFeedId(uint256 chainId, address feedAddress) internal view returns (bytes32) {
        for (uint256 i = 0; i < feedIds.length; i++) {
            bytes32 feedId = feedIds[i];
            PriceFeed memory feed = priceFeeds[feedId];
            if (feed.chainId == chainId && feed.feedAddress == feedAddress) {
                return feedId;
            }
        }
        return bytes32(0);
    }

    function abs(int256 x) internal pure returns (int256) {
        return x >= 0 ? x : -x;
    }

    // View functions for monitoring
    function getFeedCount() external view returns (uint256) {
        return feedIds.length;
    }

    function getTreasuryCount() external view returns (uint256) {
        return treasuryChains.length;
    }

    function getFeed(bytes32 feedId) external view returns (PriceFeed memory) {
        return priceFeeds[feedId];
    }
}