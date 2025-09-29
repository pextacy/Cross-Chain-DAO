import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  valueColor?: string;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  valueColor,
  isLoading = false,
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success-400';
      case 'down':
        return 'text-danger-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendBgColor = () => {
    switch (trend) {
      case 'up':
        return 'bg-success-500/10';
      case 'down':
        return 'bg-danger-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className=\"metric-card group\"
    >
      <div className=\"flex items-start justify-between\">
        <div className=\"flex-1\">
          <p className=\"text-sm text-gray-400 mb-1\">{title}</p>
          {isLoading ? (
            <div className=\"animate-pulse\">
              <div className=\"h-8 bg-gray-700 rounded w-24 mb-2\"></div>
              <div className=\"h-4 bg-gray-700 rounded w-16\"></div>
            </div>
          ) : (
            <>
              <p className={`text-2xl font-bold mb-1 ${valueColor || 'text-gray-100'}`}>
                {value}
              </p>
              {change !== undefined && change !== 0 && (
                <div className=\"flex items-center space-x-1\">
                  {trend === 'up' ? (
                    <ArrowUpIcon className={`w-3 h-3 ${getTrendColor()}`} />
                  ) : trend === 'down' ? (
                    <ArrowDownIcon className={`w-3 h-3 ${getTrendColor()}`} />
                  ) : null}
                  <span className={`text-xs font-medium ${getTrendColor()}`}>
                    {Math.abs(change).toFixed(2)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={`p-3 rounded-lg ${getTrendBgColor()} group-hover:scale-110 transition-transform duration-200`}
        >
          <Icon className={`w-6 h-6 ${getTrendColor()}`} />
        </div>
      </div>

      {/* Animated bottom border */}
      <motion.div
        className=\"absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-reactive-500 to-primary-500\"
        initial={{ width: 0 }}
        whileInView={{ width: '100%' }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
    </motion.div>
  );
};

export default MetricCard;