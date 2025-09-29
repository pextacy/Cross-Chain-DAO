const { ethers } = require("hardhat");

async function verifyContract(address, constructorArgs = [], contractPath = "") {
  try {
    console.log(`📋 Verifying contract at ${address}...`);

    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
      contract: contractPath
    });

    console.log(`✅ Contract verified successfully!`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ Contract already verified`);
      return true;
    }
    console.log(`❌ Verification failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🔍 Starting Contract Verification...");

  const network = hre.network.name;
  console.log(`Network: ${network}`);

  // Load addresses from environment or deployment files
  const priceMonitorAddress = process.env.REACTIVE_PRICE_MONITOR;
  const treasuryAddress = process.env[`${network.toUpperCase()}_TREASURY`];

  const results = {
    network,
    timestamp: new Date().toISOString(),
    verifications: []
  };

  // Verify PriceMonitorReactive (on Reactive network)
  if (network === "reactive" && priceMonitorAddress) {
    console.log("\n🎯 Verifying PriceMonitorReactive...");
    const success = await verifyContract(
      priceMonitorAddress,
      [], // No constructor arguments
      "contracts/PriceMonitorReactive.sol:PriceMonitorReactive"
    );

    results.verifications.push({
      contract: "PriceMonitorReactive",
      address: priceMonitorAddress,
      success,
      explorerUrl: `https://explorer.reactive.network/address/${priceMonitorAddress}`
    });
  }

  // Verify TreasuryVault (on destination chains)
  if ((network === "sepolia" || network === "arbitrumSepolia") && treasuryAddress) {
    console.log(`\n🏛️ Verifying TreasuryVault on ${network}...`);

    // Constructor arguments for TreasuryVault
    const uniswapV2Router = network === "sepolia"
      ? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"  // Sepolia
      : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Arbitrum Sepolia

    const uniswapV3Router = network === "sepolia"
      ? "0xE592427A0AEce92De3Edee1F18E0157C05861564"   // Sepolia
      : "0xE592427A0AEce92De3Edee1F18E0157C05861564";  // Arbitrum Sepolia

    const success = await verifyContract(
      treasuryAddress,
      [uniswapV2Router, uniswapV3Router],
      "contracts/TreasuryVault.sol:TreasuryVault"
    );

    const explorerUrls = {
      sepolia: `https://sepolia.etherscan.io/address/${treasuryAddress}`,
      arbitrumSepolia: `https://sepolia.arbiscan.io/address/${treasuryAddress}`
    };

    results.verifications.push({
      contract: "TreasuryVault",
      address: treasuryAddress,
      success,
      explorerUrl: explorerUrls[network] || `https://explorer.${network}.com/address/${treasuryAddress}`
    });
  }

  // Save verification results
  const fs = require('fs');
  const path = require('path');

  const verificationDir = path.join(__dirname, '..', 'verification');
  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir);
  }

  const filename = `${network}-verification-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(verificationDir, filename),
    JSON.stringify(results, null, 2)
  );

  console.log("\n" + "=".repeat(60));
  console.log("🔍 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(JSON.stringify(results, null, 2));
  console.log("=".repeat(60));
  console.log(`📁 Results saved to: verification/${filename}`);

  // Check if all verifications succeeded
  const allSucceeded = results.verifications.every(v => v.success);
  if (allSucceeded && results.verifications.length > 0) {
    console.log("\n✅ All contracts verified successfully!");

    // Display explorer links
    console.log("\n🔗 Explorer Links:");
    results.verifications.forEach(v => {
      console.log(`   ${v.contract}: ${v.explorerUrl}`);
    });

  } else if (results.verifications.length === 0) {
    console.log("\n⚠️ No contracts configured for verification on this network");
    console.log("Make sure environment variables are set:");
    console.log("   REACTIVE_PRICE_MONITOR (for reactive network)");
    console.log("   SEPOLIA_TREASURY (for sepolia network)");
    console.log("   ARBITRUM_TREASURY (for arbitrumSepolia network)");
  } else {
    console.log("\n❌ Some verifications failed - check the logs above");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification script failed:", error);
    process.exit(1);
  });