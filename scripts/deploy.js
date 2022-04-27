// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
require('hardhat-ethernal');


async function main() {
  const [owner, acc2, acc3] = await ethers.getSigners()

  // We get the contract to deploy
  const SharedWallet = await hre.ethers.getContractFactory('SharedWallet')
  const wallet = await SharedWallet.deploy([acc2.address, acc3.address], 1)

  await wallet.deployed()

  console.log('Wallet deployed to:', wallet.address)

  await hre.ethernal.push({
    name: 'SharedWallet',
    address: wallet.address,
  })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
