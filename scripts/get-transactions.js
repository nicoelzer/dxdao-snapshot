const fs = require('fs');
const Web3 = require('web3');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
const HDWalletProvider = require('truffle-hdwallet-provider');
const args = process.argv;
require('dotenv').config();
const http = require('http');
const ethDecoder = require("@maticnetwork/eth-decoder");

// Get network to use from arguments
let network, mnemonic, httpProviderUrl, web3, reset=false, fast=false, toBlock='latest';
for (var i = 0; i < args.length; i++) {
  if (args[i] == '--network')
    network = args[i+1];
  if (args[i] == '--reset')
    reset = true;
  if (args[i] == '--fast')
    fast = true;
  if (args[i] == '--toBlock')
    toBlock = args[i+1];
}
if (!network) throw('Not network selected, --network parameter missing');

const sleep = ms => new Promise(resolve => setTimeout(resolve,  (fast) ? 0 : ms));

mnemonic = process.env.KEY_MNEMONIC;
httpProviderUrl = 'http://localhost:8545';
const EtherscanAPIToken = process.env.KEY_ETHERSCAN

// Get development keys
if (network != 'develop') {
  infuraApiKey = process.env.KEY_INFURA_API_KEY;
  httpProviderUrl = `https://${network}.infura.io/v3/${infuraApiKey }`
} 

console.log('Running information script on', httpProviderUrl)
const provider = new HDWalletProvider(mnemonic, new Web3.providers.HttpProvider(httpProviderUrl), 0, 10);
web3 = new Web3(provider)
ZWeb3.initialize(web3.currentProvider);

const DxController = Contracts.getFromLocal('DxController');
const DxAvatar = Contracts.getFromLocal('DxAvatar');
const DxReputation = Contracts.getFromLocal('DxReputation');
const DxToken = Contracts.getFromLocal('DxToken');
const DxLockMgnForRep = Contracts.getFromLocal('DxLockMgnForRep');
const DxGenAuction4Rep = Contracts.getFromLocal('DxGenAuction4Rep');
const DxLockEth4Rep = Contracts.getFromLocal('DxLockEth4Rep');
const DxLockWhitelisted4Rep = Contracts.getFromLocal('DxLockWhitelisted4Rep');
const DutchXScheme = Contracts.getFromLocal('DutchXScheme');
const SchemeRegistrar = Contracts.getFromLocal('SchemeRegistrar');
const ContributionReward = Contracts.getFromLocal('ContributionReward');
const EnsPublicResolverScheme = Contracts.getFromLocal('EnsPublicResolverScheme');
const EnsRegistrarScheme = Contracts.getFromLocal('EnsRegistrarScheme');
const EnsRegistryScheme = Contracts.getFromLocal('EnsRegistryScheme');

const logDecoder = new ethDecoder.default.LogDecoder(
  [
    DxController.schema.abi,
    DxAvatar.schema.abi,
    DxReputation.schema.abi,
    DxToken.schema.abi,
    DxLockMgnForRep.schema.abi,
    DxGenAuction4Rep.schema.abi,
    DxLockEth4Rep.schema.abi,
    DxLockWhitelisted4Rep.schema.abi,
    DutchXScheme.schema.abi,
    SchemeRegistrar.schema.abi,
    ContributionReward.schema.abi,
    EnsPublicResolverScheme.schema.abi,
    EnsRegistrarScheme.schema.abi,
    EnsRegistryScheme.schema.abi
  ]
);

const contracts = require('../contracts.json');
const dxController = DxController.at(contracts.DxController);
const dxAvatar = DxAvatar.at(contracts.DxAvatar);
const dxReputation = DxReputation.at(contracts.DxReputation);
const dxToken = DxToken.at(contracts.DxToken);

