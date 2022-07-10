/**
 * @name onyxsec
 * @desc Test Jaypeggers
 */

 const assert = require('assert')
 const { expect } = require('chai')
 const Web3 = require("web3");
 const config = require('../config.js')
 const constants = require('../constants.js')
 const puppeteer = require('puppeteer')
 const dappeteer = require('@chainsafe/dappeteer')

 let browser, page, tabs, web3, startingEthBalance, startingBlock, metamask

 before(async () => {
  browser = await dappeteer.launch(puppeteer, {
    metamaskVersion: config.METAMASK_VERSION,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  metamask = await dappeteer.setupMetamask(browser, {
    seed: config.METAMASK_MNEMONIC_PHRASE
  })

  page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1200 })
  await page.goto(constants.WEBSITE, { waitUntil: "networkidle0" })

  tabs = await browser.pages()

  // Close base tab
  await tabs[0].close()

  // NOTICE: metamask.switchNetwork() not working in dappeteer, manually change to Rinkeby
  await tabs[1].bringToFront()
  await tabs[1].click(constants.MM_NETWORK_DISPLAY)
  await tabs[1].$$(constants.MM_NETWORK_OPTIONS).then( async (networks) => {
    await networks[3].click()
  })

  // Connect wallet
  await page.bringToFront()
  await page.waitForSelector(constants.CONNECT_WALLET),
  await page.click(constants.CONNECT_WALLET)
  await metamask.approve()
  await page.bringToFront()

  web3 = new Web3(config.INFURA)
 })
 
 beforeEach(async () => {
  await page.bringToFront()
  await web3.eth.getBalance(config.WALLET_ADDRESS).then((rawStartingBalance) => {
    startingEthBalance = web3.utils.fromWei(rawStartingBalance, 'ether')
  })
  console.log("Current ETH Balance: " + startingEthBalance)
  if (startingEthBalance < 0.10) {
    throw new Error('Not enough ETH to test')
  }

  startingBlock = await web3.eth.getBlock('latest')
  console.log("Starting Block #: " + startingBlock.number)
 })
 
 describe('Menu - Buy JAY', () => {
  it('buys JAY with 0.001 ETH', async () => {
    const convertAmt = 0.001

    await page.bringToFront()
    await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
      await menuItems[5].click()
    })
    
    await page.focus('div.MuiBox-root.css-0 > div > div > div > div:nth-child(1) > div > input').then(() => {
      page.keyboard.type(convertAmt.toString())
    })
    
    await delay(6000) // TODO: btn needs to convert to clickable 'Buy', waitForXPath doesn't help
    await page.$x("//button[contains(text(), 'Buy')]").then( async (elements) => {
      await elements[0].click()
    })

    await delay(6000) // TODO: wait for mm confirm btn, not sure how
    await metamask.confirmTransaction() 
    await delay(35000) // TODO: wait for tx, maybe stick in polling loop

    // Post tx verification
    const senderTxData = await getSenderTx(startingBlock, config.WALLET_ADDRESS)
    expect(web3.utils.fromWei(senderTxData.value, 'ether')).to.eql(convertAmt.toString()) // should cost 0.001 eth

    /*await web3.eth.getBalance(config.WALLET_ADDRESS).then((rawBalance) => {
      return web3.utils.fromWei(rawBalance, 'ether')
    })
    .then((currentEthBalance) => {
      // TODO: take tx cost into account or approx range or log for visual compare or something...
      expect(currentEthBalance).to.eql(startingEthBalance - convertAmt)
    })*/
  })
  it('sells 0.001 JAY for ETH', async () => {
    const convertAmt = 0.001

    await page.bringToFront()
    await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
      await menuItems[4].click()
    })
    
    await page.focus('div.MuiBox-root.css-0 > div > div > div > div:nth-child(1) > div > input').then(() => {
      page.keyboard.type(convertAmt.toString())
    })
    
    await delay(6000) // TODO: btn needs to convert to clickable 'Sell', waitForXPath doesn't help
    await page.$x("//button[contains(text(), 'Sell')]").then( async (elements) => {
      await elements[0].click()
    })

    await delay(6000) // TODO: wait for mm confirm btn, not sure how
    await metamask.confirmTransaction() 
    await delay(35000) // TODO: wait for tx, maybe stick in polling loop

    // Post tx verification
    let senderTxData = await getSenderTx(startingBlock, config.WALLET_ADDRESS)
    expect(web3.utils.fromWei(senderTxData.value, 'ether')).to.eql('0') // should cost 0 eth
  })
 })
 
 after( async () => {
   await browser.close()
 })

// Generic delay
function delay(time_in_ms) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time_in_ms)
  })
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