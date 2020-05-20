const fs = require('fs');
const Web3 = require('web3');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
const HDWalletProvider = require('truffle-hdwallet-provider')
const args = process.argv;
require('dotenv').config();
const zeroAddress = '0x0000000000000000000000000000000000000000';
const http = require('http');

// Get network to use from arguments
let network, mnemonic, httpProviderUrl, web3, reset=false;
for (var i = 0; i < args.length; i++) {
  if (args[i] == '--network')
    network = args[i+1];
  if (args[i] == '--reset')
    reset = true;
}
if (!network) throw('Not network selected, --network parameter missing');

mnemonic = process.env.KEY_MNEMONIC;
httpProviderUrl = 'http://localhost:8545';
const EtherscanAPIToken = '5U25KKV4F4PZ8UGAZ89R65NNFRQD9Q9GI4'

// Get development keys
if (network != 'develop') {
  infuraApiKey = process.env.KEY_INFURA_API_KEY;
  httpProviderUrl = `https://${network}.infura.io/v3/${infuraApiKey }`
} 

console.log('Running information script on', httpProviderUrl)
const provider = new HDWalletProvider(mnemonic, new Web3.providers.HttpProvider(httpProviderUrl), 0, 10);
web3 = new Web3(provider)
ZWeb3.initialize(web3.currentProvider);

const contracts = require('../contracts.json')
const DxController = Contracts.getFromLocal('DxController');
const DxAvatar = Contracts.getFromLocal('DxAvatar');
const DxReputation = Contracts.getFromLocal('DxReputation');
const DxToken = Contracts.getFromLocal('DxToken');

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
let DXdaoSnapshot;
if (fs.existsSync('./DXdaoSnapshot.json'))
  DXdaoSnapshot = Object.assign(DXdaoSnapshotTemplate, JSON.parse(fs.readFileSync('DXdaoSnapshot.json', 'utf-8')));

async function main() {

  const dxController = DxController.at(contracts.DxController);
  const dxAvatar = DxAvatar.at(contracts.DxAvatar);
  const dxReputation = DxReputation.at(contracts.DxReputation);
  const dxToken = DxToken.at(contracts.DxToken);
  
  console.log('DxController', dxController.address);
  console.log('DxAvatar', dxAvatar.address);
  console.log('DxReputation', dxReputation.address);
  console.log('DxToken', dxToken.address);

  // Set last confirmed block as toBlock
  
  let toBlock = (await web3.eth.getBlock('latest')).number;
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
  
  // Get all possible information from Etherscan
  
  DXdaoSnapshot.controller.txs = DXdaoSnapshot.controller.txs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlist&address='
    +dxController.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.controller.internalTxs = DXdaoSnapshot.controller.internalTxs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlistinternal&address='
    +dxController.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.avatar.txs = DXdaoSnapshot.avatar.txs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlist&address='
    +dxAvatar.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.avatar.internalTxs = DXdaoSnapshot.avatar.internalTxs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlistinternal&address='
    +dxAvatar.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.token.txs = DXdaoSnapshot.token.txs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlist&address='
    +dxToken.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.token.internalTxs = DXdaoSnapshot.token.internalTxs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlistinternal&address='
    +dxToken.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.reputation.txs = DXdaoSnapshot.reputation.txs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlist&address='
    +dxReputation.address
    +'&startblock='+fromBlock
    +'&endblock='+toBlock
    +'&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  DXdaoSnapshot.reputation.internalTxs = DXdaoSnapshot.reputation.internalTxs.concat( await makeSynchronousRequest(
    'http://api.etherscan.io/api?module=account&action=txlistinternal&address='
    +dxReputation.address
    +'&startblock='+fromBlock
    +'&endblock=99999999&sort=asc&apikey='
    +EtherscanAPIToken
  ))
  
  // Get all contract events

  DXdaoSnapshot.controller.events = DXdaoSnapshot.controller.events.concat( await dxController.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  DXdaoSnapshot.avatar.events = DXdaoSnapshot.avatar.events.concat( await dxAvatar.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  DXdaoSnapshot.token.events = DXdaoSnapshot.token.events.concat( await dxToken.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  DXdaoSnapshot.reputation.events = DXdaoSnapshot.reputation.events.concat( await dxReputation.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  
  const schemeEvents = DXdaoSnapshot.controller.events.filter((_event) => {
    return (_event.event == 'RegisterScheme' || _event.event == 'UnregisterScheme')
  });
  
  let registeredSchemes = [];
  console.log('Registered scheme in constructior', web3.utils.toChecksumAddress(DXdaoSnapshot.controller.txs[0].from))
  registeredSchemes.push(DXdaoSnapshot.controller.txs[0].from);
  schemeEvents.forEach((schemeEvent) => {
    if (schemeEvent.event == 'RegisterScheme') {
      console.log('Registered scheme', schemeEvent.returnValues._scheme)
      registeredSchemes.push(schemeEvent.returnValues._scheme);
    } else if (schemeEvent.event == 'UnregisterScheme'){
      if (registeredSchemes.indexOf(schemeEvent.returnValues._scheme) < 0) {
        console.log('Unregister inexistent scheme', schemeEvent.returnValues._scheme) 
      } else {
        console.log('Unregister scheme', schemeEvent.returnValues._scheme)        
        registeredSchemes.splice(registeredSchemes.indexOf(schemeEvent.returnValues._scheme), 1);
      }
    }
  });
  
  console.log('Registered Schemes', registeredSchemes);
  for (var i = 0; i < registeredSchemes.length; i++) {
    const scheme = await dxController.methods.schemes(registeredSchemes[i]).call();
    DXdaoSnapshot.schemes[registeredSchemes[i]] = { paramsHash: scheme.paramsHash, permissions: scheme.permissions }
  }

  fs.writeFileSync('DXdaoSnapshot.json', JSON.stringify(DXdaoSnapshot, null, 2), {encoding:'utf8',flag:'w'});
} 

Promise.all([main()]).then(process.exit);
