const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

class GasAnalyzer {
  constructor() {
    this.gasReports = [];
    this.networkConfigs = {
      reactive: {
        name: "Reactive Network",
        rpc: process.env.REACTIVE_RPC_URL || "https://rpc.reactive.network",
        chainId: 5318008,
        gasToken: "REACT"
      },
      sepolia: {
        name: "Ethereum Sepolia",
        rpc: process.env.SEPOLIA_RPC_URL,
        chainId: 11155111,
        gasToken: "ETH"
      },
      arbitrumSepolia: {
        name: "Arbitrum Sepolia",
        rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL,
        chainId: 421614,
        gasToken: "ETH"
      }
    };
  }

  async analyzeContractDeployment(contractName, constructorArgs = []) {
    console.log(`📊 Analyzing gas usage for ${contractName}...`);

    const ContractFactory = await ethers.getContractFactory(contractName);

    // Estimate deployment gas
    const deployTx = ContractFactory.getDeployTransaction(...constructorArgs);
    const deployGasEstimate = await ethers.provider.estimateGas(deployTx);

    console.log(`   Deployment gas estimate: ${deployGasEstimate.toString()}`);

    return {
      contract: contractName,
      deploymentGas: deployGasEstimate.toString(),
      timestamp: Date.now()
    };
  }

  async analyzeFunction(contract, functionName, args = []) {
    console.log(`🔍 Analyzing ${functionName} function...`);

    try {
      const gasEstimate = await contract.estimateGas[functionName](...args);
      const gasUsed = gasEstimate.toString();

      console.log(`   ${functionName} gas estimate: ${gasUsed}`);

      return {
        function: functionName,
        gasEstimate: gasUsed,
        args: args.length
      };
    } catch (error) {
      console.log(`   ⚠️  Error estimating ${functionName}: ${error.message}`);
      return {
        function: functionName,
        error: error.message
      };
    }
  }

