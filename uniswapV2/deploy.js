import Web3 from 'web3';
import fs from 'fs';

const rpc = 'http://localhost:8545';

const WETH9 = JSON.parse(fs.readFileSync('../WETH9.json', 'utf-8'));
const factoryArtifact = JSON.parse(fs.readFileSync('../contract/build/contracts/UniswapV2Factory.json', 'utf-8'));
const routerArtifact = JSON.parse(fs.readFileSync('../contract/build/contracts/UniswapV2Router02.json', 'utf-8'));
const pairArtifact = JSON.parse(fs.readFileSync('../contract/build/contracts/IUniswapV2Pair.json', 'utf-8'))
const erc20Artifact = JSON.parse(fs.readFileSync('../contract/build/contracts/myERC20.json', 'utf-8'));

import factoryV3Artifact from'@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json' assert { type: "json" };
import routerV3Artifact from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json' assert { type: "json" };
const testV3 = JSON.parse(fs.readFileSync('../contract/build/contracts/SingleSwap.json', 'utf-8'));


import {
    getAddress,
    getPrivateKey,
    getBalance
} from '../utils/ganache.js';

const deploy = async (from, sk, params, rpc, abi, bytecode, gasPrice = '0x01') => {
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
        gas: (await deployTx.estimateGas()) ,
        gasPrice: gasPrice,
        nonce: await web3.eth.getTransactionCount(from, 'latest'),
    },
        sk
    )

    const receipt = await web3.eth.sendSignedTransaction(
        signedDeployTx.rawTransaction
    )

    return receipt
}

const sendContractCall = async (call, contractAddr, addr, sk, gas, value) => {
    const web3 = new Web3(rpc);
    const signedCall = await web3.eth.accounts.signTransaction({
        from: addr,
        to: contractAddr,
        data: call.encodeABI(),
        gas: '5000000000' ,
        gasPrice: '0x01',
        value: value || '0x00',
    }, sk)

    return web3.eth.sendSignedTransaction(
        signedCall.rawTransaction,
        {
            checkRevertBeforeSending: false,
            options: {
                checkRevertBeforeSending: false
        }}
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
        USDTContract.methods.mint(swaper, '1'.padEnd(25, '0')),
        USDTContract._address,
        owner,
        sk
    )

    await sendContractCall(
        USDCContract.methods.mint(swaper, '1'.padEnd(25, '0')),
        USDCContract._address,
        owner,
        sk
    )
    

    await sendContractCall(
        FactoryContract.methods.createPool(USDTContract._address, USDCContract._address, 3000),
        FactoryContract._address,
        swaper,
        swaperSk
    )

    const MaxUint256 = BigInt(10 ** 30);
    await sendContractCall(
        USDTContract.methods.approve(routerDeployReceipt.contractAddress, MaxUint256),
        USDTContract._address,
        swaper,
        swaperSk
    )
    await sendContractCall(
        USDCContract.methods.approve(routerDeployReceipt.contractAddress, MaxUint256),
        USDCContract._address,
        swaper,
        swaperSk
    )

    console.log(" USDT balance : ", await USDTContract.methods.balanceOf(swaper).call())
    console.log(" USDC balance : ", await USDCContract.methods.balanceOf(swaper).call())
    // console.log("USDT methods : ", USDTContract.methods)
    // console.log(RouterContract.methods)


    await sendContractCall(
        RouterContract.methods.exactInputSingle([
            USDTContract._address,
            USDCContract._address,
            3000n,
            swaper,
            (Math.floor(Date.now() / 1000) + 10 * 60),
            '1'.padEnd(4, '0'),
            0n,
            0n
        ]),
        RouterContract._address,
        swaper,
        swaperSk
    )



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