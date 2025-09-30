const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting Local Deployment for Testing\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

  const deployedContracts = {};

  // ============================================
  // 1. Deploy Mock Tokens (WETH, USDC)
  // ============================================
  console.log("📦 Deploying Mock Tokens...");

  const MockToken = await hre.ethers.getContractFactory("MockToken");

  const weth = await MockToken.deploy("Wrapped Ether", "WETH", 18);
  await weth.deployed();
  const wethAddress = weth.address;
  console.log("✅ WETH deployed to:", wethAddress);

  const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
  await usdc.deployed();
  const usdcAddress = usdc.address;
  console.log("✅ USDC deployed to:", usdcAddress);

  deployedContracts.weth = wethAddress;
  deployedContracts.usdc = usdcAddress;

  // ============================================
  // 2. Deploy PriceMonitorReactive
  // ============================================
  console.log("\n📡 Deploying PriceMonitorReactive...");

  const PriceMonitorReactive = await hre.ethers.getContractFactory("PriceMonitorReactive");
  const priceMonitor = await PriceMonitorReactive.deploy();
  await priceMonitor.deployed();
  const priceMonitorAddress = priceMonitor.address;

  console.log("✅ PriceMonitorReactive deployed to:", priceMonitorAddress);
  deployedContracts.priceMonitor = priceMonitorAddress;

  // ============================================
  // 3. Deploy TreasuryVault
  // ============================================
  console.log("\n🏦 Deploying TreasuryVault...");

  // Use deployer address as mock router addresses
  const mockRouter = deployer.address;

  const TreasuryVault = await hre.ethers.getContractFactory("TreasuryVault");
  const treasury = await TreasuryVault.deploy(mockRouter, mockRouter);
  await treasury.deployed();
  const treasuryAddress = treasury.address;

  console.log("✅ TreasuryVault deployed to:", treasuryAddress);
  deployedContracts.treasury = treasuryAddress;

  // ============================================
  // 4. Configure Contracts
  // ============================================
  console.log("\n⚙️  Configuring Contracts...");

  // Configure PriceMonitor
  console.log("  → Adding price feed to PriceMonitor...");
  const ethUsdFeedId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ETH_USD"));

  // For local testing, use deployer address as mock price feed
  const mockPriceFeed = deployer.address;

  const tx1 = await priceMonitor.addPriceFeed(
    ethUsdFeedId,
    mockPriceFeed,
    31337, // Hardhat network chain ID
    1000  // 10% threshold
  );
  await tx1.wait();
  console.log("  ✓ Price feed added");

  // Add treasury to PriceMonitor
  console.log("  → Adding treasury to PriceMonitor...");
  const tx2 = await priceMonitor.addTreasury(
    31337,
    treasuryAddress,
    1000000 // Gas limit
  );
  await tx2.wait();
  console.log("  ✓ Treasury added");

  // Configure TreasuryVault assets
  console.log("  → Configuring treasury assets...");

  const ethAssetId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ETH"));
  const usdcAssetId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("USDC"));

  // Add ETH asset
  const tx3 = await treasury.addAsset(
    ethAssetId,
    hre.ethers.constants.AddressZero, // ETH
    5000, // 50% allocation
    hre.ethers.utils.parseEther("0.1")
  );
  await tx3.wait();
  console.log("  ✓ ETH asset added");

  // Add USDC asset
  const tx4 = await treasury.addAsset(
    usdcAssetId,
    usdcAddress,
    5000, // 50% allocation
    hre.ethers.utils.parseUnits("100", 6)
  );
  await tx4.wait();
  console.log("  ✓ USDC asset added");

  // Grant reactive role to PriceMonitor
  console.log("  → Granting reactive role...");
  const REACTIVE_ROLE = await treasury.REACTIVE_ROLE();
  const tx5 = await treasury.grantRole(REACTIVE_ROLE, priceMonitorAddress);
  await tx5.wait();
  console.log("  ✓ Reactive role granted");

  // ============================================
  // 5. Mint Test Tokens
  // ============================================
  console.log("\n💰 Minting Test Tokens...");

  const tx6 = await weth.mint(deployer.address, hre.ethers.utils.parseEther("100"));
  await tx6.wait();
  console.log("  ✓ Minted 100 WETH");

  const tx7 = await usdc.mint(deployer.address, hre.ethers.utils.parseUnits("10000", 6));
  await tx7.wait();
  console.log("  ✓ Minted 10,000 USDC");

  // Transfer some tokens to treasury
  const tx8 = await weth.transfer(treasuryAddress, hre.ethers.utils.parseEther("10"));
  await tx8.wait();
  console.log("  ✓ Transferred 10 WETH to treasury");

  const tx9 = await usdc.transfer(treasuryAddress, hre.ethers.utils.parseUnits("5000", 6));
  await tx9.wait();
  console.log("  ✓ Transferred 5,000 USDC to treasury");

  // ============================================
  // 6. Save Deployment Info
  // ============================================
  console.log("\n💾 Saving Deployment Info...");

  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      priceMonitor: priceMonitorAddress,
      treasury: treasuryAddress,
      weth: wethAddress,
      usdc: usdcAddress,
      mockRouter: mockRouter,
      mockPriceFeed: mockPriceFeed
    },
    configuration: {
      ethUsdFeedId,
      ethAssetId,
      usdcAssetId,
      rebalanceThreshold: "10%",
      gasLimit: 1000000
    }
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `local_${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`  ✓ Saved to: deployments/${filename}`);

  // Save latest for frontend
  fs.writeFileSync(
    path.join(deploymentsDir, 'local-latest.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`  ✓ Saved to: deployments/local-latest.json`);

  // ============================================
  // 7. Create Frontend .env
  // ============================================
  console.log("\n🔧 Creating Frontend Environment File...");

  const frontendEnv = `# Local Development Contract Addresses
