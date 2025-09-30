import { ethers } from "hardhat";

/**
 * Check wallet balances across all deployment networks
 */
async function main() {
  console.log("💰 Checking Wallet Balances\n");

  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();

  console.log("Wallet Address:", address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Network configurations
  const networks = [
    {
      name: "Reactive Mainnet",
      rpc: "https://mainnet-rpc.rnk.dev/",
      chainId: 1597,
      symbol: "REACT",
      explorer: "https://reactscan.net/address/"
    },
    {
      name: "Sepolia Testnet",
      rpc: "https://rpc.sepolia.org",
      chainId: 11155111,
      symbol: "ETH",
      explorer: "https://sepolia.etherscan.io/address/"
    },
    {
      name: "Arbitrum Sepolia",
      rpc: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      symbol: "ETH",
      explorer: "https://sepolia.arbiscan.io/address/"
    }
  ];

  for (const network of networks) {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);

      const status = parseFloat(formattedBalance) > 0 ? "✅" : "❌";

      console.log(`${status} ${network.name}`);
      console.log(`   Balance: ${formattedBalance} ${network.symbol}`);
      console.log(`   Chain ID: ${network.chainId}`);
      console.log(`   Explorer: ${network.explorer}${address}`);
      console.log();

    } catch (error) {
      console.log(`❌ ${network.name}`);
      console.log(`   Error: ${error.message}`);
      console.log();
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 To fund your wallet:");
  console.log("   Sepolia: https://sepoliafaucet.com/");
  console.log("   Arbitrum: https://faucet.quicknode.com/arbitrum/sepolia");
  console.log("   Reactive: Run 'npm run fund:reactive' after getting SepETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });