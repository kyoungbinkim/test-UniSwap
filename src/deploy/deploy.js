import Web3 from 'web3';
import fs, { realpathSync } from 'fs';

import { computePoolAddress, FeeAmount, Pool } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'

let receipt = null;

const rpc = 'http://localhost:8545';

const WETH9 = JSON.parse(fs.readFileSync('../build/contracts/WETH9.json', 'utf-8'));
// const factoryArtifact = JSON.parse(fs.readFileSync('../contract/build/contracts/UniswapV2Factory.json', 'utf-8'));
// const routerArtifact = JSON.parse(fs.readFileSync('../contract/build/contracts/UniswapV2Router02.json', 'utf-8'));
// const pairArtifact = JSON.parse(fs.readFileSync('../contract/build/contracts/IUniswapV2Pair.json', 'utf-8'))
const erc20Artifact = JSON.parse(fs.readFileSync('../build/contracts/myERC20.json', 'utf-8'));

import poolV3Artifact from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json' assert { type: "json" };
import factoryV3Artifact from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json' assert { type: "json" };
import routerV3Artifact from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json' assert { type: "json" };
import nfpmV3Artifact from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json' assert { type: "json" };

// const testV3 = JSON.parse(fs.readFileSync('../contract/build/contracts/SingleSwap.json', 'utf-8'));
const _gasPrice = '0xffffffff'

import {
    getAddress,
    getPrivateKey,
    getBalance
} from '../utils/ganache.js';

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