REACT_APP_REACTIVE_PRICE_MONITOR=${priceMonitorAddress}
REACT_APP_SEPOLIA_TREASURY=${treasuryAddress}
REACT_APP_ARBITRUM_TREASURY=${treasuryAddress}

# Local RPC (Hardhat Network)
REACT_APP_LOCAL_RPC=http://localhost:8545
REACT_APP_REACTIVE_RPC=https://mainnet-rpc.rnk.dev/
REACT_APP_SEPOLIA_RPC=https://rpc.sepolia.org
REACT_APP_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

# Local Network Configuration
REACT_APP_USE_LOCAL_NETWORK=true
REACT_APP_ENABLE_TESTNET=true
REACT_APP_ENABLE_MONITORING=true

# Token Addresses (Local)
REACT_APP_WETH_ADDRESS=${wethAddress}
REACT_APP_USDC_ADDRESS=${usdcAddress}`;

  const frontendDir = path.join(__dirname, '..', 'frontend');
  fs.writeFileSync(
    path.join(frontendDir, '.env.local'),
    frontendEnv
  );
  console.log(`  ✓ Created frontend/.env.local`);

  // ============================================
  // 8. Summary
  // ============================================
  console.log("\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ LOCAL DEPLOYMENT COMPLETE!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 Deployment Summary:");
  console.log(`
  Network:           Hardhat Local (Chain ID: 31337)
  Deployer:          ${deployer.address}

  📡 Contracts:
    PriceMonitor:    ${priceMonitorAddress}
    TreasuryVault:   ${treasuryAddress}
    WETH:            ${wethAddress}
    USDC:            ${usdcAddress}

  💰 Test Tokens:
    Deployer WETH:   90 WETH
    Deployer USDC:   5,000 USDC
    Treasury WETH:   10 WETH
    Treasury USDC:   5,000 USDC
  `);

  console.log("\n🚀 Next Steps:");
  console.log("  1. Keep this terminal running (Hardhat node)");
  console.log("  2. Open a new terminal");
  console.log("  3. Run: cd frontend && npm start");
  console.log("  4. Connect MetaMask to localhost:8545");
  console.log("  5. Import this account to MetaMask:");
  console.log(`     ${deployer.address}`);
  console.log("\n  📚 View deployment details: deployments/local-latest.json");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });