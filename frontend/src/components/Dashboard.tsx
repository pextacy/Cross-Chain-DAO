import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  EyeIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useContracts } from '../hooks/useContracts';
import { useWeb3React } from '@web3-react/core';
import MetricCard from './MetricCard';
import PriceChart from './PriceChart';
import RecentActivity from './RecentActivity';
import SystemStatus from './SystemStatus';

const Dashboard: React.FC = () => {
  const { active, account } = useWeb3React();
  const { priceMonitor, treasuryVault, isLoading } = useContracts();
  const [systemMetrics, setSystemMetrics] = useState({
    totalValue: '0',
    rebalanceCount: 0,
    lastRebalance: 0,
    gasUsed: '0',
    ethPrice: 0,
    priceChange: 0,
  });

  const [isSystemActive, setIsSystemActive] = useState(false);

  useEffect(() => {
    if (active && account && treasuryVault) {
      loadSystemMetrics();
      const interval = setInterval(loadSystemMetrics, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [active, account, treasuryVault]);

  const loadSystemMetrics = async () => {
    try {
      if (treasuryVault) {
        const [totalValue, lastRebalance, rebalanceCount] = await treasuryVault.getPortfolioState();

        setSystemMetrics(prev => ({
          ...prev,
          totalValue: totalValue.toString(),
          rebalanceCount: rebalanceCount.toNumber(),
          lastRebalance: lastRebalance.toNumber(),
        }));

        setIsSystemActive(true);
      }

      // Simulate ETH price data (in real app, fetch from API)
      const mockEthPrice = 2000 + Math.random() * 400;
      const mockPriceChange = (Math.random() - 0.5) * 20;

      setSystemMetrics(prev => ({
        ...prev,
        ethPrice: mockEthPrice,
        priceChange: mockPriceChange,
      }));
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      setIsSystemActive(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  if (!active) {
    return (
      <div className=\"min-h-[60vh] flex items-center justify-center\">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className=\"text-center\"
        >
          <div className=\"w-16 h-16 bg-reactive-600/20 rounded-full flex items-center justify-center mx-auto mb-4\">
            <BoltIcon className=\"w-8 h-8 text-reactive-400\" />
          </div>
          <h2 className=\"text-2xl font-bold text-gray-100 mb-2\">
            Connect Your Wallet
          </h2>
          <p className=\"text-gray-400 mb-6 max-w-md\">
            Connect your wallet to access the Cross-Chain DAO Treasury Automation dashboard
            and monitor your autonomous treasury operations.
          </p>
          <div className=\"inline-flex items-center space-x-2 text-reactive-400 text-sm font-medium\">
            <GlobeAltIcon className=\"w-4 h-4\" />
            <span>Multi-chain ready • Reactive Network powered</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial=\"hidden\"
      animate=\"visible\"
      className=\"space-y-8\"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className=\"\">
        <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between\">
          <div>
            <h1 className=\"text-3xl font-bold gradient-text mb-2\">
              Treasury Dashboard
            </h1>
            <p className=\"text-gray-400\">
              Monitor your autonomous cross-chain treasury operations
            </p>
          </div>
          <div className=\"mt-4 sm:mt-0\">
            <SystemStatus
              isActive={isSystemActive}
              lastUpdate={Date.now()}
            />
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        variants={itemVariants}
        className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\"
      >
        <MetricCard
          title=\"Total Portfolio Value\"
          value={`$${(parseFloat(systemMetrics.totalValue) / 1e18 * systemMetrics.ethPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change={systemMetrics.priceChange}
          icon={CurrencyDollarIcon}
          trend={systemMetrics.priceChange > 0 ? 'up' : 'down'}
        />

        <MetricCard
          title=\"ETH Price\"
          value={`$${systemMetrics.ethPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change={systemMetrics.priceChange}
          icon={systemMetrics.priceChange > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
          trend={systemMetrics.priceChange > 0 ? 'up' : 'down'}
        />

        <MetricCard
          title=\"Total Rebalances\"
          value={systemMetrics.rebalanceCount.toString()}
          change={0}
          icon={ChartBarIcon}
          trend=\"neutral\"
        />

        <MetricCard
          title=\"System Status\"
          value={isSystemActive ? 'Active' : 'Inactive'}
          change={0}
          icon={EyeIcon}
          trend={isSystemActive ? 'up' : 'down'}
          valueColor={isSystemActive ? 'text-success-400' : 'text-danger-400'}
        />
      </motion.div>

      {/* Charts and Activity */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">
        {/* Price Chart */}
        <motion.div variants={itemVariants}>
          <PriceChart />
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <RecentActivity />
        </motion.div>
      </div>

      {/* Treasury Allocation */}
      <motion.div variants={itemVariants}>
        <div className=\"card\">
          <div className=\"card-header\">
            <div className=\"flex items-center justify-between\">
              <h3 className=\"text-lg font-semibold text-gray-100\">
                Portfolio Allocation
              </h3>
              <div className=\"flex items-center space-x-2 text-sm text-gray-400\">
                <ClockIcon className=\"w-4 h-4\" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            {/* ETH Allocation */}
            <div className=\"space-y-3\">
              <div className=\"flex items-center justify-between\">
                <div className=\"flex items-center space-x-2\">
                  <div className=\"w-3 h-3 bg-blue-500 rounded-full\"></div>
                  <span className=\"text-gray-300 font-medium\">ETH</span>
                </div>
                <span className=\"text-gray-100 font-semibold\">50%</span>
              </div>
              <div className=\"progress-bar h-2\">
                <div className=\"progress-fill w-1/2\"></div>
              </div>
              <div className=\"text-sm text-gray-400\">
                Target: 50% | Current: 50%
              </div>
            </div>

            {/* USDC Allocation */}
            <div className=\"space-y-3\">
              <div className=\"flex items-center justify-between\">
                <div className=\"flex items-center space-x-2\">
                  <div className=\"w-3 h-3 bg-green-500 rounded-full\"></div>
                  <span className=\"text-gray-300 font-medium\">USDC</span>
                </div>
                <span className=\"text-gray-100 font-semibold\">50%</span>
              </div>
              <div className=\"progress-bar h-2\">
                <div className=\"progress-fill w-1/2 bg-gradient-to-r from-green-500 to-emerald-500\"></div>
              </div>
              <div className=\"text-sm text-gray-400\">
                Target: 50% | Current: 50%
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Network Status */}
      <motion.div variants={itemVariants}>
        <div className=\"card\">
          <div className=\"card-header\">
            <h3 className=\"text-lg font-semibold text-gray-100\">
              Network Status
            </h3>
          </div>

          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
            <div className=\"flex items-center justify-between p-4 bg-gray-800 rounded-lg\">
              <div>
                <p className=\"text-sm text-gray-400\">Reactive Network</p>
                <p className=\"text-lg font-semibold text-gray-100\">Monitoring</p>
              </div>
              <div className=\"status-dot status-active\"></div>
            </div>

            <div className=\"flex items-center justify-between p-4 bg-gray-800 rounded-lg\">
              <div>
                <p className=\"text-sm text-gray-400\">Ethereum</p>
                <p className=\"text-lg font-semibold text-gray-100\">Treasury</p>
              </div>
              <div className=\"status-dot status-active\"></div>
            </div>

            <div className=\"flex items-center justify-between p-4 bg-gray-800 rounded-lg\">
              <div>
                <p className=\"text-sm text-gray-400\">Arbitrum</p>
                <p className=\"text-lg font-semibold text-gray-100\">Treasury</p>
              </div>
              <div className=\"status-dot status-active\"></div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;