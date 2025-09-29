const { ethers } = require("hardhat");
const chalk = require('chalk');

class TreasuryMonitor {
  constructor() {
    this.priceMonitorAddress = process.env.REACTIVE_PRICE_MONITOR;
    this.sepoliaTreasuryAddress = process.env.SEPOLIA_TREASURY;
    this.arbitrumTreasuryAddress = process.env.ARBITRUM_TREASURY;

    this.networks = {
      reactive: {
        name: "Reactive Network",
        rpc: process.env.REACTIVE_RPC_URL || "https://rpc.reactive.network",
        chainId: 5318008
      },
      sepolia: {
        name: "Ethereum Sepolia",
        rpc: process.env.SEPOLIA_RPC_URL,
        chainId: 11155111
      },
      arbitrumSepolia: {
        name: "Arbitrum Sepolia",
        rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL,
        chainId: 421614
      }
    };
  }

  async initialize() {
    console.log(chalk.blue.bold("🚀 Cross-Chain DAO Treasury Monitor Starting..."));
    console.log(chalk.gray("=" * 60));

    if (!this.priceMonitorAddress) {
      console.log(chalk.red("❌ REACTIVE_PRICE_MONITOR not configured"));
      process.exit(1);
    }

    // Connect to networks
    this.providers = {};
    for (const [key, network] of Object.entries(this.networks)) {
      if (network.rpc) {
        this.providers[key] = new ethers.providers.JsonRpcProvider(network.rpc);
        console.log(chalk.green(`✅ Connected to ${network.name}`));
      }
    }

    // Load contracts
    await this.loadContracts();

    console.log(chalk.gray("=" * 60));
    console.log(chalk.blue.bold("📊 Starting real-time monitoring...\n"));
  }

  async loadContracts() {
    if (this.providers.reactive) {
      const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
      this.priceMonitor = PriceMonitorReactive.attach(this.priceMonitorAddress);
      this.priceMonitor = this.priceMonitor.connect(this.providers.reactive);
    }

    if (this.providers.sepolia && this.sepoliaTreasuryAddress) {
      const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
      this.sepoliaTreasury = TreasuryVault.attach(this.sepoliaTreasuryAddress);
      this.sepoliaTreasury = this.sepoliaTreasury.connect(this.providers.sepolia);
    }

    if (this.providers.arbitrumSepolia && this.arbitrumTreasuryAddress) {
      const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
      this.arbitrumTreasury = TreasuryVault.attach(this.arbitrumTreasuryAddress);
      this.arbitrumTreasury = this.arbitrumTreasury.connect(this.providers.arbitrumSepolia);
    }
  }

  async displaySystemStatus() {
    try {
      if (this.priceMonitor) {
        const feedCount = await this.priceMonitor.getFeedCount();
        const treasuryCount = await this.priceMonitor.getTreasuryCount();

        console.log(chalk.cyan("🔍 Reactive Network Status:"));
        console.log(`   Price Feeds: ${feedCount}`);
        console.log(`   Treasuries: ${treasuryCount}`);
        console.log(`   Address: ${this.priceMonitorAddress}`);
      }

      if (this.sepoliaTreasury) {
        const [totalValue, lastRebalance, rebalanceCount] = await this.sepoliaTreasury.getPortfolioState();
        const isPaused = await this.sepoliaTreasury.isPaused();

        console.log(chalk.yellow("💰 Sepolia Treasury Status:"));
        console.log(`   Total Value: ${ethers.utils.formatEther(totalValue)} ETH equiv`);
        console.log(`   Rebalances: ${rebalanceCount}`);
        console.log(`   Last Rebalance: ${lastRebalance > 0 ? new Date(lastRebalance * 1000).toLocaleString() : 'Never'}`);
        console.log(`   Status: ${isPaused ? chalk.red('PAUSED') : chalk.green('ACTIVE')}`);
      }

      if (this.arbitrumTreasury) {
        const [totalValue, lastRebalance, rebalanceCount] = await this.arbitrumTreasury.getPortfolioState();
        const isPaused = await this.arbitrumTreasury.isPaused();

        console.log(chalk.magenta("💰 Arbitrum Treasury Status:"));
        console.log(`   Total Value: ${ethers.utils.formatEther(totalValue)} ETH equiv`);
        console.log(`   Rebalances: ${rebalanceCount}`);
        console.log(`   Last Rebalance: ${lastRebalance > 0 ? new Date(lastRebalance * 1000).toLocaleString() : 'Never'}`);
        console.log(`   Status: ${isPaused ? chalk.red('PAUSED') : chalk.green('ACTIVE')}`);
      }
    } catch (error) {
      console.log(chalk.red("❌ Error fetching system status:"), error.message);
    }
  }

