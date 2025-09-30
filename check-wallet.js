import('ethers').then(async ({ ethers }) => {
  const addr = '0x640116d16EDb68Ec8DdE40c4483bd7b5e436220d';

  console.log('Checking wallet balances...');
  console.log('Address:', addr);
  console.log('');

  try {
    const reactive = new ethers.JsonRpcProvider('https://mainnet-rpc.rnk.dev/');
    const sepolia = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
    const arbitrum = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');

    const [b1, b2, b3] = await Promise.all([
      reactive.getBalance(addr),
      sepolia.getBalance(addr),
      arbitrum.getBalance(addr)
    ]);

    console.log('Reactive Mainnet:', ethers.formatEther(b1), 'REACT');
    console.log('Sepolia Testnet:', ethers.formatEther(b2), 'ETH');
    console.log('Arbitrum Sepolia:', ethers.formatEther(b3), 'ETH');
    console.log('');

    if (parseFloat(ethers.formatEther(b2)) === 0) {
      console.log('⚠️  Get Sepolia ETH first from: https://sepoliafaucet.com/');
    }

    if (parseFloat(ethers.formatEther(b1)) === 0 && parseFloat(ethers.formatEther(b2)) > 0) {
      console.log('💡 Send SepETH to 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434 to get REACT tokens');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
});