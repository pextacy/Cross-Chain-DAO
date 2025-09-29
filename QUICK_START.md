# 🚀 Quick Start Guide - Cross-Chain DAO Treasury Automation

> Get your autonomous treasury system running in under 1 hour!

## ⚡ Super Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/your-username/reactive-hackathon
cd reactive-hackathon
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your private key and RPC URLs

# 3. Test everything works
npm run health-check

# 4. Run local demo
npm run demo:local
```

## 🎯 Full Deployment (30 minutes)

### Step 1: Environment Setup (5 minutes)

```bash
# Required environment variables
PRIVATE_KEY=your_private_key_without_0x
REACTIVE_RPC_URL=https://rpc.reactive.network
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### Step 2: Test Suite (5 minutes)

```bash
# Run all tests to verify everything works
npm run test:all

# Expected output:
# ✅ PriceMonitorReactive tests: PASS
# ✅ TreasuryVault tests: PASS
# ✅ Integration tests: PASS
```

### Step 3: Deploy Contracts (10 minutes)

```bash
# Deploy to all networks
npm run deploy:reactive       # Deploy reactive contract
npm run deploy:sepolia        # Deploy Sepolia treasury
npm run deploy:arbitrum       # Deploy Arbitrum treasury

# Configure cross-chain system
npm run configure
npm run configure:sepolia
npm run configure:arbitrum
```

### Step 4: Fund and Monitor (10 minutes)

```bash
# Fund treasuries for demonstration
npm run fund:sepolia
npm run fund:arbitrum

# Start real-time monitoring
npm run monitor
```

## 📊 Verify Success

### Check Deployments
```bash
# Health check
npm run health-check

# Gas analysis
npm run gas-analysis

# Generate submission
npm run submission
```

### Expected Results
- ✅ All contracts deployed successfully
- ✅ Cross-chain configuration complete
- ✅ Treasuries funded and ready
- ✅ Real-time monitoring active
- ✅ System ready for autonomous operation

## 🎬 Demo Recording

### Preparation
```bash
# Start monitoring dashboard
npm run monitor

# Open another terminal for interaction
# Keep both visible for screen recording
```

### Demo Script
1. **Show deployed contracts** (30s)
   - Display contract addresses on explorers
   - Show treasury balances

2. **Demonstrate monitoring** (60s)
   - Real-time price feed tracking
   - Threshold configuration

3. **Trigger rebalancing** (120s)
   - Show significant price change
   - Demonstrate autonomous response
   - Highlight transaction hashes

4. **Show results** (30s)
   - Updated treasury allocations
   - REACT gas consumption
   - Cross-chain coordination

## 🏆 Hackathon Submission

### Generate Package
```bash
npm run hackathon:submit
```

### Submission Checklist
- [ ] All contracts deployed to mainnet
- [ ] Transaction hashes recorded
- [ ] Demo video created (max 5 minutes)
- [ ] GitHub repository public
- [ ] Documentation complete

## 🆘 Troubleshooting

### Common Issues

**"Insufficient funds for gas"**
```bash
# Check balance
npm run health-check
# Fund your account with ETH/REACT
```

**"Contract not found"**
```bash
# Verify deployment
npm run deploy:reactive
# Check .env variables
```

**"Tests failing"**
```bash
# Clean and reinstall
rm -rf node_modules
npm install
npm run test:all
```

### Get Help
- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Review `HACKATHON_CHECKLIST.md` for requirements
- Open GitHub issue for support
- Join Reactive Network developer chat

## 🎯 Success Metrics

Your system should achieve:
- **Continuous REACT gas usage** through price monitoring
- **Cross-chain transaction coordination**
- **Autonomous rebalancing** based on market conditions
- **Heavy transaction volume** during volatile periods

## 🏆 Ready to Win!

With this setup, you have:
- ✅ **Complete autonomous treasury system**
- ✅ **Heavy REACT gas consumption**
- ✅ **Real-world problem solution**
- ✅ **Production-ready implementation**
- ✅ **Professional documentation**

**Time to deploy and dominate the hackathon!** 🚀

---

Need help? Check the complete documentation or run `npm run health-check` for system diagnostics.