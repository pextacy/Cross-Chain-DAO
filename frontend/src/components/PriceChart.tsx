import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface PriceData {
  time: string;
  price: number;
  volume: number;
}

const PriceChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1H');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateMockData();
    const interval = setInterval(generateMockData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const generateMockData = () => {
    setIsLoading(true);

    // Generate realistic ETH price data
    const basePrice = 2000;
    const dataPoints = timeframe === '1H' ? 60 : timeframe === '24H' ? 24 : 7;
    const data: PriceData[] = [];

    let currentPrice = basePrice + Math.random() * 400;

    for (let i = dataPoints; i >= 0; i--) {
      const priceChange = (Math.random() - 0.5) * 50;
      currentPrice += priceChange;
      currentPrice = Math.max(1500, Math.min(3000, currentPrice)); // Keep within reasonable bounds

      const now = new Date();
      let timeLabel = '';

      if (timeframe === '1H') {
        const time = new Date(now.getTime() - i * 60000); // 1 minute intervals
        timeLabel = time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (timeframe === '24H') {
        const time = new Date(now.getTime() - i * 3600000); // 1 hour intervals
        timeLabel = time.toLocaleTimeString('en-US', {
          hour: '2-digit'
        });
      } else {
        const time = new Date(now.getTime() - i * 86400000); // 1 day intervals
        timeLabel = time.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }

      data.push({
        time: timeLabel,
        price: currentPrice,
        volume: Math.random() * 1000 + 500,
      });
    }

    setPriceData(data);
    setIsLoading(false);
  };

  const timeframes = ['1H', '24H', '7D'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className=\"bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl\">
          <p className=\"text-gray-300 text-sm mb-1\">{label}</p>
          <p className=\"text-reactive-400 font-semibold\">
            ${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : 0;
  const previousPrice = priceData.length > 1 ? priceData[priceData.length - 2].price : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className=\"card\">
      <div className=\"card-header\">
        <div className=\"flex items-center justify-between\">
          <div>
            <h3 className=\"text-lg font-semibold text-gray-100\">ETH Price</h3>
            <div className=\"flex items-center space-x-2 mt-1\">
              <span className=\"text-2xl font-bold text-gray-100\">
                ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-sm font-medium ${\n                  priceChangePercent >= 0 ? 'text-success-400' : 'text-danger-400'\n                }`}
              >
                {priceChangePercent >= 0 ? '+' : ''}\n                {priceChangePercent.toFixed(2)}%\n              </span>
            </div>
          </div>

          <div className=\"flex space-x-1 bg-gray-800 rounded-lg p-1\">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors duration-200 ${\n                  timeframe === tf\n                    ? 'bg-reactive-600 text-white'\n                    : 'text-gray-400 hover:text-white hover:bg-gray-700'\n                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className=\"h-64 mt-4\">
        {isLoading ? (
          <div className=\"flex items-center justify-center h-full\">
            <div className=\"loading-spinner\"></div>
          </div>
        ) : (
          <ResponsiveContainer width=\"100%\" height=\"100%\">
            <LineChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#374151\" />
              <XAxis
                dataKey=\"time\"
                stroke=\"#9CA3AF\"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke=\"#9CA3AF\"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type=\"monotone\"
                dataKey=\"price\"
                stroke=\"#0ea5e9\"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#0ea5e9',
                  stroke: '#1e3a8a',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Price Threshold Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className=\"mt-4 p-3 bg-gray-800 rounded-lg\"
      >
        <div className=\"flex items-center justify-between text-sm\">
          <span className=\"text-gray-400\">Rebalance Threshold:</span>
          <span className=\"text-warning-400 font-medium\">±10%</span>
        </div>
        <div className=\"mt-2 text-xs text-gray-500\">
          Current change from last rebalance: {priceChangePercent.toFixed(2)}%\n        </div>
      </motion.div>
    </div>
  );
};

export default PriceChart;