import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Monitoring from './components/Monitoring';
import Admin from './components/Admin';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { ContractProvider } from './hooks/useContracts';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Connector configurations
export const injectedConnector = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 1337, 5318008, 11155111, 421614], // Include Reactive Network
});

export const walletConnectConnector = new WalletConnectConnector({
  rpc: {
    1: process.env.REACT_APP_MAINNET_RPC || '',
    5318008: process.env.REACT_APP_REACTIVE_RPC || 'https://rpc.reactive.network',
    11155111: process.env.REACT_APP_SEPOLIA_RPC || '',
    421614: process.env.REACT_APP_ARBITRUM_SEPOLIA_RPC || '',
  },
  bridge: 'https://bridge.walletconnect.org',
  qrcode: true,
  pollingInterval: 12000,
});

const App: React.FC = () => {
  const { active, account, library, connector, activate, deactivate, error } = useWeb3React();
  const [loading, setLoading] = useState(true);

  // Auto-connect on page load
  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      if (localStorage?.getItem('isWalletConnected') === 'true') {
        try {
          await activate(injectedConnector);
        } catch (ex) {
          console.log('Failed to auto-connect wallet:', ex);
        }
      }
      setLoading(false);
    };
    connectWalletOnPageLoad();
  }, [activate]);

  // Store wallet connection state
  useEffect(() => {
    if (account) {
      localStorage.setItem('isWalletConnected', 'true');
    } else {
      localStorage.removeItem('isWalletConnected');
    }
  }, [account]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ContractProvider>
        <Router>
          <div className=\"min-h-screen bg-gray-950\">
            <Navbar />

            <motion.main
              initial=\"initial\"
              animate=\"in\"
              exit=\"out\"
              variants={pageVariants}
              transition={pageTransition}
              className=\"container mx-auto px-4 py-8\"
            >
              <Routes>
                <Route path=\"/\" element={<Dashboard />} />
                <Route path=\"/portfolio\" element={<Portfolio />} />
                <Route path=\"/monitoring\" element={<Monitoring />} />
                <Route path=\"/admin\" element={<Admin />} />
              </Routes>
            </motion.main>

            {/* Background decorations */}
            <div className=\"fixed inset-0 -z-10 overflow-hidden\">
              <div className=\"absolute -top-40 -right-40 w-80 h-80 bg-reactive-500/10 rounded-full blur-3xl\"></div>
              <div className=\"absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl\"></div>
            </div>

            {/* Connection status indicator */}
            {active && (
              <div className=\"fixed bottom-4 right-4 z-50\">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className=\"flex items-center space-x-2 bg-success-600 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg\"
                >
                  <div className=\"status-dot status-active\"></div>
                  <span>Connected</span>
                </motion.div>
              </div>
            )}

            {error && (
              <div className=\"fixed bottom-4 left-4 z-50\">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className=\"flex items-center space-x-2 bg-danger-600 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg\"
                >
                  <div className=\"status-dot status-error\"></div>
                  <span>Connection Error</span>
                </motion.div>
              </div>
            )}
          </div>
        </Router>
      </ContractProvider>
    </ErrorBoundary>
  );
};

export default App;