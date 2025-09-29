const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceMonitorReactive", function () {
  let priceMonitor;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
    priceMonitor = await PriceMonitorReactive.deploy();
    await priceMonitor.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await priceMonitor.owner()).to.equal(owner.address);
    });

    it("Should start with no feeds", async function () {
      expect(await priceMonitor.getFeedCount()).to.equal(0);
    });

    it("Should start with no treasuries", async function () {
      expect(await priceMonitor.getTreasuryCount()).to.equal(0);
    });
  });

  describe("Price Feed Management", function () {
    const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
    const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const chainId = 11155111;
    const threshold = 1000; // 10%

    it("Should add price feed successfully", async function () {
      await expect(priceMonitor.addPriceFeed(feedId, mockFeedAddress, chainId, threshold))
        .to.emit(priceMonitor, "Subscribe");

      const feed = await priceMonitor.getFeed(feedId);
      expect(feed.feedAddress).to.equal(mockFeedAddress);
      expect(feed.chainId).to.equal(chainId);
      expect(feed.threshold).to.equal(threshold);

      expect(await priceMonitor.getFeedCount()).to.equal(1);
    });

    it("Should not allow duplicate feeds", async function () {
      await priceMonitor.addPriceFeed(feedId, mockFeedAddress, chainId, threshold);

      await expect(priceMonitor.addPriceFeed(feedId, mockFeedAddress, chainId, threshold))
        .to.be.revertedWith("Feed exists");
    });

    it("Should only allow owner to add feeds", async function () {
      await expect(priceMonitor.connect(addr1).addPriceFeed(feedId, mockFeedAddress, chainId, threshold))
        .to.be.revertedWith("Only owner");
    });
  });

  describe("Treasury Management", function () {
    const chainId = 11155111;
    const treasuryAddress = "0x1234567890123456789012345678901234567890";
    const gasLimit = 500000;

    it("Should add treasury successfully", async function () {
      await priceMonitor.addTreasury(chainId, treasuryAddress, gasLimit);

      const treasury = await priceMonitor.treasuries(chainId);
      expect(treasury.treasuryAddress).to.equal(treasuryAddress);
      expect(treasury.chainId).to.equal(chainId);
      expect(treasury.gasLimit).to.equal(gasLimit);
      expect(treasury.isActive).to.be.true;

      expect(await priceMonitor.getTreasuryCount()).to.equal(1);
    });

    it("Should only allow owner to add treasury", async function () {
      await expect(priceMonitor.connect(addr1).addTreasury(chainId, treasuryAddress, gasLimit))
        .to.be.revertedWith("Only owner");
    });
  });

  describe("Price Reaction Logic", function () {
    const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
    const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const chainId = 11155111;
    const threshold = 1000; // 10%

    beforeEach(async function () {
      await priceMonitor.addPriceFeed(feedId, mockFeedAddress, chainId, threshold);
      await priceMonitor.addTreasury(chainId, addr1.address, 500000);
    });

    it("Should handle first price update", async function () {
      const roundId = 1;
      const price = ethers.utils.parseUnits("2000", 8); // $2000
      const startedAt = Math.floor(Date.now() / 1000);
      const updatedAt = startedAt;

      const data = ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [roundId, price, startedAt, updatedAt]
      );

      // Add function selector (first 4 bytes)
      const fullData = "0x00000000" + data.slice(2);

      await priceMonitor.react(
        chainId,
        mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f", // AnswerUpdated topic
        0, 0, 0,
        fullData,
        123456, // block number
        0 // op code
      );

      const feed = await priceMonitor.getFeed(feedId);
      expect(feed.lastPrice).to.equal(price);
      expect(feed.lastUpdate).to.equal(updatedAt);
    });

    it("Should trigger rebalancing on significant price change", async function () {
      // Set initial price
      const initialPrice = ethers.utils.parseUnits("2000", 8);
      const initialData = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [1, initialPrice, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      await priceMonitor.react(chainId, mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
        0, 0, 0, initialData, 123456, 0);

      // Trigger significant price change (15% drop)
      const newPrice = ethers.utils.parseUnits("1700", 8); // 15% drop
      const newData = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [2, newPrice, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      await expect(priceMonitor.react(chainId, mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
        0, 0, 0, newData, 123457, 0))
        .to.emit(priceMonitor, "PriceThresholdBreached")
        .to.emit(priceMonitor, "RebalanceTriggered");
    });
  });
});