const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Cross-Chain DAO Treasury deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

  // Network-specific configurations
  const networkConfigs = {
    reactive: {
      chainId: 1597,
      name: "Reactive Mainnet",
      deployReactive: true,
      deployTreasury: false
    },
    sepolia: {
      chainId: 11155111,
      name: "Sepolia",
      deployReactive: false,
      deployTreasury: true,
      uniswapV2Router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      ethPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD on Sepolia
      usdcToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // USDC on Sepolia
    },
    arbitrumSepolia: {
      chainId: 421614,
      name: "Arbitrum Sepolia",
      deployReactive: false,
      deployTreasury: true,
      uniswapV2Router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      ethPriceFeed: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08", // ETH/USD on Arbitrum Sepolia
      usdcToken: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" // USDC on Arbitrum Sepolia
    }
  };

  const currentNetwork = hre.network.name;
  const config = networkConfigs[currentNetwork];

  if (!config) {
    throw new Error(`Network ${currentNetwork} not configured`);
  }

  console.log(`Deploying to ${config.name} (Chain ID: ${config.chainId})`);

  const deployedContracts = {};

  // Deploy PriceMonitorReactive (only on Reactive Network)
  if (config.deployReactive) {
    console.log("\n=== Deploying Reactive Smart Contracts ===");

    const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
    const priceMonitor = await PriceMonitorReactive.deploy();
    await priceMonitor.deployed();

    console.log("PriceMonitorReactive deployed to:", priceMonitor.address);
    deployedContracts.priceMonitor = priceMonitor.address;

    // Configure price feeds
    const ethUsdFeedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));

    console.log("Adding ETH/USD price feed...");

    // Add Sepolia ETH/USD feed
    await priceMonitor.addPriceFeed(
      ethUsdFeedId,
      networkConfigs.sepolia.ethPriceFeed,
      networkConfigs.sepolia.chainId,
      1000 // 10% threshold
    );

    // Add Arbitrum Sepolia ETH/USD feed
    await priceMonitor.addPriceFeed(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD_ARB")),
      networkConfigs.arbitrumSepolia.ethPriceFeed,
      networkConfigs.arbitrumSepolia.chainId,
      1000 // 10% threshold
    );

    console.log("Price feeds configured successfully");
  }

  // Deploy TreasuryVault (on destination chains)
  if (config.deployTreasury) {
    console.log("\n=== Deploying Treasury Vault ===");

    const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
    const treasury = await TreasuryVault.deploy(
      config.uniswapV2Router,
      config.uniswapV3Router
    );
    await treasury.deployed();

    console.log("TreasuryVault deployed to:", treasury.address);
    deployedContracts.treasury = treasury.address;

    // Configure assets
    console.log("Configuring treasury assets...");

    const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));
    const usdcAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("USDC"));

    // Add ETH asset (50% target allocation)
    await treasury.addAsset(
      ethAssetId,
      "0x0000000000000000000000000000000000000000", // ETH
      5000, // 50%
      ethers.utils.parseEther("0.1") // 0.1 ETH minimum
    );

    // Add USDC asset (50% target allocation)
    await treasury.addAsset(
      usdcAssetId,
      config.usdcToken,
      5000, // 50%
      ethers.utils.parseUnits("100", 6) // 100 USDC minimum
    );

    console.log("Assets configured successfully");
  }

  // Save deployment info
  const deploymentInfo = {
    network: config.name,
    chainId: config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
    gasUsed: "TBD" // Will be calculated from transaction receipts
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require('fs');
  const path = require('path');

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${currentNetwork}_${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\nDeployment info saved to: deployments/${filename}`);

  if (config.deployReactive) {
    console.log("\n=== Next Steps ===");
    console.log("1. Deploy TreasuryVault contracts on destination chains");
    console.log("2. Configure treasury addresses in PriceMonitorReactive");
    console.log("3. Fund treasury contracts for testing");
    console.log("4. Test price threshold triggers");
  }

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });