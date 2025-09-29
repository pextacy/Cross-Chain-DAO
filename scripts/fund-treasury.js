const { ethers } = require("hardhat");

async function main() {
  console.log("Funding Treasury for Demo...");

  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "";

  if (!TREASURY_ADDRESS) {
    throw new Error("TREASURY_ADDRESS required");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Funding from account:", deployer.address);

  // Fund with ETH
  const ethAmount = ethers.utils.parseEther("1.0"); // 1 ETH
  console.log("Sending ETH to treasury...");

  const ethTx = await deployer.sendTransaction({
    to: TREASURY_ADDRESS,
    value: ethAmount,
  });
  await ethTx.wait();

  console.log(`Sent ${ethers.utils.formatEther(ethAmount)} ETH to treasury`);
  console.log(`Transaction hash: ${ethTx.hash}`);

  // Fund with USDC (if available)
  if (USDC_ADDRESS) {
    console.log("Transferring USDC to treasury...");

    const IERC20 = await ethers.getContractFactory("IERC20");
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    const usdcAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC
    const usdcTx = await usdc.transfer(TREASURY_ADDRESS, usdcAmount);
    await usdcTx.wait();

    console.log(`Sent ${ethers.utils.formatUnits(usdcAmount, 6)} USDC to treasury`);
    console.log(`Transaction hash: ${usdcTx.hash}`);
  }

  // Check treasury balance
  console.log("\n=== Treasury Balance Check ===");
  const ethBalance = await ethers.provider.getBalance(TREASURY_ADDRESS);
  console.log(`ETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`);

  if (USDC_ADDRESS) {
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const usdcBalance = await usdc.balanceOf(TREASURY_ADDRESS);
    console.log(`USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)} USDC`);
  }

  console.log("\n=== Next Steps ===");
  console.log("1. Monitor ETH price movements");
  console.log("2. Wait for 10%+ price changes to trigger rebalancing");
  console.log("3. Check transaction history for autonomous rebalancing");
  console.log("4. Track REACT gas usage for hackathon metrics");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });