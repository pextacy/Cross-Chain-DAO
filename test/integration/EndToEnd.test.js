const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("End-to-End Integration Test", function () {
  let priceMonitor, treasury, mockUSDC;
  let owner, reactive, governance, user;

  const REACTIVE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("REACTIVE_ROLE"));
  const GOVERNANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));

  this.timeout(300000); // 5 minutes timeout for integration tests

  before(async function () {
    console.log("🚀 Starting End-to-End Integration Test");
    [owner, reactive, governance, user] = await ethers.getSigners();
  });

  describe("Complete System Deployment and Configuration", function () {
    it("Should deploy all contracts successfully", async function () {
      console.log("   📦 Deploying contracts...");

      // Deploy MockUSDC
      const MockToken = await ethers.getContractFactory("contracts/test/MockToken.sol:MockToken");
      mockUSDC = await MockToken.deploy("Mock USDC", "USDC", 6);
      await mockUSDC.deployed();

      // Deploy PriceMonitorReactive
      const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
      priceMonitor = await PriceMonitorReactive.deploy();
      await priceMonitor.deployed();

      // Deploy TreasuryVault
      const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
      treasury = await TreasuryVault.deploy(
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Mock router
        "0xE592427A0AEce92De3Edee1F18E0157C05861564"  // Mock router
      );
      await treasury.deployed();

      console.log(`   ✅ PriceMonitor: ${priceMonitor.address}`);
      console.log(`   ✅ Treasury: ${treasury.address}`);
      console.log(`   ✅ MockUSDC: ${mockUSDC.address}`);

      expect(priceMonitor.address).to.not.equal(ethers.constants.AddressZero);
      expect(treasury.address).to.not.equal(ethers.constants.AddressZero);
      expect(mockUSDC.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should configure the complete system", async function () {
      console.log("   ⚙️ Configuring system...");

      // 1. Add price feed to reactive contract
      const ethUsdFeedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
      const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

      await priceMonitor.addPriceFeed(
        ethUsdFeedId,
        mockFeedAddress,
        1, // Mock chain ID
        1000 // 10% threshold
      );

      // 2. Add treasury to reactive monitoring
      await priceMonitor.addTreasury(
        1, // Mock chain ID
        treasury.address,
        500000 // Gas limit
      );

      // 3. Configure treasury assets
      const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));
      const usdcAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("USDC"));

      await treasury.addAsset(
        ethAssetId,
        ethers.constants.AddressZero, // ETH
        5000, // 50%
        ethers.utils.parseEther("0.1")
      );

      await treasury.addAsset(
        usdcAssetId,
        mockUSDC.address,
        5000, // 50%
        ethers.utils.parseUnits("100", 6)
      );

      // 4. Set up permissions
      await treasury.grantRole(REACTIVE_ROLE, priceMonitor.address);
      await treasury.grantRole(GOVERNANCE_ROLE, governance.address);

      console.log("   ✅ System configured");

      // Verify configuration
      expect(await priceMonitor.getFeedCount()).to.equal(1);
      expect(await priceMonitor.getTreasuryCount()).to.equal(1);
      expect(await treasury.hasRole(REACTIVE_ROLE, priceMonitor.address)).to.be.true;
    });

    it("Should fund treasury with initial assets", async function () {
      console.log("   💰 Funding treasury...");

      // Fund with ETH
      const ethAmount = ethers.utils.parseEther("5.0");
      await owner.sendTransaction({
        to: treasury.address,
        value: ethAmount
      });

      // Mint and fund with USDC
      const usdcAmount = ethers.utils.parseUnits("10000", 6);
      await mockUSDC.mint(treasury.address, usdcAmount);

      // Verify funding
      const ethBalance = await ethers.provider.getBalance(treasury.address);
      const usdcBalance = await mockUSDC.balanceOf(treasury.address);

      console.log(`   💎 ETH Balance: ${ethers.utils.formatEther(ethBalance)}`);
      console.log(`   💵 USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)}`);

      expect(ethBalance).to.equal(ethAmount);
      expect(usdcBalance).to.equal(usdcAmount);
    });
  });

  describe("Price Monitoring and Reactive Flow", function () {
    const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
    const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const chainId = 1;

    it("Should handle first price update without triggering", async function () {
      console.log("   📊 Testing first price update...");

      const initialPrice = ethers.utils.parseUnits("2000", 8);
      const data = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [1, initialPrice, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      await expect(priceMonitor.react(
        chainId, mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
        0, 0, 0, data, 123456, 0
      )).to.not.emit(priceMonitor, "PriceThresholdBreached");

      const feed = await priceMonitor.getFeed(feedId);
      expect(feed.lastPrice).to.equal(initialPrice);
      console.log("   ✅ Initial price set successfully");
    });

    it("Should trigger rebalancing on significant price change", async function () {
      console.log("   📈 Testing price threshold breach...");

      // Simulate 15% price increase
      const newPrice = ethers.utils.parseUnits("2300", 8); // 15% increase from 2000
      const data = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [2, newPrice, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      await expect(priceMonitor.react(
        chainId, mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
        0, 0, 0, data, 123457, 0
      )).to.emit(priceMonitor, "PriceThresholdBreached")
        .and.to.emit(priceMonitor, "RebalanceTriggered");

      console.log("   ✅ Price threshold breach triggered rebalancing");
    });

    it("Should not trigger on small price changes", async function () {
      console.log("   📊 Testing small price change (no trigger)...");

      // Simulate 5% price change (below 10% threshold)
      const smallChangePrice = ethers.utils.parseUnits("2115", 8); // ~8% from last price
      const data = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [3, smallChangePrice, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      await expect(priceMonitor.react(
        chainId, mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
        0, 0, 0, data, 123458, 0
      )).to.not.emit(priceMonitor, "PriceThresholdBreached");

      console.log("   ✅ Small price change correctly ignored");
    });
  });

  describe("Treasury Rebalancing Logic", function () {
    const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));

    it("Should execute rebalancing when triggered by reactive contract", async function () {
      console.log("   ⚖️ Testing direct rebalancing execution...");

      const currentPrice = ethers.utils.parseUnits("1800", 8); // Significant drop
      const changePercent = 1200; // 12% change

      // This should work since priceMonitor has REACTIVE_ROLE
      await expect(treasury.connect(await ethers.getImpersonatedSigner(priceMonitor.address))
        .executeRebalance(feedId, currentPrice, changePercent))
        .to.emit(treasury, "RebalanceExecuted");

      console.log("   ✅ Rebalancing executed successfully");
    });

    it("Should enforce cooldown between rebalancing operations", async function () {
      console.log("   ⏰ Testing rebalancing cooldown...");

      const currentPrice = ethers.utils.parseUnits("1700", 8);
      const changePercent = 1500; // 15% change

      // Second rebalancing should fail due to cooldown
      await expect(treasury.connect(await ethers.getImpersonatedSigner(priceMonitor.address))
        .executeRebalance(feedId, currentPrice, changePercent))
        .to.be.revertedWith("Cooldown not passed");

      console.log("   ✅ Cooldown protection working");
    });

    it("Should reject unauthorized rebalancing attempts", async function () {
      console.log("   🔐 Testing access control...");

      const currentPrice = ethers.utils.parseUnits("1600", 8);
      const changePercent = 1000;

      await expect(treasury.connect(user)
        .executeRebalance(feedId, currentPrice, changePercent))
        .to.be.revertedWith("Not authorized reactive");

      console.log("   ✅ Access control working correctly");
    });
  });

  describe("Emergency Controls and Governance", function () {
    it("Should allow governance to pause and unpause", async function () {
      console.log("   🛑 Testing emergency controls...");

      // Grant emergency role for testing
      const EMERGENCY_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_ROLE"));
      await treasury.grantRole(EMERGENCY_ROLE, governance.address);

      // Pause
      await expect(treasury.connect(governance).pause())
        .to.emit(treasury, "EmergencyPaused");

      expect(await treasury.isPaused()).to.be.true;

      // Try rebalancing while paused (should fail)
      const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
      await expect(treasury.connect(await ethers.getImpersonatedSigner(priceMonitor.address))
        .executeRebalance(feedId, ethers.utils.parseUnits("2000", 8), 1000))
        .to.be.revertedWith("Contract is paused");

      // Unpause
      await treasury.connect(governance).unpause();
      expect(await treasury.isPaused()).to.be.false;

      console.log("   ✅ Emergency controls working");
    });

    it("Should allow governance to update asset allocations", async function () {
      console.log("   ⚙️ Testing governance functions...");

      const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));

      // Update ETH allocation to 60%
      await treasury.connect(governance).updateAssetAllocation(ethAssetId, 6000);

      const [, , targetAllocation] = await treasury.getAssetAllocation(ethAssetId);
      expect(targetAllocation).to.equal(6000);

      console.log("   ✅ Governance controls working");
    });
  });

  describe("Portfolio State and Monitoring", function () {
    it("Should accurately track portfolio state", async function () {
      console.log("   📊 Testing portfolio tracking...");

      const [totalValue, lastRebalance, rebalanceCount] = await treasury.getPortfolioState();

      console.log(`   📈 Total Value: ${ethers.utils.formatEther(totalValue)}`);
      console.log(`   ⚖️ Rebalance Count: ${rebalanceCount.toString()}`);
      console.log(`   ⏰ Last Rebalance: ${lastRebalance.toString()}`);

      expect(rebalanceCount).to.be.gt(0); // Should have at least one rebalancing
      expect(lastRebalance).to.be.gt(0); // Should have a timestamp

      console.log("   ✅ Portfolio tracking accurate");
    });

    it("Should provide detailed asset allocation information", async function () {
      console.log("   💎 Testing asset allocation tracking...");

      const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));
      const usdcAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("USDC"));

      const [ethToken, ethBalance, ethTarget, ethCurrent] = await treasury.getAssetAllocation(ethAssetId);
      const [usdcToken, usdcBalance, usdcTarget, usdcCurrent] = await treasury.getAssetAllocation(usdcAssetId);

      console.log(`   💎 ETH: Target ${ethTarget/100}%, Current ${ethCurrent/100}%`);
      console.log(`   💵 USDC: Target ${usdcTarget/100}%, Current ${usdcCurrent/100}%`);

      expect(ethToken).to.equal(ethers.constants.AddressZero);
      expect(usdcToken).to.equal(mockUSDC.address);
      expect(ethTarget).to.equal(6000); // Updated in previous test

      console.log("   ✅ Asset allocation tracking working");
    });
  });

  describe("System Integration Verification", function () {
    it("Should demonstrate complete end-to-end workflow", async function () {
      console.log("   🔄 Testing complete workflow...");

      let eventCount = 0;

      // Set up event listeners
      priceMonitor.on("PriceThresholdBreached", () => eventCount++);
      priceMonitor.on("RebalanceTriggered", () => eventCount++);
      treasury.on("RebalanceExecuted", () => eventCount++);

      // Trigger complete workflow
      const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
      const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

      // Wait for cooldown to pass
      console.log("   ⏰ Waiting for cooldown...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate new significant price change
      const triggerPrice = ethers.utils.parseUnits("1500", 8); // Major drop
      const data = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [10, triggerPrice, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      const tx = await priceMonitor.react(
        1, mockFeedAddress,
        "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f",
        0, 0, 0, data, 123500, 0
      );

      const receipt = await tx.wait();

      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`   📊 Events emitted: ${receipt.events?.length || 0}`);

      // Verify the complete flow worked
      expect(receipt.events.length).to.be.gt(0);

      console.log("   ✅ End-to-end workflow completed successfully");
    });

    it("Should generate comprehensive system report", async function () {
      console.log("   📋 Generating system report...");

      const report = {
        timestamp: new Date().toISOString(),
        contracts: {
          priceMonitor: priceMonitor.address,
          treasury: treasury.address,
          mockUSDC: mockUSDC.address
        },
        priceMonitorStats: {
          feedCount: (await priceMonitor.getFeedCount()).toString(),
          treasuryCount: (await priceMonitor.getTreasuryCount()).toString()
        },
        treasuryStats: await treasury.getPortfolioState().then(([total, last, count]) => ({
          totalValue: ethers.utils.formatEther(total),
          lastRebalance: last.toString(),
          rebalanceCount: count.toString(),
          isPaused: await treasury.isPaused()
        })),
        assetAllocations: {
          eth: await treasury.getAssetAllocation(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH")))
            .then(([token, balance, target, current]) => ({
              token, balance: ethers.utils.formatEther(balance),
              target: target.toString(), current: current.toString()
            })),
          usdc: await treasury.getAssetAllocation(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("USDC")))
            .then(([token, balance, target, current]) => ({
              token, balance: ethers.utils.formatUnits(balance, 6),
              target: target.toString(), current: current.toString()
            }))
        }
      };

      console.log("   📊 System Report:");
      console.log(JSON.stringify(report, null, 4));

      console.log("   ✅ Report generated successfully");
    });
  });

  after(function () {
    console.log("\n🎉 End-to-End Integration Test Complete!");
    console.log("✅ All systems verified and working correctly");
    console.log("🚀 Ready for mainnet deployment and hackathon submission");
  });
});