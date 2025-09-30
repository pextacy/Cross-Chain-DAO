import { ethers } from "hardhat";

/**
 * Fund the deployment wallet with REACT tokens via Sepolia faucet
 * Sends SepETH to the Reactive faucet contract to receive REACT tokens
 * Exchange rate: 1 SepETH = 5 REACT
 * Maximum: 10 SepETH per transaction (yields 50 REACT)
 */
async function main() {
  console.log("🪙 Funding Reactive Wallet via Sepolia Faucet\n");

  // Reactive faucet contract on Sepolia
  const REACTIVE_FAUCET = "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434";

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("Deployer address:", deployerAddress);

  // Check Sepolia balance
  const balance = await deployer.provider.getBalance(deployerAddress);
  console.log("Sepolia balance:", ethers.formatEther(balance), "SepETH");

  if (balance < ethers.parseEther("0.1")) {
    console.log("\n⚠️  Insufficient Sepolia ETH!");
    console.log("Get SepETH from: https://sepoliafaucet.com/");
    return;
  }

  // Amount to send (default 1 SepETH = 5 REACT)
  const sendAmount = ethers.parseEther("1.0");
  const expectedReact = parseFloat(ethers.formatEther(sendAmount)) * 5;

  console.log(`\n📤 Sending ${ethers.formatEther(sendAmount)} SepETH to Reactive faucet`);
  console.log(`💰 Expected to receive: ~${expectedReact} REACT tokens\n`);

  try {
    const tx = await deployer.sendTransaction({
      to: REACTIVE_FAUCET,
      value: sendAmount
    });

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    console.log("\n📊 Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Sent: ${ethers.formatEther(sendAmount)} SepETH`);
    console.log(`Expected REACT: ~${expectedReact} REACT`);
    console.log(`Faucet Contract: ${REACTIVE_FAUCET}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

    const newBalance = await deployer.provider.getBalance(deployerAddress);
    console.log(`\nNew Sepolia balance: ${ethers.formatEther(newBalance)} SepETH`);

    console.log("\n✨ Next Steps:");
    console.log("1. Wait ~1-2 minutes for REACT tokens to arrive");
    console.log("2. Check balance on Reactive Mainnet:");
    console.log("   → https://reactscan.net/address/" + deployerAddress);
    console.log("3. Run deployment: npm run deploy:reactive");

  } catch (error) {
    console.error("\n❌ Error sending transaction:", error.message);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log("\n💡 Get more SepETH from: https://sepoliafaucet.com/");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });