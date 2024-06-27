import Web3 from 'web3';
import fs from 'fs';

export const sendContractCall = async (call, contractAddr, addr, sk, gas, value) => {
      const web3 = new Web3('http://localhost:8545');
      const signedCall = await web3.eth.accounts.signTransaction({
          from: addr,
          to: contractAddr,
          data: call.encodeABI(),
          gas: (await call.estimateGas()), //'500000000000'
          gasPrice: '0xffff',
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
          .on('receipt', function (receipt) {
              console.log('receipt:', receipt);
          })
          .on('error', function (error) {
              console.log('error:', error);
          });
  }
  