let schemes = {};
schemes[contracts.schemes.DxLockMgnForRep] = DxLockMgnForRep.at(contracts.schemes.DxLockMgnForRep);  
schemes[contracts.schemes.DxGenAuction4Rep] = DxGenAuction4Rep.at(contracts.schemes.DxGenAuction4Rep);  
schemes[contracts.schemes.DxLockEth4Rep] = DxLockEth4Rep.at(contracts.schemes.DxLockEth4Rep);  
schemes[contracts.schemes.DxLockWhitelisted4Rep] = DxLockWhitelisted4Rep.at(contracts.schemes.DxLockWhitelisted4Rep);  
schemes[contracts.schemes.DutchXScheme] = DutchXScheme.at(contracts.schemes.DutchXScheme);  
schemes[contracts.schemes.SchemeRegistrar] = SchemeRegistrar.at(contracts.schemes.SchemeRegistrar);  
schemes[contracts.schemes.ContributionReward] = ContributionReward.at(contracts.schemes.ContributionReward);  
schemes[contracts.schemes.EnsPublicResolverScheme] = EnsPublicResolverScheme.at(contracts.schemes.EnsPublicResolverScheme);  
schemes[contracts.schemes.EnsRegistrarScheme] = EnsRegistrarScheme.at(contracts.schemes.EnsRegistrarScheme);  
schemes[contracts.schemes.EnsRegistryScheme] = EnsRegistryScheme.at(contracts.schemes.EnsRegistryScheme);  

const DXdaoSnapshotTemplate = {
  fromBlock: 0,
  toBlock: 0,
  controller: {
    txs: [],
    internalTxs: [],
    events: []
  },
  avatar: {
    txs: [],
    internalTxs: [],
    events: []
  },
  reputation: {
    txs: [],
    internalTxs: [],
    events: []
  },
  token: {
    txs: [],
    internalTxs: [],
    events: []
  },
  schemes: {}
};

// Fecth existent snapshot
let DXdaoSnapshot = DXdaoSnapshotTemplate;
if (fs.existsSync('./DXdaoSnapshot.json') && !reset)
  DXdaoSnapshot = Object.assign(DXdaoSnapshotTemplate, JSON.parse(fs.readFileSync('DXdaoSnapshot.json', 'utf-8')));

