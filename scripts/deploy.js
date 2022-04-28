// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

async function main() {
  const [owner, acc2, acc3] = await ethers.getSigners();
  console.log({owner, acc2, acc3});

  const SharedWallet = await hre.ethers.getContractFactory('SharedWallet');
  const wallet = await SharedWallet.deploy([acc2.address, acc3.address], 1);

  await wallet.deployed();

  console.log('Wallet deployed to:', wallet.address);
  console.log('Wallet owner address:', owner.address);
  console.log('Wallet member 1 address:', acc2.address);
  console.log('Wallet member 2 address:', acc3.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
