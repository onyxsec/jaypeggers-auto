const config = require('./config.js')

module.exports={
    GET_ACC_BAL_OF_TOKEN: 'https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=' + config.CONTRACT_ADDRESS + '&address=' + config.WALLET_ADDRESS + '&tag=latest&apikey=' + config.ETHERSCAN_KEY
}