const { ethers } = require("hardhat");

class SystemHealthChecker {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async check(description, checkFunction) {
    process.stdout.write(`🔍 ${description}... `);

    try {
      const result = await checkFunction();
      if (result) {
        console.log('✅ PASS');
        this.passed++;
        this.checks.push({ description, status: 'PASS', result });
        return true;
      } else {
        console.log('❌ FAIL');
        this.failed++;
        this.checks.push({ description, status: 'FAIL' });
        return false;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      this.failed++;
      this.checks.push({ description, status: 'ERROR', error: error.message });
      return false;
    }
  }

  async checkEnvironmentVariables() {
    await this.check('Environment variables configured', async () => {
      const required = ['PRIVATE_KEY'];
      const optional = ['REACTIVE_RPC_URL', 'SEPOLIA_RPC_URL', 'ARBITRUM_SEPOLIA_RPC_URL'];

      let score = 0;
      for (const key of required) {
        if (process.env[key]) score += 2;
        else this.log(`   ⚠️  Missing required: ${key}`, 'warning');
      }

      for (const key of optional) {
        if (process.env[key]) score += 1;
        else this.log(`   ℹ️  Missing optional: ${key}`, 'info');
      }

      return score >= 2; // At least private key required
    });
  }

  async checkContractCompilation() {
    await this.check('Smart contracts compile', async () => {
      try {
        await hre.run('compile');
        return true;
      } catch (error) {
        this.log(`   Compilation error: ${error.message}`, 'error');
        return false;
      }
    });
  }

  async checkContractDeployability() {
    await this.check('Contracts can be deployed locally', async () => {
      try {
        const [deployer] = await ethers.getSigners();
        const balance = await deployer.getBalance();

        if (balance.isZero()) {
          this.log('   ⚠️  Deployer has no balance', 'warning');
          return false;
        }

        // Try to deploy PriceMonitorReactive
        const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
        const gasEstimate = await PriceMonitorReactive.signer.estimateGas(
          PriceMonitorReactive.getDeployTransaction()
        );

        if (balance.lt(gasEstimate.mul(2))) {
          this.log(`   ⚠️  Insufficient balance for deployment`, 'warning');
          return false;
        }

        return true;
      } catch (error) {
        this.log(`   Deployment check failed: ${error.message}`, 'error');
        return false;
      }
    });
  }