const sendContractCall = async (call, contractAddr, addr, sk, gas, value) => {
    const web3 = new Web3(rpc);
    const signedCall = await web3.eth.accounts.signTransaction({
        from: addr,
        to: contractAddr,
        data: call.encodeABI(),
        gas: '500000000000',
        gasPrice: _gasPrice,
        value: value || '0x00',
    }, sk)

    return web3.eth.sendSignedTransaction(
        signedCall.rawTransaction,
        {
            checkRevertBeforeSending: false,
            options: {
                checkRevertBeforeSending: false
            }
        }
    )
        .on('transactionHash', function (txHash) {
            console.log('txHash:', txHash);
        })
        .on('receipt', function (receipt) {
            console.log('gasUsed:', receipt.gasUsed);
        })
        .on('error', function (error) {
            console.log('error:', error);
        });
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


const deployContracts = async () => {
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

    const factoryDeployReceipt = await deploy(owner, sk, [], rpc, factoryV3Artifact.abi, factoryV3Artifact.bytecode)
    const FactoryContract = new web3.eth.Contract(factoryV3Artifact.abi, factoryDeployReceipt.contractAddress);

    const routerDeployReceipt = await deploy(owner, sk, [FactoryContract._address, WETH9Contract._address], rpc, routerV3Artifact.abi, routerV3Artifact.bytecode)
    const RouterContract = new web3.eth.Contract(routerV3Artifact.abi, routerDeployReceipt.contractAddress);

    const NFPMDeployReceipt = await deploy(owner, sk, [FactoryContract._address, WETH9Contract._address, WETH9Contract._address], rpc, nfpmV3Artifact.abi, nfpmV3Artifact.bytecode)
    const NFPMContract = new web3.eth.Contract(nfpmV3Artifact.abi, NFPMDeployReceipt.contractAddress);

    console.log("await web3.eth.getChainId() : ", await web3.eth.getChainId())
    const token0 = new Token(
        Number(await web3.eth.getChainId()),
        USDTContract._address,
        18,
    )
    const token1 = new Token(
        Number(await web3.eth.getChainId()),
        USDCContract._address,
        18,
    )
    // const fee = FeeAmount.MEDIUM
    // const POOL_FACTORY_CONTRACT_ADDRESS = FactoryContract._address


    // const currentPoolAddress = computePoolAddress({
    //     factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    //     tokenA: token0,
    //     tokenB: token1,
    //     fee: fee,
    //     chainId: await web3.eth.getChainId()
    // })
    // console.log("currentPoolAddress : ", currentPoolAddress)


    // const SimpleSwapReceipt = await deploy(owner, sk, [], rpc, testV3.abi, testV3.bytecode)
    // const SimpleSwapContract = new web3.eth.Contract(testV3.abi, SimpleSwapReceipt.contractAddress);

    // await sendContractCall(
    //     SimpleSwapContract.methods.swapExactInputSingle(10000n),
    //     SimpleSwapContract._address,
    //     owner,
    //     sk
    // )


    console.log("Factory contract address : ", FactoryContract._address)
    console.log("Router contract address : ", RouterContract._address)

    await sendContractCall(
        USDTContract.methods.mint(owner, '1'.padEnd(25, '0')),
        USDTContract._address,
        owner,
        sk
    )

    await sendContractCall(
        USDCContract.methods.mint(owner, '1'.padEnd(25, '0')),
        USDCContract._address,
        owner,
        sk
    )


    const createPoolReceipt = await sendContractCall(
        FactoryContract.methods.createPool(USDTContract._address, USDCContract._address, 3000),
        FactoryContract._address,
        owner,
        sk
    )
    console.log("pool Address : ", await FactoryContract.methods.getPool(USDTContract._address, USDCContract._address, 3000).call())

    console.log('createPoolReceipt : ', createPoolReceipt)
    let poolAddr = await FactoryContract.methods.getPool(USDTContract._address, USDCContract._address, 3000).call()
    console.log('createPoolReceipt.contractAddress : ', poolAddr, poolAddr.slice(66))
    // const poolV3Contract = new web3.eth.Contract(poolV3Artifact.abi, createPoolReceipt);

    
    
    const poolContract = new web3.eth.Contract(poolV3Artifact.abi, poolAddr);

    let liquidity = await poolContract.methods.liquidity().call()
    let slot0 = await poolContract.methods.slot0().call()

    console.log('liquidity : ', liquidity)
    console.log('slot0 : ', slot0, '\n\n')


    await sendContractCall(
        poolContract.methods.initialize(BigInt(Math.round(Math.sqrt(9) * 2 ** 96))),
        poolContract._address,
        owner,
        sk
    )

    liquidity = await poolContract.methods.liquidity().call()
    slot0 = await poolContract.methods.slot0().call()

    console.log('liquidity : ', liquidity)
    console.log('slot0 : ', slot0, BigInt(Math.round(Math.sqrt(9) * 2 ** 96)), '\n\n')

    let ca = {
        factoryAddr: FactoryContract._address,
        routerAddr: RouterContract._address,
        nfpmAddr: NFPMContract._address,
        poolAddr: poolAddr,
        wethAddr: WETH9Contract._address,
        usdtAddr: USDTContract._address,
        usdcAddr: USDCContract._address
    }
    fs.writeFileSync('../contractAddress.json', JSON.stringify(ca, null, 2))
    
    const MaxUint256 = BigInt(10 ** 30);
    await sendContractCall(
        USDTContract.methods.approve(routerDeployReceipt.contractAddress, MaxUint256),
        USDTContract._address,
        owner,
        sk
    )
    await sendContractCall(
        USDCContract.methods.approve(routerDeployReceipt.contractAddress, MaxUint256),
        USDCContract._address,
        owner,
        sk
    )

    await sendContractCall(
        USDTContract.methods.approve(ca.nfpmAddr, MaxUint256),
        USDTContract._address,
        owner,
        sk
    )
    await sendContractCall(
        USDCContract.methods.approve(ca.nfpmAddr, MaxUint256),
        USDCContract._address,
        owner,
        sk
    )


    console.log(" USDT balance : ", await USDTContract.methods.balanceOf(swaper).call())
    console.log(" USDC balance : ", await USDCContract.methods.balanceOf(swaper).call())
    // console.log("USDT methods : ", USDTContract.methods)
    // console.log(RouterContract.methods)
    return
    receipt = await sendContractCall(
        NFPMContract.methods.mint([
            USDTContract._address,
            USDCContract._address,
            3000n,
            0n,
            300n,
            BigInt('1'.padEnd(25, '0')),
            BigInt('1'.padEnd(25, '0')),
            0,
            0,
            swaper,
            (Math.floor(Date.now() / 1000) + 10 * 60),
        ]),
        NFPMContract._address,
        swaper,
        swaperSk
    )

    console.log('NFPMContract mint receipt : ', receipt)    

    liquidity = await poolContract.methods.liquidity().call()
    slot0 = await poolContract.methods.slot0().call()

    console.log('liquidity : ', liquidity)
    console.log('slot0 : ', slot0, BigInt(Math.round(Math.sqrt(9) * 2 ** 96)), '\n\n')


    receipt = await sendContractCall(
        RouterContract.methods.exactInputSingle([
            USDTContract._address,
            USDCContract._address,
            3000n,
            swaper,
            (Math.floor(Date.now() / 1000) + 10 * 60),
            '1'.padEnd(4, '0'),
            0n,
            BigInt(Math.round(Math.sqrt(9) * 2 ** 96))
        ]),
        RouterContract._address,
        swaper,
        swaperSk
    )
    console.log('RouterContract exactInputSingle receipt : ', receipt)


    // const PairContract = new web3.eth.Contract(pairArtifact.abi, pairAddr);
    // console.log('before reverse :', await PairContract.methods.getReserves().call())

    // console.log(BigInt(10 ** 8).toString(16), "addresses", USDTContract._address, USDCContract._address,swaper)

    // try {
    //     console.log(await sendContractCall(
    //         RouterContract.methods.addLiquidity(
    //             USDTContract._address,
    //             USDCContract._address,
    //             BigInt(10 ** 8),
    //             BigInt(10 ** 8),
    //             0,
    //             0,
    //             swaper,
    //             (Math.floor(Date.now() / 1000) + 10 * 60)
    //         ),
    //         RouterContract._address,
    //         swaper,
    //         swaperSk
    //     ))
    // } catch (error) {
    //     console.log('error :', error)

    // }

    // try {
    //     console.log(await sendContractCall(
    //         RouterContract.methods.addLiquidity(
    //             USDTContract._address,
    //             USDCContract._address,
    //             '0x' + BigInt(10 ** 8).toString(16),
    //             '0x' + BigInt(10 ** 8).toString(16),
    //             '0x00',
    //             '0x00',
    //             swaper,
    //             '0x'+(Math.floor(Date.now() / 1000) + 10 * 60).toString(16)
    //         ),
    //         RouterContract._address,
    //         swaper,
    //         swaperSk
    //     ))
    // } catch (error) {
    //     console.log('error :', error)
    // }


    console.log('after reverse :', await PairContract.methods.getReserves().call())

}

deployContracts()