  async startEventMonitoring() {
    if (!this.priceMonitor) {
      console.log(chalk.red("❌ Price monitor not available"));
      return;
    }

    console.log(chalk.blue("🎧 Listening for price threshold breaches..."));

    // Listen for price threshold breaches
    this.priceMonitor.on("PriceThresholdBreached", (feedId, oldPrice, newPrice, changePercent, timestamp, event) => {
      const priceChangeDir = newPrice > oldPrice ? "📈" : "📉";
      const changeStr = (changePercent / 100).toFixed(2);

      console.log(chalk.red.bold(`\n🚨 PRICE THRESHOLD BREACHED!`));
      console.log(`${priceChangeDir} Feed: ${feedId}`);
      console.log(`   Old Price: $${(oldPrice / 1e8).toFixed(2)}`);
      console.log(`   New Price: $${(newPrice / 1e8).toFixed(2)}`);
      console.log(`   Change: ${changeStr}%`);
      console.log(`   Time: ${new Date(timestamp * 1000).toLocaleString()}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   Tx: ${event.transactionHash}`);
    });

    // Listen for rebalancing triggers
    this.priceMonitor.on("RebalanceTriggered", (chainId, treasury, feedId, price, event) => {
      const chainName = this.getChainName(chainId);

      console.log(chalk.green.bold(`\n⚖️ REBALANCING TRIGGERED!`));
      console.log(`🔗 Chain: ${chainName} (${chainId})`);
      console.log(`🏛️ Treasury: ${treasury}`);
      console.log(`📊 Feed: ${feedId}`);
      console.log(`💲 Price: $${(price / 1e8).toFixed(2)}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   Tx: ${event.transactionHash}`);
    });

    // Listen for treasury rebalancing executions
    if (this.sepoliaTreasury) {
      this.sepoliaTreasury.on("RebalanceExecuted", (feedId, tokenFrom, tokenTo, amount, triggerPrice, event) => {
        console.log(chalk.yellow.bold(`\n💱 SEPOLIA REBALANCE EXECUTED!`));
        console.log(`📊 Feed: ${feedId}`);
        console.log(`🔄 ${tokenFrom} → ${tokenTo}`);
        console.log(`💰 Amount: ${ethers.utils.formatEther(amount)}`);
        console.log(`💲 Trigger Price: $${(triggerPrice / 1e8).toFixed(2)}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Tx: ${event.transactionHash}`);
        console.log(`   Gas Used: ${event.gasUsed?.toString() || 'N/A'}`);
      });
    }

    if (this.arbitrumTreasury) {
      this.arbitrumTreasury.on("RebalanceExecuted", (feedId, tokenFrom, tokenTo, amount, triggerPrice, event) => {
        console.log(chalk.magenta.bold(`\n💱 ARBITRUM REBALANCE EXECUTED!`));
        console.log(`📊 Feed: ${feedId}`);
        console.log(`🔄 ${tokenFrom} → ${tokenTo}`);
        console.log(`💰 Amount: ${ethers.utils.formatEther(amount)}`);
        console.log(`💲 Trigger Price: $${(triggerPrice / 1e8).toFixed(2)}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Tx: ${event.transactionHash}`);
        console.log(`   Gas Used: ${event.gasUsed?.toString() || 'N/A'}`);
      });
    }
  }

