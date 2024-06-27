import fs from 'fs'
import Web3 from 'web3'

import { sendContractCall } from '../utils/web3utils.js';
import {
      getAddress,
      getPrivateKey,
      getBalance
  } from '../utils/ganache.js';

import factoryV3Artifact from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json' assert { type: "json" };

const ERC20Addrs = JSON.parse(fs.readFileSync('../addr/ERC20Addr.json'))
const contractAddrs = JSON.parse(fs.readFileSync('../uniswap-deploy-v3/contractAddress.json'))

console.log("ERC20Addrs : ", ERC20Addrs)
console.log("contractAddrs : ", contractAddrs)

const createPool = async () => {
      const rpc = 'http://localhost:8545'
      const web3 = new Web3(rpc);

      const owner = getAddress();
      const sk = getPrivateKey();

      const FactoryContract = new web3.eth.Contract(factoryV3Artifact.abi, contractAddrs.v3CoreFactoryAddress);

      await sendContractCall(
            FactoryContract.methods.createPool(
                  ERC20Addrs.USDT,
                  ERC20Addrs.USDC,
                  3000
            ),
            contractAddrs.v3CoreFactoryAddress,
            owner,
            sk
      )

      console.log("pool Address : ", await FactoryContract.methods.getPool(ERC20Addrs.USDT, ERC20Addrs.USDC, 3000).call())
}

createPool()