# Shared Wallet

This project implements a basic shared wallet through a smart contract.
A shared wallet is a wallet where transactions need to be approved by multiple accounts before being executed.

The wallet is deployed with: - a set of members - the required number of approvals to be able to execute a transaction

Each wallet member may: - propose a transaction - approve a transaction proposed by other members - revoke own approvals (if transaction has not been yet executed) - execute own transaction proposals if required number of approvals has been reached

## Setup

To deploy this smart contract in a local development network:

```shell
# boots up a local development ethereum network
$ npx hardhat node

# run this in another terminal
$ npx hardhat run --network localhost scripts/deploy.js

# to interact with the deployed contract (check hardhat docs for more details)
$ npx hardhat console --network localhost
```

## Tests

Tests are written in javascript and located in `test/SharedWallet_test.js`

To run unit tests:

```shell
$ npx hardhat test
```

To run unit tests with coverage:
```shell
$ npx hardhat coverage
```

## Ropsten Testnet Addresses

- Shared Wallet contract: [0xcfd7fe6098b60237ba7c1913c5d84f4f8ccbe749](https://ropsten.etherscan.io/address/0xcfd7fe6098b60237ba7c1913c5d84f4f8ccbe749)
- Shared Wallet deployer account: [0xbfe5AD133d7f0e7Dfe837A10540151D9B157f8d6](https://ropsten.etherscan.io/address/0xbfe5AD133d7f0e7Dfe837A10540151D9B157f8d6)