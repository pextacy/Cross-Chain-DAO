import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen: React.FC = () => {
  return (
    <div className=\"min-h-screen bg-gray-950 flex items-center justify-center\">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className=\"text-center\"
      >
        <div className=\"relative mb-8\">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: \"linear\" }}
            className=\"w-16 h-16 border-4 border-gray-700 border-t-reactive-500 rounded-full mx-auto\"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className=\"absolute inset-0 w-16 h-16 border-4 border-reactive-500/20 rounded-full mx-auto\"
          />
        </div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className=\"text-2xl font-bold gradient-text mb-2\"
        >
          DAO Treasury Automation
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className=\"text-gray-400\"
        >
          Loading your cross-chain treasury dashboard...
        </motion.p>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, delay: 0.6 }}
          className=\"h-1 bg-gradient-to-r from-reactive-500 to-primary-500 rounded-full mt-8 max-w-xs mx-auto\"
        />
      </motion.div>
    </div>
  );
};

export default LoadingScreen;