  getChainName(chainId) {
    const chains = {
      5318008: "Reactive Network",
      11155111: "Ethereum Sepolia",
      421614: "Arbitrum Sepolia"
    };
    return chains[chainId] || `Chain ${chainId}`;
  }

  async displayRecentEvents() {
    console.log(chalk.blue.bold("\n📜 Recent Events:"));

    if (this.priceMonitor) {
      try {
        // Get recent price threshold breaches
        const filter = this.priceMonitor.filters.PriceThresholdBreached();
        const events = await this.priceMonitor.queryFilter(filter, -1000); // Last 1000 blocks

        console.log(`\n🚨 Price Threshold Breaches (${events.length}):`);
        events.slice(-5).forEach((event, idx) => {
          const { feedId, oldPrice, newPrice, changePercent, timestamp } = event.args;
          console.log(`   ${idx + 1}. ${new Date(timestamp * 1000).toLocaleDateString()} - ${(changePercent / 100).toFixed(2)}% change`);
        });

        // Get recent rebalance triggers
        const rebalanceFilter = this.priceMonitor.filters.RebalanceTriggered();
        const rebalanceEvents = await this.priceMonitor.queryFilter(rebalanceFilter, -1000);

        console.log(`\n⚖️ Rebalance Triggers (${rebalanceEvents.length}):`);
        rebalanceEvents.slice(-5).forEach((event, idx) => {
          const { chainId, treasury, price } = event.args;
          console.log(`   ${idx + 1}. ${this.getChainName(chainId)} - $${(price / 1e8).toFixed(2)}`);
        });
      } catch (error) {
        console.log(chalk.red("   Error fetching events:"), error.message);
      }
    }
  }

  async calculateReactGasUsage() {
    console.log(chalk.cyan.bold("\n⛽ REACT Gas Usage Analysis:"));

    if (!this.providers.reactive) {
      console.log(chalk.red("   Reactive network not available"));
      return;
    }

    try {
      const latestBlock = await this.providers.reactive.getBlockNumber();
      const startBlock = Math.max(latestBlock - 1000, 0);

      console.log(`   Analyzing blocks ${startBlock} to ${latestBlock}...`);

      let totalGasUsed = ethers.BigNumber.from(0);
      let transactionCount = 0;

      // This would need to be implemented to track actual REACT gas usage
      // For demo purposes, we'll estimate based on events

      if (this.priceMonitor) {
        const filter = this.priceMonitor.filters.RebalanceTriggered();
        const events = await this.priceMonitor.queryFilter(filter, startBlock);

        for (const event of events) {
          const receipt = await this.providers.reactive.getTransactionReceipt(event.transactionHash);
          totalGasUsed = totalGasUsed.add(receipt.gasUsed);
          transactionCount++;
        }
      }

      console.log(`   Transactions: ${transactionCount}`);
      console.log(`   Total Gas Used: ${ethers.utils.formatUnits(totalGasUsed, 'gwei')} Gwei`);
      console.log(`   Avg Gas per Tx: ${transactionCount > 0 ? ethers.utils.formatUnits(totalGasUsed.div(transactionCount), 'gwei') : '0'} Gwei`);

    } catch (error) {
      console.log(chalk.red("   Error calculating gas usage:"), error.message);
    }
  }

  async run() {
    await this.initialize();

    // Initial status display
    await this.displaySystemStatus();
    await this.displayRecentEvents();
    await this.calculateReactGasUsage();

    // Start real-time monitoring
    await this.startEventMonitoring();

    // Update status every 60 seconds
    setInterval(async () => {
      console.log(chalk.gray("\n" + "=".repeat(60)));
      console.log(chalk.blue(`📊 Status Update - ${new Date().toLocaleTimeString()}`));
      await this.displaySystemStatus();
      await this.calculateReactGasUsage();
    }, 60000);

    console.log(chalk.green("✅ Monitor running... Press Ctrl+C to stop"));
  }
}

async function main() {
  const monitor = new TreasuryMonitor();
  await monitor.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  });
}

module.exports = { TreasuryMonitor };