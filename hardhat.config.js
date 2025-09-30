require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    reactive: {
      url: process.env.REACTIVE_RPC_URL || "https://mainnet-rpc.rnk.dev/",
      chainId: 1597,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      reactive: "reactive-api-key",
      sepolia: process.env.ETHERSCAN_API_KEY,
      arbitrumSepolia: process.env.ARBISCAN_API_KEY
    },
    customChains: [
      {
        network: "reactive",
        chainId: 1597,
        urls: {
          apiURL: "https://api.reactive.network/api",
          browserURL: "https://reactscan.net"
        }
      }
    ]
  }
};