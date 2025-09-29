const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TreasuryVault", function () {
  let treasuryVault;
  let mockToken;
  let owner, reactive, governance, emergency;

  const REACTIVE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("REACTIVE_ROLE"));
  const GOVERNANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));
  const EMERGENCY_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_ROLE"));

  beforeEach(async function () {
    [owner, reactive, governance, emergency] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("contracts/test/MockToken.sol:MockToken");
    mockToken = await MockToken.deploy("Mock USDC", "USDC", 6);
    await mockToken.deployed();

    // Deploy TreasuryVault
    const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
    treasuryVault = await TreasuryVault.deploy(
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Mock Uniswap V2 Router
      "0xE592427A0AEce92De3Edee1F18E0157C05861564"  // Mock Uniswap V3 Router
    );
    await treasuryVault.deployed();

    // Grant roles
    await treasuryVault.grantRole(REACTIVE_ROLE, reactive.address);
    await treasuryVault.grantRole(GOVERNANCE_ROLE, governance.address);
    await treasuryVault.grantRole(EMERGENCY_ROLE, emergency.address);
  });

  describe("Deployment", function () {
    it("Should set up roles correctly", async function () {
      expect(await treasuryVault.hasRole(GOVERNANCE_ROLE, owner.address)).to.be.true;
      expect(await treasuryVault.hasRole(REACTIVE_ROLE, reactive.address)).to.be.true;
      expect(await treasuryVault.hasRole(EMERGENCY_ROLE, emergency.address)).to.be.true;
    });

    it("Should not be paused initially", async function () {
      expect(await treasuryVault.isPaused()).to.be.false;
    });

    it("Should have zero assets initially", async function () {
      const [totalValue] = await treasuryVault.getPortfolioState();
      expect(totalValue).to.equal(0);
    });
  });

  describe("Asset Management", function () {
    const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));
    const usdcAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("USDC"));

    it("Should add asset successfully", async function () {
      await expect(treasuryVault.connect(governance).addAsset(
        ethAssetId,
        ethers.constants.AddressZero, // ETH
        5000, // 50%
        ethers.utils.parseEther("0.1")
      )).to.emit(treasuryVault, "AssetAdded");

      const [token, balance, targetAllocation, currentAllocation] =
        await treasuryVault.getAssetAllocation(ethAssetId);

      expect(token).to.equal(ethers.constants.AddressZero);
      expect(targetAllocation).to.equal(5000);
    });

    it("Should not allow duplicate assets", async function () {
      await treasuryVault.connect(governance).addAsset(
        ethAssetId, ethers.constants.AddressZero, 5000, ethers.utils.parseEther("0.1")
      );

      await expect(treasuryVault.connect(governance).addAsset(
        ethAssetId, ethers.constants.AddressZero, 5000, ethers.utils.parseEther("0.1")
      )).to.be.revertedWith("Asset exists");
    });

    it("Should only allow governance to add assets", async function () {
      await expect(treasuryVault.connect(reactive).addAsset(
        ethAssetId, ethers.constants.AddressZero, 5000, ethers.utils.parseEther("0.1")
      )).to.be.revertedWith("Not authorized governance");
    });

    it("Should reject invalid allocation percentages", async function () {
      await expect(treasuryVault.connect(governance).addAsset(
        ethAssetId, ethers.constants.AddressZero, 15000, ethers.utils.parseEther("0.1")
      )).to.be.revertedWith("Invalid allocation");
    });
  });

  describe("Rebalancing Logic", function () {
    const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));
    const usdcAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("USDC"));
    const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));

    beforeEach(async function () {
      // Add assets
      await treasuryVault.connect(governance).addAsset(
        ethAssetId, ethers.constants.AddressZero, 5000, ethers.utils.parseEther("0.1")
      );
      await treasuryVault.connect(governance).addAsset(
        usdcAssetId, mockToken.address, 5000, ethers.utils.parseUnits("100", 6)
      );

      // Fund contract with ETH
      await owner.sendTransaction({
        to: treasuryVault.address,
        value: ethers.utils.parseEther("2.0")
      });

      // Fund contract with USDC
      await mockToken.mint(treasuryVault.address, ethers.utils.parseUnits("4000", 6));
    });

    it("Should execute rebalancing when called by reactive", async function () {
      const currentPrice = ethers.utils.parseUnits("2000", 8);
      const changePercent = 1200; // 12% change

      await expect(treasuryVault.connect(reactive).executeRebalance(
        feedId, currentPrice, changePercent
      )).to.emit(treasuryVault, "RebalanceExecuted");
    });

    it("Should not allow rebalancing when paused", async function () {
      await treasuryVault.connect(emergency).pause();

      const currentPrice = ethers.utils.parseUnits("2000", 8);
      const changePercent = 1200;

      await expect(treasuryVault.connect(reactive).executeRebalance(
        feedId, currentPrice, changePercent
      )).to.be.revertedWith("Contract is paused");
    });

    it("Should enforce cooldown period", async function () {
      const currentPrice = ethers.utils.parseUnits("2000", 8);
      const changePercent = 1200;

      // First rebalancing
      await treasuryVault.connect(reactive).executeRebalance(feedId, currentPrice, changePercent);

      // Second rebalancing should fail due to cooldown
      await expect(treasuryVault.connect(reactive).executeRebalance(
        feedId, currentPrice, changePercent
      )).to.be.revertedWith("Cooldown not passed");
    });

    it("Should only allow reactive role to trigger rebalancing", async function () {
      const currentPrice = ethers.utils.parseUnits("2000", 8);
      const changePercent = 1200;

      await expect(treasuryVault.connect(governance).executeRebalance(
        feedId, currentPrice, changePercent
      )).to.be.revertedWith("Not authorized reactive");
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow emergency role to pause", async function () {
      await expect(treasuryVault.connect(emergency).pause())
        .to.emit(treasuryVault, "EmergencyPaused");

      expect(await treasuryVault.isPaused()).to.be.true;
    });

    it("Should allow governance to unpause", async function () {
      await treasuryVault.connect(emergency).pause();
      await treasuryVault.connect(governance).unpause();

      expect(await treasuryVault.isPaused()).to.be.false;
    });

    it("Should not allow non-emergency role to pause", async function () {
      await expect(treasuryVault.connect(reactive).pause())
        .to.be.revertedWith("AccessControl:");
    });
  });

  describe("Governance Functions", function () {
    const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));

    beforeEach(async function () {
      await treasuryVault.connect(governance).addAsset(
        ethAssetId, ethers.constants.AddressZero, 5000, ethers.utils.parseEther("0.1")
      );
    });

    it("Should allow governance to update asset allocation", async function () {
      await treasuryVault.connect(governance).updateAssetAllocation(ethAssetId, 6000);

      const [, , targetAllocation] = await treasuryVault.getAssetAllocation(ethAssetId);
      expect(targetAllocation).to.equal(6000);
    });

    it("Should not allow invalid allocation updates", async function () {
      await expect(treasuryVault.connect(governance).updateAssetAllocation(ethAssetId, 15000))
        .to.be.revertedWith("Invalid allocation");
    });

    it("Should allow governance to set reactive caller", async function () {
      const newReactive = ethers.Wallet.createRandom().address;
      await treasuryVault.connect(governance).setReactiveCaller(newReactive);

      expect(await treasuryVault.hasRole(REACTIVE_ROLE, newReactive)).to.be.true;
    });
  });

  describe("Portfolio State", function () {
    it("Should track portfolio value correctly", async function () {
      // Add some ETH
      await owner.sendTransaction({
        to: treasuryVault.address,
        value: ethers.utils.parseEther("1.0")
      });

      // Note: In a real implementation, this would calculate USD values
      // For testing, we're using simplified logic
      const [totalValue, lastRebalance, rebalanceCount] =
        await treasuryVault.getPortfolioState();

      expect(rebalanceCount).to.equal(0);
      expect(lastRebalance).to.equal(0);
    });
  });
});