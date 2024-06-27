import Web3 from 'web3';
import fs from 'fs';

const rpc = 'http://localhost:8545';

const _gasPrice = '0xffffffff'

import {
      getAddress,
      getPrivateKey,
      getBalance
} from '../utils/ganache.js';

const WETH9 = JSON.parse(fs.readFileSync('../build/contracts/WETH9.json', 'utf-8'));
const erc20Artifact = JSON.parse(fs.readFileSync('../build/contracts/myERC20.json', 'utf-8'));

const deploy = async (from, sk, params, rpc, abi, bytecode, gasPrice = _gasPrice) => {
      const web3 = new Web3(rpc);

      const contract = new web3.eth.Contract(abi);

      const deployTx = contract.deploy({
            data: bytecode,
            arguments: params
      })
      console.log('await deployTx.estimateGas() : ', await deployTx.estimateGas())
      const signedDeployTx = await web3.eth.accounts.signTransaction({
            from: from,
            data: deployTx.encodeABI(),
            gas: (await deployTx.estimateGas()),
            gasPrice: gasPrice,
            nonce: await web3.eth.getTransactionCount(from, 'latest'),
      },
            sk
      )

      const receipt = await web3.eth.sendSignedTransaction(
            signedDeployTx.rawTransaction,
            {
                  checkRevertBeforeSending: false,
                  options: {
                        checkRevertBeforeSending: false
                  }
            }
      )

      return receipt
}

const deployERC20 = async (name, symbol) => {
      const web3 = new Web3(rpc);
      const owner = getAddress();
      const sk = getPrivateKey();
      console.log('onwer balanace :', await getBalance())

      const erc20DeployReceipt = await deploy(owner, sk, [name, symbol], rpc, erc20Artifact.abi, erc20Artifact.bytecode)
      console.log(name, "ERC20 receipt : ", erc20DeployReceipt)
      return new web3.eth.Contract(erc20Artifact.abi, erc20DeployReceipt.contractAddress)
}

const deployWETH9 = async () => {
      const web3 = new Web3(rpc);
      const owner = getAddress();
      const sk = getPrivateKey();
      console.log('onwer balanace :', await getBalance())
      const weth9DeployReceipt = await deploy(owner, sk, [], rpc, WETH9.abi, WETH9.bytecode)
      return new web3.eth.Contract(WETH9.abi, weth9DeployReceipt.contractAddress)
}

const deployAllERC20 = async () => {
      const web3 = new Web3(rpc);
      const owner = getAddress();
      const sk = getPrivateKey();

      const swaper = getAddress();
      const swaperSk = getPrivateKey();

      const USDTContract = await deployERC20('USDT', 'USDT')
      const USDCContract = await deployERC20('USDC', 'USDC')
      const WETH9Contract = await deployWETH9()

      console.log("USDT contract address : ", USDTContract._address)
      console.log("USDC contract address : ", USDCContract._address)
      console.log("WETH9 contract address : ", WETH9Contract._address)

      let contractAddrs = {
            USDT: USDTContract._address,
            USDC: USDCContract._address,
            WETH9: WETH9Contract._address
      }
      fs.writeFileSync('../addr/ERC20Addr.json', JSON.stringify(contractAddrs,null,2))
      fs.writeFileSync('../uniswap-deploy-v3/.env', `ETH_WETH_ADDR=${WETH9Contract._address}`)
}

deployAllERC20()