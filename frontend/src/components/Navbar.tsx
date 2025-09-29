import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWeb3React } from '@web3-react/core';
import {
  HomeIcon,
  ChartBarIcon,
  EyeIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import { injectedConnector, walletConnectConnector } from '../App';
import toast from 'react-hot-toast';

const Navbar: React.FC = () => {
  const { active, account, activate, deactivate } = useWeb3React();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Portfolio', href: '/portfolio', icon: ChartBarIcon },
    { name: 'Monitoring', href: '/monitoring', icon: EyeIcon },
    { name: 'Admin', href: '/admin', icon: CogIcon },
  ];

  const connectWallet = async (connector: any, name: string) => {
    setIsConnecting(true);
    try {
      await activate(connector);
      toast.success(`Connected to ${name}`);
      localStorage.setItem('isWalletConnected', 'true');
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      toast.error(`Failed to connect to ${name}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    deactivate();
    localStorage.removeItem('isWalletConnected');
    toast.success('Wallet disconnected');
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <nav className=\"bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50\">
      <div className=\"container mx-auto px-4\">
        <div className=\"flex justify-between items-center h-16\">
          {/* Logo and Brand */}
          <div className=\"flex items-center space-x-4\">
            <Link to=\"/\" className=\"flex items-center space-x-3\">
              <div className=\"relative\">
                <div className=\"w-8 h-8 bg-gradient-to-r from-reactive-500 to-primary-500 rounded-lg flex items-center justify-center\">
                  <span className=\"text-white font-bold text-sm\">⚡</span>
                </div>
                <div className=\"pulse-ring opacity-50\"></div>
              </div>
              <div>
                <h1 className=\"text-xl font-bold gradient-text\">
                  DAO Treasury
                </h1>
                <p className=\"text-xs text-gray-400 -mt-1\">
                  Cross-Chain Automation
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className=\"hidden md:flex items-center space-x-1\">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-reactive-400 bg-reactive-900/50'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <item.icon className=\"w-4 h-4\" />
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId=\"navbar-indicator\"
                      className=\"absolute inset-0 bg-reactive-600/20 rounded-lg border border-reactive-500/30\"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className=\"flex items-center space-x-4\">
            {!active ? (
              <div className=\"relative\">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  disabled={isConnecting}
                  className=\"btn-primary flex items-center space-x-2\"
                >
                  <WalletIcon className=\"w-4 h-4\" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </button>

                {/* Wallet Options Dropdown */}
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className=\"absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2\"
                  >
                    <button
                      onClick={() => {
                        connectWallet(injectedConnector, 'MetaMask');
                        setIsMenuOpen(false);
                      }}
                      className=\"w-full px-4 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200\"
                    >
                      <div className=\"flex items-center space-x-3\">
                        <div className=\"w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-xs font-bold\">
                          M
                        </div>
                        <span>MetaMask</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        connectWallet(walletConnectConnector, 'WalletConnect');
                        setIsMenuOpen(false);
                      }}
                      className=\"w-full px-4 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200\"
                    >
                      <div className=\"flex items-center space-x-3\">
                        <div className=\"w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs font-bold\">
                          W
                        </div>
                        <span>WalletConnect</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className=\"flex items-center space-x-3\">
                <div className=\"flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-lg\">
                  <div className=\"status-dot status-active\"></div>
                  <span className=\"text-sm font-medium text-gray-300\">
                    {formatAddress(account!)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className=\"btn-secondary text-sm\"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className=\"md:hidden\">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className=\"text-gray-400 hover:text-white p-2\"
              >
                {isMenuOpen ? (
                  <XMarkIcon className=\"w-6 h-6\" />
                ) : (
                  <Bars3Icon className=\"w-6 h-6\" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className=\"md:hidden border-t border-gray-800 py-4\"
          >
            <div className=\"space-y-2\">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'text-reactive-400 bg-reactive-900/50'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <item.icon className=\"w-5 h-5\" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;