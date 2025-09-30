// Contract addresses configuration
// Update these addresses after deploying contracts

export interface NetworkConfig {
  rpcUrl: string;
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export const NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    rpcUrl: 'http://localhost:8545',
    chainId: 31337,
    name: 'Hardhat Local',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: '',
  },
  1597: {
    rpcUrl: 'https://mainnet-rpc.rnk.dev/',
    chainId: 1597,
    name: 'Reactive Mainnet',
    nativeCurrency: {
      name: 'REACT',
      symbol: 'REACT',
      decimals: 18,
    },
    blockExplorerUrl: 'https://reactscan.net/',
  },
  11155111: {
    rpcUrl: process.env.REACT_APP_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    chainId: 11155111,
    name: 'Sepolia',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://sepolia.etherscan.io',
  },
  421614: {
    rpcUrl: process.env.REACT_APP_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Arbitrum Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
  },
};

// Contract addresses - update these after deployment
export const CONTRACT_ADDRESSES = {
  PRICE_MONITOR: {
    31337: process.env.REACT_APP_REACTIVE_PRICE_MONITOR || '0x0000000000000000000000000000000000000000',
    1597: process.env.REACT_APP_REACTIVE_PRICE_MONITOR || '0x0000000000000000000000000000000000000000',
  },
  TREASURY_VAULT: {
    31337: process.env.REACT_APP_SEPOLIA_TREASURY || '0x0000000000000000000000000000000000000000',
    11155111: process.env.REACT_APP_SEPOLIA_TREASURY || '0x0000000000000000000000000000000000000000',
    421614: process.env.REACT_APP_ARBITRUM_TREASURY || '0x0000000000000000000000000000000000000000',
  },
};

// Chainlink Price Feed addresses (for reference)
export const PRICE_FEEDS = {
  ETH_USD: {
    11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia ETH/USD
    421614: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165', // Arbitrum Sepolia ETH/USD
  },
};

// Token addresses
export const TOKENS = {
  WETH: {
    11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH
    421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // Arbitrum Sepolia WETH
  },
  USDC: {
    11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC (mock)
    421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
  },
};

// Helper functions
export const getContractAddress = (
  contractName: keyof typeof CONTRACT_ADDRESSES,
  chainId: number
): string => {
  const addresses = CONTRACT_ADDRESSES[contractName];
  if (!addresses) return '';
  return (addresses as any)[chainId] || '';
};

export const getNetworkConfig = (chainId: number): NetworkConfig | null => {
  return NETWORKS[chainId] || null;
};

export const getPriceFeedAddress = (
  feedName: keyof typeof PRICE_FEEDS,
  chainId: number
): string => {
  const feeds = PRICE_FEEDS[feedName];
  if (!feeds) return '';
  return (feeds as any)[chainId] || '';
};

export const getTokenAddress = (
  tokenName: keyof typeof TOKENS,
  chainId: number
): string => {
  const tokens = TOKENS[tokenName];
  if (!tokens) return '';
  return (tokens as any)[chainId] || '';
};

// Generate feed ID for contracts
export const generateFeedId = (feedName: string): string => {
  return ethers.utils.id(feedName);
};

// Format addresses for display
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Check if address is valid
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
};

// Export ethers for convenience
import { ethers } from 'ethers';
export { ethers };