  async analyzePriceMonitoringFlow() {
    console.log("\n🎯 Analyzing Price Monitoring Gas Flow...");

    try {
      // Deploy contracts for analysis
      const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
      const priceMonitor = await PriceMonitorReactive.deploy();
      await priceMonitor.deployed();

      const analyses = [];

      // Analyze key functions
      const ethUsdFeedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
      const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

      // Add price feed
      analyses.push(await this.analyzeFunction(
        priceMonitor,
        'addPriceFeed',
        [ethUsdFeedId, mockFeedAddress, 1, 1000]
      ));

      // Add treasury
      analyses.push(await this.analyzeFunction(
        priceMonitor,
        'addTreasury',
        [1, "0x1234567890123456789012345678901234567890", 500000]
      ));

      // React function (most important for REACT gas usage)
      const mockData = "0x00000000" + ethers.utils.defaultAbiCoder.encode(
        ["uint80", "int256", "uint256", "uint256"],
        [1, ethers.utils.parseUnits("2000", 8), Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      ).slice(2);

      analyses.push(await this.analyzeFunction(
        priceMonitor,
        'react',
        [1, mockFeedAddress, "0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f", 0, 0, 0, mockData, 123456, 0]
      ));

      return {
        contract: "PriceMonitorReactive",
        functions: analyses,
        totalEstimatedGas: analyses.reduce((sum, a) => sum + (parseInt(a.gasEstimate) || 0), 0)
      };

    } catch (error) {
      console.log(`❌ Error in price monitoring analysis: ${error.message}`);
      return { error: error.message };
    }
  }

  async analyzeTreasuryOperations() {
    console.log("\n🏛️  Analyzing Treasury Operations Gas Usage...");

    try {
      const TreasuryVault = await ethers.getContractFactory("TreasuryVault");
      const treasury = await TreasuryVault.deploy(
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        "0xE592427A0AEce92De3Edee1F18E0157C05861564"
      );
      await treasury.deployed();

      const analyses = [];

      // Asset management
      const ethAssetId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH"));
      analyses.push(await this.analyzeFunction(
        treasury,
        'addAsset',
        [ethAssetId, ethers.constants.AddressZero, 5000, ethers.utils.parseEther("0.1")]
      ));

      // Rebalancing (core function)
      const feedId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ETH_USD"));
      analyses.push(await this.analyzeFunction(
        treasury,
        'executeRebalance',
        [feedId, ethers.utils.parseUnits("2000", 8), 1200]
      ));

      // Emergency functions
      analyses.push(await this.analyzeFunction(treasury, 'pause', []));
      analyses.push(await this.analyzeFunction(treasury, 'unpause', []));

      return {
        contract: "TreasuryVault",
        functions: analyses,
        totalEstimatedGas: analyses.reduce((sum, a) => sum + (parseInt(a.gasEstimate) || 0), 0)
      };

    } catch (error) {
      console.log(`❌ Error in treasury analysis: ${error.message}`);
      return { error: error.message };
    }
  }

  async calculateHackathonMetrics() {
    console.log("\n📈 Calculating Hackathon Gas Metrics...");

    const metrics = {
      timestamp: new Date().toISOString(),
      analysis: "Hackathon Gas Usage Projection",

      // Deployment costs
      deploymentGas: {
        priceMonitorReactive: 2500000, // Estimated
        treasuryVaultSepolia: 3200000, // Estimated
        treasuryVaultArbitrum: 3200000, // Estimated
        total: 8900000
      },

      // Operational gas per month (estimated)
      monthlyOperationalGas: {
        priceMonitoring: {
          // Continuous monitoring: 1 check per block, ~12 blocks/min = 17,280 per day
          checksPerDay: 17280,
          gasPerCheck: 50000,
          dailyGas: 17280 * 50000,
          monthlyGas: 17280 * 50000 * 30
        },
        rebalancing: {
          // Estimated 2 rebalancing events per week during volatile periods
          eventsPerMonth: 8,
          gasPerRebalancing: 400000,
          monthlyGas: 8 * 400000
        },
        crossChainCallbacks: {
          // Each rebalancing triggers callbacks to 2 chains
          callbacksPerMonth: 16, // 8 rebalancing * 2 chains
          gasPerCallback: 150000,
          monthlyGas: 16 * 150000
        }
      }
    };

    // Calculate totals
    const monthlyOps = metrics.monthlyOperationalGas;
    metrics.monthlyTotal =
      monthlyOps.priceMonitoring.monthlyGas +
      monthlyOps.rebalancing.monthlyGas +
      monthlyOps.crossChainCallbacks.monthlyGas;

    metrics.projectedUsage = {
      firstMonth: metrics.deploymentGas.total + metrics.monthlyTotal,
      ongoingMonthly: metrics.monthlyTotal,
      hackathonPeriod: metrics.monthlyTotal * 2 // 2 months for hackathon
    };

    console.log("📊 Gas Usage Projection:");
    console.log(`   Deployment: ${metrics.deploymentGas.total.toLocaleString()} gas`);
    console.log(`   Monthly Operational: ${metrics.monthlyTotal.toLocaleString()} gas`);
    console.log(`   Hackathon Period Total: ${metrics.projectedUsage.hackathonPeriod.toLocaleString()} gas`);

    return metrics;
  }

  async generateReport() {
    console.log("📋 Generating Complete Gas Analysis Report...");

    const report = {
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      analysis: {}
    };

    // Analyze contracts
    report.analysis.priceMonitoring = await this.analyzePriceMonitoringFlow();
    report.analysis.treasuryOperations = await this.analyzeTreasuryOperations();
    report.analysis.hackathonMetrics = await this.calculateHackathonMetrics();

    // Calculate summary
    report.summary = {
      estimatedDeploymentGas: (
        (report.analysis.priceMonitoring.totalEstimatedGas || 0) +
        (report.analysis.treasuryOperations.totalEstimatedGas || 0)
      ),
      projectedMonthlyUsage: report.analysis.hackathonMetrics.monthlyTotal,
      competitiveAdvantage: "Heavy REACT gas usage through continuous monitoring and cross-chain operations"
    };

    // Save report
    const reportsDir = path.join(__dirname, '..', 'hackathon-submission');
    const filename = `gas-analysis-${Date.now()}.json`;

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportsDir, filename),
      JSON.stringify(report, null, 2)
    );

    console.log(`📁 Report saved: hackathon-submission/${filename}`);
    return report;
  }

  async run() {
    console.log("⛽ Starting Comprehensive Gas Analysis...");
    console.log("=" * 60);

    try {
      const report = await this.generateReport();

      console.log("\n" + "=".repeat(60));
      console.log("📊 GAS ANALYSIS SUMMARY");
      console.log("=".repeat(60));
      console.log(JSON.stringify(report.summary, null, 2));
      console.log("=".repeat(60));

      console.log("\n🏆 Hackathon Scoring Implications:");
      console.log("✅ Heavy REACT gas usage = High scoring potential");
      console.log("✅ Continuous monitoring = Sustained gas consumption");
      console.log("✅ Cross-chain operations = Multiple gas usage vectors");
      console.log("✅ Real-world usage = Authentic transaction volume");

      return report;

    } catch (error) {
      console.error("❌ Gas analysis failed:", error);
      throw error;
    }
  }
}

async function main() {
  const analyzer = new GasAnalyzer();
  await analyzer.run();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { GasAnalyzer };