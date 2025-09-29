const { ethers } = require("hardhat");

async function main() {
  console.log("Configuring Cross-Chain DAO Treasury...");

  // Load deployment addresses (you'll need to update these after deployment)
  const REACTIVE_PRICE_MONITOR = process.env.REACTIVE_PRICE_MONITOR || "";
  const SEPOLIA_TREASURY = process.env.SEPOLIA_TREASURY || "";
  const ARBITRUM_TREASURY = process.env.ARBITRUM_TREASURY || "";

  if (!REACTIVE_PRICE_MONITOR) {
    throw new Error("REACTIVE_PRICE_MONITOR address required");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Configuring with account:", deployer.address);

  // Connect to PriceMonitorReactive (assuming we're on Reactive network)
  const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
  const priceMonitor = PriceMonitorReactive.attach(REACTIVE_PRICE_MONITOR);

  console.log("Adding treasury contracts to PriceMonitorReactive...");

  // Add Sepolia treasury
  if (SEPOLIA_TREASURY) {
    console.log("Adding Sepolia treasury:", SEPOLIA_TREASURY);
    await priceMonitor.addTreasury(
      11155111, // Sepolia chain ID
      SEPOLIA_TREASURY,
      500000 // Gas limit for callbacks
    );
    console.log("Sepolia treasury added");
  }

  // Add Arbitrum Sepolia treasury
  if (ARBITRUM_TREASURY) {
    console.log("Adding Arbitrum treasury:", ARBITRUM_TREASURY);
    await priceMonitor.addTreasury(
      421614, // Arbitrum Sepolia chain ID
      ARBITRUM_TREASURY,
      500000 // Gas limit for callbacks
    );
    console.log("Arbitrum treasury added");
  }

  // Configure treasury reactive permissions
  console.log("\nConfiguring treasury reactive permissions...");

  if (process.env.CONFIGURE_TREASURY === "sepolia" && SEPOLIA_TREASURY) {
    const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
    const treasury = TreasuryVault.attach(SEPOLIA_TREASURY);

    console.log("Setting reactive caller for Sepolia treasury...");
    await treasury.setReactiveCaller(REACTIVE_PRICE_MONITOR);
    console.log("Reactive caller set successfully");
  }

  if (process.env.CONFIGURE_TREASURY === "arbitrum" && ARBITRUM_TREASURY) {
    const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
    const treasury = TreasuryVault.attach(ARBITRUM_TREASURY);

    console.log("Setting reactive caller for Arbitrum treasury...");
    await treasury.setReactiveCaller(REACTIVE_PRICE_MONITOR);
    console.log("Reactive caller set successfully");
  }

  console.log("\n=== Configuration Complete ===");
  console.log("System is now ready for autonomous treasury management!");

  // Display current configuration
  console.log("\n=== System Status ===");
  const feedCount = await priceMonitor.getFeedCount();
  const treasuryCount = await priceMonitor.getTreasuryCount();

  console.log(`Price feeds monitored: ${feedCount}`);
  console.log(`Treasury contracts: ${treasuryCount}`);

  console.log("\n=== Testing Instructions ===");
  console.log("1. Fund treasury contracts with ETH and USDC");
  console.log("2. Wait for ETH price changes > 10%");
  console.log("3. Monitor rebalancing transactions");
  console.log("4. Check REACT gas consumption for hackathon scoring");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });