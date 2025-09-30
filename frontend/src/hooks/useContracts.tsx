import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import toast from 'react-hot-toast';
import PriceMonitorABI from '../contracts/abis/PriceMonitorReactive.json';
import TreasuryVaultABI from '../contracts/abis/TreasuryVault.json';

// Contract addresses (will be set via environment variables or config file)
const CONTRACT_ADDRESSES = {
  PRICE_MONITOR: {
    31337: process.env.REACT_APP_REACTIVE_PRICE_MONITOR || '', // Local Hardhat
    1597: process.env.REACT_APP_REACTIVE_PRICE_MONITOR || '', // Reactive Mainnet
  },
  TREASURY_VAULT: {
    31337: process.env.REACT_APP_SEPOLIA_TREASURY || '', // Local Hardhat
    11155111: process.env.REACT_APP_SEPOLIA_TREASURY || '', // Sepolia
    421614: process.env.REACT_APP_ARBITRUM_TREASURY || '', // Arbitrum Sepolia
  }
};

interface ContractsContextType {
  priceMonitor: ethers.Contract | null;
  treasuryVault: ethers.Contract | null;
  isLoading: boolean;
  error: string | null;
  switchToReactiveNetwork: () => Promise<void>;
  switchToChain: (chainId: number) => Promise<void>;
  getContractAddress: (contract: string, chainId?: number) => string;
  refreshContracts: () => Promise<void>;
}

const ContractsContext = createContext<ContractsContextType | undefined>(undefined);

interface ContractProviderProps {
  children: ReactNode;
}

export const ContractProvider: React.FC<ContractProviderProps> = ({ children }) => {
  const { active, library, chainId, account } = useWeb3React();
  const [priceMonitor, setPriceMonitor] = useState<ethers.Contract | null>(null);
  const [treasuryVault, setTreasuryVault] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (active && library && chainId && account) {
      loadContracts();
    } else {
      setPriceMonitor(null);
      setTreasuryVault(null);
    }
  }, [active, library, chainId, account]);

  const loadContracts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = library.getSigner();

      // Load PriceMonitor on Reactive Mainnet or Local
      const priceMonitorAddress = CONTRACT_ADDRESSES.PRICE_MONITOR[chainId as keyof typeof CONTRACT_ADDRESSES.PRICE_MONITOR];
      if (priceMonitorAddress) {
        const priceMonitorContract = new ethers.Contract(
          priceMonitorAddress,
          PriceMonitorABI,
          signer
        );
        setPriceMonitor(priceMonitorContract);
        console.log('PriceMonitor loaded:', priceMonitorAddress);
      }

      // Load TreasuryVault on current chain
      const treasuryAddress = CONTRACT_ADDRESSES.TREASURY_VAULT[chainId as keyof typeof CONTRACT_ADDRESSES.TREASURY_VAULT];
      if (treasuryAddress) {
        const treasuryContract = new ethers.Contract(
          treasuryAddress,
          TreasuryVaultABI,
          signer
        );
        setTreasuryVault(treasuryContract);
        console.log('TreasuryVault loaded:', treasuryAddress);
      }

    } catch (err: any) {
      console.error('Failed to load contracts:', err);
      setError(err.message || 'Failed to load contracts');
      toast.error('Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshContracts = async () => {
    await loadContracts();
  };

  const switchToReactiveNetwork = async () => {
    if (!library?.provider) {
      toast.error('No wallet provider found');
      return;
    }

    try {
      await library.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x63D' }], // 1597 in hex
      });
      toast.success('Switched to Reactive Mainnet');
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await library.provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x63D',
                chainName: 'Reactive Mainnet',
                nativeCurrency: {
                  name: 'REACT',
                  symbol: 'REACT',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet-rpc.rnk.dev/'],
                blockExplorerUrls: ['https://reactscan.net/'],
              },
            ],
          });
          toast.success('Reactive Network added successfully');
        } catch (addError) {
          console.error('Failed to add Reactive Network:', addError);
          toast.error('Failed to add Reactive Network to wallet');
        }
      } else {
        console.error('Failed to switch to Reactive Network:', switchError);
        toast.error('Failed to switch to Reactive Network');
      }
    }
  };

  const switchToChain = async (targetChainId: number) => {
    if (!library?.provider) {
      toast.error('No wallet provider found');
      return;
    }

    try {
      await library.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      toast.success(`Switched to chain ${targetChainId}`);
    } catch (error: any) {
      console.error(`Failed to switch to chain ${targetChainId}:`, error);
      toast.error(`Failed to switch to chain ${targetChainId}`);
    }
  };

  const getContractAddress = (contract: string, targetChainId?: number) => {
    const currentChainId = targetChainId || chainId;

    switch (contract) {
      case 'PRICE_MONITOR':
        return CONTRACT_ADDRESSES.PRICE_MONITOR[1597] || '';
      case 'TREASURY_VAULT':
        return CONTRACT_ADDRESSES.TREASURY_VAULT[currentChainId as keyof typeof CONTRACT_ADDRESSES.TREASURY_VAULT] || '';
      default:
        return '';
    }
  };

  const contextValue: ContractsContextType = {
    priceMonitor,
    treasuryVault,
    isLoading,
    error,
    switchToReactiveNetwork,
    switchToChain,
    getContractAddress,
    refreshContracts,
  };

  return (
    <ContractsContext.Provider value={contextValue}>
      {children}
    </ContractsContext.Provider>
  );
};

