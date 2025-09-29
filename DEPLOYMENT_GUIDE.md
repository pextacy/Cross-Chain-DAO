# Deployment Guide - Cross-Chain DAO Treasury Automation

This guide provides step-by-step instructions for deploying and configuring the Cross-Chain DAO Treasury system.

## Prerequisites

1. **Node.js** (v16+) and **npm** installed
2. **Private key** with funds on Reactive Network, Ethereum Sepolia, and Arbitrum Sepolia
3. **RPC endpoints** for all target networks
4. **API keys** for contract verification (optional)

## Step 1: Environment Setup

1. Clone the repository:
```bash
git clone [REPOSITORY_URL]
cd reactive-hackathon
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure `.env`:
```env
# Private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
REACTIVE_RPC_URL=https://rpc.reactive.network

# Verification API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
```

## Step 2: Compile Contracts

```bash
npm run compile
```

Expected output:
```
Compiled 10 Solidity files successfully
```

## Step 3: Deploy on Reactive Network

Deploy the core monitoring contract:

```bash
npm run deploy:reactive
```

**Expected Output:**
```
=== Deploying Reactive Smart Contracts ===
PriceMonitorReactive deployed to: 0x1234...
Adding ETH/USD price feed...
Price feeds configured successfully

=== Deployment Summary ===
{
  "network": "Reactive",
  "chainId": 5318008,
  "contracts": {
    "priceMonitor": "0x1234..."
  }
}
```

**📝 Save this address: `REACTIVE_PRICE_MONITOR=0x1234...`**

## Step 4: Deploy Treasury Contracts

### Deploy on Ethereum Sepolia:
```bash
npm run deploy:sepolia
```

**Expected Output:**
```
=== Deploying Treasury Vault ===
TreasuryVault deployed to: 0x5678...
Configuring treasury assets...
Assets configured successfully

=== Deployment Summary ===
{
  "network": "Sepolia",
  "contracts": {
    "treasury": "0x5678..."
  }
}
```

**📝 Save this address: `SEPOLIA_TREASURY=0x5678...`**

### Deploy on Arbitrum Sepolia:
```bash
npm run deploy:arbitrum
```

**Expected Output:**
```
=== Deploying Treasury Vault ===
TreasuryVault deployed to: 0x9ABC...
Configuring treasury assets...
Assets configured successfully
```

**📝 Save this address: `ARBITRUM_TREASURY=0x9ABC...`**

## Step 5: Configure Cross-Chain System

Update your `.env` with deployed addresses:
```env
REACTIVE_PRICE_MONITOR=0x1234...
SEPOLIA_TREASURY=0x5678...
ARBITRUM_TREASURY=0x9ABC...
```

Run configuration script:
```bash
npm run configure
```

**Expected Output:**
```
Adding treasury contracts to PriceMonitorReactive...
Adding Sepolia treasury: 0x5678...
Sepolia treasury added
Adding Arbitrum treasury: 0x9ABC...
Arbitrum treasury added

=== Configuration Complete ===
System is now ready for autonomous treasury management!

=== System Status ===
Price feeds monitored: 2
Treasury contracts: 2
```

## Step 6: Set Treasury Permissions

### For Sepolia Treasury:
```bash
CONFIGURE_TREASURY=sepolia npm run configure
```

### For Arbitrum Treasury:
```bash
CONFIGURE_TREASURY=arbitrum npm run configure
```

## Step 7: Fund Treasuries for Demo

### Fund Sepolia Treasury:
```bash
TREASURY_ADDRESS=$SEPOLIA_TREASURY USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 npm run fund:sepolia
```

### Fund Arbitrum Treasury:
```bash
TREASURY_ADDRESS=$ARBITRUM_TREASURY USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d npm run fund:arbitrum
```

**Expected Output:**
```
Sent 1.0 ETH to treasury
Transaction hash: 0xABCD...
Sent 1000.0 USDC to treasury
Transaction hash: 0xEFGH...

=== Treasury Balance Check ===
ETH Balance: 1.0 ETH
USDC Balance: 1000.0 USDC
```

## Step 8: Verification (Optional)

Verify contracts on block explorers:

```bash
# Verify Reactive contract
npm run verify:reactive

# Verify Sepolia contract
npm run verify:sepolia

# Verify Arbitrum contract
npm run verify:arbitrum
```

## Deployment Summary

After successful deployment, you should have:

| Component | Network | Address | Status |
|-----------|---------|---------|---------|
| PriceMonitorReactive | Reactive Mainnet | `0x1234...` | ✅ Deployed |
| TreasuryVault | Ethereum Sepolia | `0x5678...` | ✅ Deployed |
| TreasuryVault | Arbitrum Sepolia | `0x9ABC...` | ✅ Deployed |

## Testing the System

1. **Monitor price changes**: ETH price movements > 10% will trigger rebalancing
2. **Check transaction history**: Look for autonomous rebalancing transactions
3. **Verify REACT usage**: Monitor Reactive Network for gas consumption
4. **Track portfolio changes**: Treasury allocations should adjust automatically

## Transaction Verification

Record these transaction hashes for hackathon submission:

```
Reactive Contract Deployment: 0x...
Sepolia Treasury Deployment: 0x...
Arbitrum Treasury Deployment: 0x...
Price Feed Configuration: 0x...
Treasury Funding: 0x...
First Rebalancing: 0x... (when it occurs)
```

## Troubleshooting

### Common Issues:

1. **"Insufficient funds"**: Ensure your wallet has native tokens for gas on each network
2. **"Unknown feed"**: Verify price feed addresses match the deployed Chainlink contracts
3. **"Not authorized reactive"**: Run the configuration step to set reactive permissions
4. **"Contract not found"**: Double-check deployed addresses in .env file

### Getting Help:

- Check the [Reactive Network Documentation](https://dev.reactive.network/)
- Join the [Developer Chat](https://t.me/reactivedevs)
- Review deployment logs in `deployments/` folder

## Next Steps

1. **Monitor Operation**: Watch for autonomous rebalancing based on price movements
2. **Document Results**: Record transaction hashes and REACT gas usage
3. **Create Demo**: Prepare video demonstration of the system in action
4. **Submit to Hackathon**: Include all required deliverables

---

🎉 **Congratulations!** Your Cross-Chain DAO Treasury Automation system is now live and ready for the hackathon evaluation period!