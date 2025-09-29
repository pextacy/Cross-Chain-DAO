import React from 'react';
import { motion } from 'framer-motion';

interface SystemStatusProps {
  isActive: boolean;
  lastUpdate: number;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ isActive, lastUpdate }) => {
  const formatLastUpdate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className=\"flex items-center space-x-3\"
    >
      <div className=\"flex items-center space-x-2\">
        <div className=\"relative\">
          <div
            className={`status-dot ${
              isActive ? 'status-active' : 'status-inactive'
            }`}
          ></div>
          {isActive && (
            <div className=\"pulse-ring\"></div>
          )}
        </div>
        <div>
          <p className=\"text-sm font-medium text-gray-100\">
            {isActive ? 'System Active' : 'System Inactive'}
          </p>
          <p className=\"text-xs text-gray-400\">
            Last update: {formatLastUpdate(lastUpdate)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SystemStatus;