export const useContracts = (): ContractsContextType => {
  const context = useContext(ContractsContext);
  if (context === undefined) {
    throw new Error('useContracts must be used within a ContractProvider');
  }
  return context;
};

// Hook for listening to contract events
export const useContractEvents = () => {
  const { priceMonitor, treasuryVault } = useContracts();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!priceMonitor && !treasuryVault) return;

    const eventListeners: any[] = [];

    // Listen to PriceMonitor events
    if (priceMonitor) {
      const onPriceThresholdBreached = (
        feedId: string,
        oldPrice: any,
        newPrice: any,
        changePercent: any,
        timestamp: any,
        event: any
      ) => {
        const newEvent = {
          type: 'PriceThresholdBreached',
          data: { feedId, oldPrice, newPrice, changePercent, timestamp },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(),
        };
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
        toast.success(`Price threshold breached: ${(Number(changePercent) / 100).toFixed(2)}%`);
      };

      const onRebalanceTriggered = (
        chainId: any,
        treasury: string,
        feedId: string,
        price: any,
        event: any
      ) => {
        const newEvent = {
          type: 'RebalanceTriggered',
          data: { chainId, treasury, feedId, price },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(),
        };
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        toast.success('Rebalancing triggered!');
      };

      priceMonitor.on('PriceThresholdBreached', onPriceThresholdBreached);
      priceMonitor.on('RebalanceTriggered', onRebalanceTriggered);

      eventListeners.push(
        () => priceMonitor.off('PriceThresholdBreached', onPriceThresholdBreached),
        () => priceMonitor.off('RebalanceTriggered', onRebalanceTriggered)
      );
    }

    // Listen to TreasuryVault events
    if (treasuryVault) {
      const onRebalanceExecuted = (
        feedId: string,
        tokenFrom: string,
        tokenTo: string,
        amount: any,
        triggerPrice: any,
        event: any
      ) => {
        const newEvent = {
          type: 'RebalanceExecuted',
          data: { feedId, tokenFrom, tokenTo, amount, triggerPrice },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(),
        };
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        toast.success('Rebalancing executed successfully!');
      };

      const onEmergencyPaused = (by: string, timestamp: any, event: any) => {
        const newEvent = {
          type: 'EmergencyPaused',
          data: { by, timestamp },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(),
        };
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        toast.error('System paused by emergency action!');
      };

      const onAssetAdded = (assetId: string, token: string, targetAllocation: any, event: any) => {
        const newEvent = {
          type: 'AssetAdded',
          data: { assetId, token, targetAllocation },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(),
        };
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        toast.success('New asset added to portfolio!');
      };

      treasuryVault.on('RebalanceExecuted', onRebalanceExecuted);
      treasuryVault.on('EmergencyPaused', onEmergencyPaused);
      treasuryVault.on('AssetAdded', onAssetAdded);

      eventListeners.push(
        () => treasuryVault.off('RebalanceExecuted', onRebalanceExecuted),
        () => treasuryVault.off('EmergencyPaused', onEmergencyPaused),
        () => treasuryVault.off('AssetAdded', onAssetAdded)
      );
    }

    // Cleanup function
    return () => {
      eventListeners.forEach(cleanup => cleanup());
    };
  }, [priceMonitor, treasuryVault]);

  return { events };
};

// Hook for contract data fetching
export const useContractData = () => {
  const { priceMonitor, treasuryVault } = useContracts();
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPortfolioData = async () => {
    if (!treasuryVault) return;

    setLoading(true);
    try {
      const portfolioState = await treasuryVault.getPortfolioState();
      setPortfolioData({
        totalValue: portfolioState[0],
        lastRebalance: portfolioState[1],
        rebalanceCount: portfolioState[2],
      });
    } catch (err) {
      console.error('Failed to fetch portfolio data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoringData = async () => {
    if (!priceMonitor) return;

    setLoading(true);
    try {
      const feedCount = await priceMonitor.getFeedCount();
      const treasuryCount = await priceMonitor.getTreasuryCount();

      setMonitoringData({
        feedCount: Number(feedCount),
        treasuryCount: Number(treasuryCount),
      });
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (treasuryVault) {
      fetchPortfolioData();
    }
    if (priceMonitor) {
      fetchMonitoringData();
    }
  }, [treasuryVault, priceMonitor]);

  return {
    portfolioData,
    monitoringData,
    loading,
    refetch: () => {
      fetchPortfolioData();
      fetchMonitoringData();
    }
  };
};