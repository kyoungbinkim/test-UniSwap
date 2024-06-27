import _ from 'lodash';
import fs from 'fs';
import Web3 from 'web3';

const rpc = 'http://localhost:8545';
const KeysJson = JSON.parse(fs.readFileSync('../../keys.json', 'utf-8'));
const AddressList = _.keys(_.get(KeysJson, 'private_keys'))

export function getAddress(idx = 0) {
    try {
        return AddressList[idx]
    } catch (error) {
        return undefined
    }
}

export function getPrivateKey(idx = 0) {
    try {
        return _.get(_.get(KeysJson, 'private_keys'), getAddress(idx))
    } catch (error) {
        return undefined
    }
}

export async function getBalance(idx = 0) {
    const web3 = new Web3(rpc);
    return web3.eth.getBalance(getAddress(idx))
}

const Ganache = {
    getAddress,
    getPrivateKey,
    getBalance
}

export default Ganache