/**
 * @name https://github.com/onyxsec/jaypeggers-auto / etherealsec@gmail.com
 * @desc Test Jaypeggers
 */

 const assert = require('assert')
 const { expect } = require('chai')
 const Web3 = require("web3");
 const config = require('../config.js')
 const constants = require('../constants.js')
 const api = require('etherscan-api').init(config.ETHERSCAN_KEY, 'rinkeby', '6000')
 const puppeteer = require('puppeteer')
 const dappeteer = require('@chainsafe/dappeteer');
 const { DECIMALS } = require('../constants.js');

let browser, page, tabs, web3, startingEthBalance, startingBlock, metamask

before(async () => {
 browser = await dappeteer.launch(puppeteer, {
   metamaskVersion: constants.METAMASK_VERSION,
   args: ["--no-sandbox", "--disable-setuid-sandbox"],
 })

 page = await browser.newPage()
 await page.setViewport({ width: 1600, height: 1200 })
 await page.goto(constants.WEBSITE, { waitUntil: "networkidle0" })

 tabs = await browser.pages()

 // Close base tab
 await tabs[0].close()

 web3 = new Web3(config.INFURA)
})

beforeEach(async () => {
 await page.bringToFront()
 await web3.eth.getBalance(constants.USER_ADDRESS).then((rawStartingBalance) => {
   startingEthBalance = web3.utils.fromWei(rawStartingBalance, 'ether')
 })
 console.log("Current ETH Balance: " + startingEthBalance)
 if (startingEthBalance < 0.10) {
   throw new Error('Not enough ETH to test')
 }

 startingBlock = await web3.eth.getBlock('latest')
 console.log("Starting Block #: " + startingBlock.number)
})

describe('Jaypeggers TX Tests', () => {
 it('buys JAY with 0.001 ETH', async () => {
   const convertAmt = 0.001
   const jayAddrs = [constants.USER_ADDRESS]
   let startingJayBalances, endingJayBalances
   await getTokenBalances(jayAddrs, constants.VAULT_ADDRESS, DECIMALS).then((balancesMap) => {
     console.log('Starting Balances: ' + JSON.stringify(balancesMap))
     startingJayBalances = balancesMap
   })

   await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
     await menuItems[5].click()
   })
   
   await page.focus('div.MuiBox-root.css-0 > div > div > div > div:nth-child(1) > div > input').then(() => {
     convertAmt.toString().split().forEach((char) => {
       page.keyboard.type(char)
     })
   })
   
   await delay(6000) // TODO: btn needs to convert to clickable 'Buy', waitForXPath doesn't help
   let receievedJay
   let inputValues = []
   await page.$$('.MuiInputBase-input').then( async (elements) => {
    for( let styleNumber of elements) {
      inputValues.push(await page.evaluate(el => el.getAttribute("value"), styleNumber))
    }
    console.log('addrs lengh: ' + inputValues.length)
    console.log("addr: " + inputValues[1])
  })
})

after( async () => {
  await browser.close()
})

async function getTokenBalances(getAddrs, contractAddr, decimals) {
 let balances = {}
 for (const addr of getAddrs) {
   let supply = await api.account.tokenbalance(addr, '', contractAddr)
   balances[addr] = supply.result / decimals
 }
 return balances
}

// Get the token balance of an address
async function getTokenBalance(getAddr, contractAddr, decimals) {
 let supply = await api.account.tokenbalance(getAddr, '', contractAddr)
 return supply.result / decimals
}

// Searches blocks between start and current and returns first sender tx
async function getSenderTx(startBlock, sender) {
 const endingBlock = await web3.eth.getBlock('latest')
 console.log("Ending Block #: " + endingBlock.number)
 for(let i = startBlock.number; i <= endingBlock.number; i++) {
   const currentBlock = await web3.eth.getBlock(i)
   if (currentBlock != null && currentBlock.transactions != null) {
     for (let txHash of currentBlock.transactions) {
       let tx = await web3.eth.getTransaction(txHash)
       if (sender == tx.from) {
         console.log('Transaction found on block: ' + i)
         console.log(tx)
         return tx
       }
     }
   }
 }
 throw new Error('No sender transactions found...')
}

// Confirm metamask transaction and close transaction pop up
async function confirmTxAndClose() {
 await delay(6000) // TODO: wait for mm confirm btn, not sure how
 await metamask.confirmTransaction()
 await page.bringToFront()
 //await delay(35000) // TODO: wait for tx, maybe stick in polling loop

 // Close transaction message
 await page.waitForXPath("//button[contains(text(), 'Close')]", {timeout: 35000})
 await page.$x("//button[contains(text(), 'Close')]").then( async (elements) => {
   await delay(2000) // flakey
   await elements[0].click()
 })    
}

// Gets the current decimal formatted balance of JAY for automation wallet
function getJayBalance() {
 var supply = api.account.tokenbalance(constants.USER_ADDRESS, '', constants.VAULT_ADDRESS)
 supply.then( (data) => {
   return data.result / constants.DECIMALS
 })
}

// Generic delay
function delay(time_in_ms) {
 return new Promise(function(resolve) { 
     setTimeout(resolve, time_in_ms)
 })
}})