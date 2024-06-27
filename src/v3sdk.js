import { Pool, Position, NonfungiblePositionManager, nearestUsableTick } from '@uniswap/v3-sdk'
import { Percent } from '@uniswap/sdk-core'
import { ethers } from 'ethers'
import JSBI from 'jsbi'
import fs from 'fs'

import poolV3Artifact from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json' assert { type: "json" };
import factoryV3Artifact from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json' assert { type: "json" };
import routerV3Artifact from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json' assert { type: "json" };
import nfpmV3Artifact from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json' assert { type: "json" };
import { Token } from '@uniswap/sdk-core';

import {
  getAddress,
  getPrivateKey,
  getBalance
} from './utils/ganache.js';


const {
      factoryAddr,
      routerAddr,
      nfpmAddr,
      poolAddr,
      wethAddr,
      usdtAddr,
      usdcAddr,
} = JSON.parse(fs.readFileSync('./contractAddress.json'))

console.log("factoryAddr : ", factoryAddr)
console.log("routerAddr : ", routerAddr)
console.log("poolAddr : ", poolAddr)
console.log("nfpmAddr : ", nfpmAddr)
console.log("wethAddr : ", wethAddr)
console.log("usdtAddr : ", usdtAddr)
console.log("usdcAddr : ", usdcAddr)

const owner = getAddress(0)
const sk = getPrivateKey(0)

const provider = await new ethers.providers.JsonRpcProvider( )
const poolContract = new ethers.Contract(
  poolAddr,
  poolV3Artifact.abi,
  provider
)

const [token0, token1, fee, liquidity, slot0] = await Promise.all([
  poolContract.token0(),
  poolContract.token1(),
  poolContract.fee(),
  poolContract.liquidity(),
  poolContract.slot0(),
])

console.log("token0 : ", token0)
console.log("token1 : ", token1)
console.log("fee : ", fee)
console.log("liquidity : ", liquidity)
console.log("slot0 : ", slot0)
console.log("slot0.tick : ", slot0.tick)
console.log("slot0.sqrtPriceX96 : ", slot0.sqrtPriceX96)

const Token0 = new Token(
  1234,
  token0,
  18,
)

const Token1 = new Token(
  1234,
  token1,
  18,
)

const pool = new Pool(
  Token0,
  Token1,
  fee,
  slot0.sqrtPriceX96,
  liquidity,
  slot0.tick,
)

const tickLower = 0
const tickUpper = 300
const amount0 = JSBI.BigInt('1000000000000')
const amount1 = JSBI.BigInt('1000000000000')
const useFullPrecision = true

const position = Position.fromAmounts({
    pool, 
    tickLower: nearestUsableTick(pool.tickCurrent, pool.tickSpacing) - pool.tickSpacing * 2, 
    tickUpper: nearestUsableTick(pool.tickCurrent, pool.tickSpacing) + pool.tickSpacing * 2, 
    amount0, 
    amount1, 
    useFullPrecision
})

const mintOptions = {
  recipient: owner,
  deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  slippageTolerance: new Percent(50, 10_000),
}

const { calldata, value } = NonfungiblePositionManager.addCallParameters(
  position,
  mintOptions
)

const transaction = {
  data: calldata,
  to: nfpmAddr,
  value: value,
  from: owner,
  maxFeePerGas: '0xff',
  maxPriorityFeePerGas: '0xff',
}

const wallet = new ethers.Wallet(sk, provider)
const txRes = await wallet.sendTransaction(transaction)
console.log("txRes : ", txRes)