  async checkNetworkConnections() {
    const networks = [
      { name: 'Hardhat Local', rpc: 'http://127.0.0.1:8545' },
      { name: 'Reactive Network', rpc: process.env.REACTIVE_RPC_URL || 'https://rpc.reactive.network' },
      { name: 'Sepolia', rpc: process.env.SEPOLIA_RPC_URL },
      { name: 'Arbitrum Sepolia', rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL }
    ];

    for (const network of networks) {
      if (!network.rpc) continue;

      await this.check(`${network.name} connection`, async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(network.rpc);
          const blockNumber = await provider.getBlockNumber();
          this.log(`   Latest block: ${blockNumber}`, 'info');
          return blockNumber > 0;
        } catch (error) {
          this.log(`   Connection failed: ${error.message}`, 'error');
          return false;
        }
      });
    }
  }

  async checkDependencies() {
    await this.check('Node.js dependencies', async () => {
      try {
        const package = require('../package.json');
        const deps = Object.keys(package.devDependencies || {});

        for (const dep of ['hardhat', '@openzeppelin/contracts', 'dotenv']) {
          if (!deps.includes(dep)) {
            this.log(`   Missing dependency: ${dep}`, 'error');
            return false;
          }
        }

        return true;
      } catch (error) {
        this.log(`   Package.json check failed: ${error.message}`, 'error');
        return false;
      }
    });
  }

  async checkProjectStructure() {
    await this.check('Project structure', async () => {
      const fs = require('fs');
      const path = require('path');

      const requiredFiles = [
        'contracts/PriceMonitorReactive.sol',
        'contracts/TreasuryVault.sol',
        'contracts/interfaces/IReactive.sol',
        'scripts/deploy.js',
        'scripts/monitor.js',
        'test/PriceMonitorReactive.test.js',
        'hardhat.config.js',
        'README.md'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
          this.log(`   Missing file: ${file}`, 'error');
          return false;
        }
      }

      return true;
    });
  }

  async checkContractInterfaces() {
    await this.check('Contract interfaces', async () => {
      try {
        const PriceMonitorReactive = await ethers.getContractFactory("PriceMonitorReactive");
        const TreasuryVault = await ethers.getContractFactory("TreasuryVault");

        // Check if critical functions exist
        const priceMonitorInterface = PriceMonitorReactive.interface;
        const treasuryInterface = TreasuryVault.interface;

        const requiredPriceFunctions = ['addPriceFeed', 'addTreasury', 'react'];
        const requiredTreasuryFunctions = ['executeRebalance', 'addAsset', 'pause'];

        for (const func of requiredPriceFunctions) {
          if (!priceMonitorInterface.functions[`${func}(uint256,address,uint256,uint256)`] &&
              !priceMonitorInterface.functions[func]) {
            this.log(`   PriceMonitor missing: ${func}`, 'error');
            return false;
          }
        }

        for (const func of requiredTreasuryFunctions) {
          if (!treasuryInterface.functions[func] &&
              !Object.keys(treasuryInterface.functions).some(f => f.startsWith(func))) {
            this.log(`   Treasury missing: ${func}`, 'error');
            return false;
          }
        }

        return true;
      } catch (error) {
        this.log(`   Interface check failed: ${error.message}`, 'error');
        return false;
      }
    });
  }

  async checkGasEstimation() {
    await this.check('Gas estimation works', async () => {
      try {
        const [deployer] = await ethers.getSigners();

        // Simple gas estimation test
        const gasEstimate = await deployer.estimateGas({
          to: deployer.address,
          value: 0
        });

        return gasEstimate.gt(0);
      } catch (error) {
        this.log(`   Gas estimation failed: ${error.message}`, 'error');
        return false;
      }
    });
  }

  async checkHackathonReadiness() {
    await this.check('Hackathon submission readiness', async () => {
      const fs = require('fs');
      const path = require('path');

      const submissionFiles = [
        'README.md',
        'ARCHITECTURE.md',
        'DEPLOYMENT_GUIDE.md',
        'HACKATHON_CHECKLIST.md'
      ];

      let score = 0;
      for (const file of submissionFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.length > 1000) { // Substantial content
            score++;
          }
        }
      }

      return score >= 3; // At least 3 out of 4 substantial docs
    });
  }

  async runAllChecks() {
    this.log("\n🏥 Cross-Chain DAO Treasury - System Health Check", 'info');
    this.log("=".repeat(60), 'info');

    await this.checkEnvironmentVariables();
    await this.checkDependencies();
    await this.checkProjectStructure();
    await this.checkContractCompilation();
    await this.checkContractInterfaces();
    await this.checkContractDeployability();
    await this.checkNetworkConnections();
    await this.checkGasEstimation();
    await this.checkHackathonReadiness();

    this.generateReport();
  }

  generateReport() {
    this.log("\n" + "=".repeat(60), 'info');
    this.log("📊 HEALTH CHECK SUMMARY", 'info');
    this.log("=".repeat(60), 'info');

    const total = this.passed + this.failed;
    const percentage = Math.round((this.passed / total) * 100);

    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${percentage}%`);

    if (percentage >= 90) {
      this.log("\n🎉 EXCELLENT! System is ready for hackathon deployment!", 'success');
    } else if (percentage >= 75) {
      this.log("\n⚠️  GOOD! Minor issues to address before deployment", 'warning');
    } else if (percentage >= 50) {
      this.log("\n🔧 NEEDS WORK! Several issues need fixing", 'warning');
    } else {
      this.log("\n🚨 CRITICAL! Major issues prevent deployment", 'error');
    }

    if (this.failed > 0) {
      this.log("\n🔧 Failed Checks:", 'warning');
      this.checks
        .filter(check => check.status !== 'PASS')
        .forEach(check => {
          console.log(`   ❌ ${check.description}: ${check.error || 'Failed'}`);
        });
    }

    this.log("\n🚀 Next Steps:", 'info');
    if (percentage >= 90) {
      console.log("   1. Run full deployment: npm run hackathon:full");
      console.log("   2. Start monitoring: npm run monitor");
      console.log("   3. Create demo video");
    } else {
      console.log("   1. Fix failed health checks");
      console.log("   2. Re-run health check: npm run health-check");
      console.log("   3. Deploy when all checks pass");
    }

    // Save report
    const fs = require('fs');
    const path = require('path');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed: this.passed,
        failed: this.failed,
        percentage
      },
      checks: this.checks
    };

    const reportsDir = path.join(__dirname, '..', 'hackathon-submission');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportsDir, `health-check-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    return report;
  }
}

async function main() {
  const checker = new SystemHealthChecker();
  await checker.runAllChecks();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Health check failed:", error);
      process.exit(1);
    });
}

module.exports = { SystemHealthChecker };