async function main() {
  
  console.log('DxController', dxController.address);
  console.log('DxAvatar', dxAvatar.address);
  console.log('DxReputation', dxReputation.address);
  console.log('DxToken', dxToken.address);

  // Set last confirmed block as toBlock
  
  if (toBlock == 'latest')
    toBlock = (await web3.eth.getBlock('latest')).number;
    
  let fromBlock = DXdaoSnapshot.toBlock + 1;

  if (reset){
    fromBlock = 7850000;
    DXdaoSnapshot.fromBlock = fromBlock;
  }
  
  DXdaoSnapshot.toBlock = toBlock;
  
  console.log('Getting from block', fromBlock, 'to block', toBlock);

  // function returns a Promise
  function getPromise(url) {
  	return new Promise((resolve, reject) => {
  		http.get(url, (response) => {
  			let chunks_of_data = [];

  			response.on('data', (fragments) => {
  				chunks_of_data.push(fragments);
  			});

  			response.on('end', () => {
  				let response_body = Buffer.concat(chunks_of_data);
  				resolve(response_body.toString());
  			});

  			response.on('error', (error) => {
  				reject(error);
  			});
  		});
  	});
  }

  // async function to make http request
  async function makeSynchronousRequest(url) {
  	try {
  		let http_promise = getPromise(url);
  		return JSON.parse(await http_promise).result;
  	}
  	catch(error) {
  		// Promise rejected
  		console.error(error);
  	}
  }
    
  async function getTransactions(_address, _fromBlock, _toBlock) {
    let txsEtherscan = await makeSynchronousRequest(
      'http://api.etherscan.io/api?module=account&action=txlist&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc&apikey='
      +EtherscanAPIToken
    )
    let internalTxsEtherscan = await makeSynchronousRequest(
      'http://api.etherscan.io/api?module=account&action=txlistinternal&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc&apikey='
      +EtherscanAPIToken
    )
    let txs = [];
    let internalTxs = [];
    for (var i = 0; i < txsEtherscan.length; i++) {
      console.log('Getting tx info', txsEtherscan[i].hash, 'for address', _address)
      await sleep(10);
      let txToPush = await web3.eth.getTransaction(txsEtherscan[i].hash);
      txToPush.receipt = await web3.eth.getTransactionReceipt(txsEtherscan[i].hash);
      if (txToPush.receipt.logs)
        txToPush.receipt.logs = logDecoder.decodeLogs(txToPush.receipt.logs)
      txs.push(txToPush);
    }
    for (var i = 0; i < internalTxsEtherscan.length; i++) {
      console.log('Getting internal tx info', internalTxsEtherscan[i].hash, 'for address', _address)
      await sleep(10);
      let internalTxToPush = await web3.eth.getTransactionReceipt(internalTxsEtherscan[i].hash);
      if (internalTxToPush.logs)
        internalTxToPush.logs = logDecoder.decodeLogs(internalTxToPush.logs)
      internalTxs.push(internalTxToPush);
    }
    
    console.log('Total transactions:',txs.length,'; Total internal transactions:', internalTxs.length);
    return { txs, internalTxs };
  }
  
  let transactionsFetched;
  console.log('Getting txs from controller..');
  transactionsFetched = await getTransactions(dxController.address, fromBlock, toBlock);
  DXdaoSnapshot.controller.txs = DXdaoSnapshot.controller.txs.concat(transactionsFetched.txs);
  DXdaoSnapshot.controller.internalTxs = DXdaoSnapshot.controller.internalTxs.concat(transactionsFetched.internalTxs);
  
  console.log('Getting txs from avatar..')
  transactionsFetched = await getTransactions(dxAvatar.address, fromBlock, toBlock);
  DXdaoSnapshot.avatar.txs = DXdaoSnapshot.avatar.txs.concat(transactionsFetched.txs)
  DXdaoSnapshot.avatar.internalTxs = DXdaoSnapshot.avatar.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting txs from token..')
  transactionsFetched = await getTransactions(dxToken.address, fromBlock, toBlock);
  DXdaoSnapshot.token.txs = DXdaoSnapshot.token.txs.concat(transactionsFetched.txs)
  DXdaoSnapshot.token.internalTxs = DXdaoSnapshot.token.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting txs from reputation..')
  transactionsFetched = await getTransactions(dxReputation.address, fromBlock, toBlock);
  DXdaoSnapshot.reputation.txs = DXdaoSnapshot.reputation.txs.concat(transactionsFetched.txs)
  DXdaoSnapshot.reputation.internalTxs = DXdaoSnapshot.reputation.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting events info for controller')
  DXdaoSnapshot.controller.events = DXdaoSnapshot.controller.events.concat( await dxController.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for avatar')
  DXdaoSnapshot.avatar.events = DXdaoSnapshot.avatar.events.concat( await dxAvatar.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for token')
  DXdaoSnapshot.token.events = DXdaoSnapshot.token.events.concat( await dxToken.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for reputation')
  DXdaoSnapshot.reputation.events = DXdaoSnapshot.reputation.events.concat( await dxReputation.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  
  console.log('Getting txs from schemes..')
  for (var schemeAddress in schemes) {
    console.log('Getting txs from scheme', schemeAddress);
    await sleep(30000);
    if (schemes.hasOwnProperty(schemeAddress)) {
      transactionsFetched = await getTransactions(schemeAddress, fromBlock, toBlock);
      if (!DXdaoSnapshot.schemes[schemeAddress])
        DXdaoSnapshot.schemes[schemeAddress] = { txs: [], internalTxs: [], events: [] };
      DXdaoSnapshot.schemes[schemeAddress].txs = DXdaoSnapshot.token.txs.concat(transactionsFetched.txs)
      DXdaoSnapshot.schemes[schemeAddress].internalTxs = DXdaoSnapshot.token.internalTxs.concat(transactionsFetched.internalTxs)
      DXdaoSnapshot.schemes[schemeAddress].events = DXdaoSnapshot.schemes[schemeAddress].events.concat(
        await schemes[schemeAddress].getPastEvents(
        'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
        )
      );
    }
  }
  
  fs.writeFileSync('DXdaoSnapshot.json', JSON.stringify(DXdaoSnapshot, null, 2), {encoding:'utf8',flag:'w'});
} 

Promise.all([main()]).then(process.exit);
