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
 
 describe('Jaypeggers TX Tests', () => {
  it('buys JAY with 0.001 ETH', async () => {
    const convertAmt = 0.001

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
    await page.bringToFront() 
    await delay(35000) // TODO: wait for tx, maybe stick in polling loop

    // Close transaction message
    await page.$x("//button[contains(text(), 'Close')]").then( async (elements) => {
      await elements[0].click()
    })

    // Post tx verification
    const senderTxData = await getSenderTx(startingBlock, config.WALLET_ADDRESS)
    expect(web3.utils.fromWei(senderTxData.value, 'ether')).to.eql(convertAmt.toString()) // should cost 0.001 eth
  })
  it('sells 0.001 JAY for ETH', async () => {
    const convertAmt = 0.001
    let startingJay

    var supply = api.account.tokenbalance(config.WALLET_ADDRESS, '', config.VAULT_ADDRESS)
    supply.then( (data) => {
      startingJay = data.result / constants.DECIMALS
    })

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

    await confirmTxAndClose()    

    // Post tx verification
    let senderTxData = await getSenderTx(startingBlock, config.WALLET_ADDRESS)
    expect(web3.utils.fromWei(senderTxData.value, 'ether')).to.eql('0') // should cost 0 eth

    var supply = api.account.tokenbalance(config.WALLET_ADDRESS, '', config.VAULT_ADDRESS)
    supply.then( (data) => {
      return data.result / constants.DECIMALS
    }).then((endingJay) => {
      expect(startingJay - convertAmt).to.eql(endingJay) // should have 0.001 less JAY in wallet
    }) 
  })
  it('buy 1 NFT for 1 JAY and 0.01 ETH', async () => {
    const expectedEthCost = 0.01
    let vaultStartingEth, teamStartingEth

    var vaultEth = api.account.balance(config.VAULT_ADDRESS)
    vaultEth.then( (data) => {
      vaultStartingEth = web3.utils.fromWei(data, 'ether')
    })

    var teamEth = api.account.balance(config.TEAM_ADDRESS)
    teamEth.then( (data) => {
      teamStartingEth = web3.utils.fromWei(data, 'ether')
    })

    await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
      await menuItems[3].click()
    })

    await delay(3000) // TODO: waiting for NFTs to load
    await page.waitForSelector('.searchBox')
    await page.click('.searchBox')
    await delay(3000) // flakey: waiting for li's to populate
    await page.$x("//li[contains(., 'Halo 3 Profile - Test')]").then( async (elements) => {
      await delay(3000) // flakey: waiting for li's to populate
      if (elements.length == 0) {
        throw new Error('Could not find button')
      }
      await elements[0].click()
    })

    // HACK: Have to close the collection selection dropdown. Feedback given
    await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
      await menuItems[3].click()
    })    
    
    await page.waitForSelector('.imgPickerContainer')
    await page.$$('.imgPickerContainer').then( async (elements) => {
      await delay (3000) // TODO: without this, it doesn't click, only highlight
      await elements[0].click()
    })
    
    await delay(6000) // TODO: btn needs to convert to clickable 'Sell'
    await page.$x('//*[@id="root"]/div/div[2]/div[2]/button').then( async (elements) => {
      await elements[0].click()
    })

    await confirmTxAndClose()

    // Post tx verification
    let senderTxData = await getSenderTx(startingBlock, config.WALLET_ADDRESS)
    expect(web3.utils.fromWei(senderTxData.value, 'ether')).to.eql(expectedEthCost.toString()) // should cost 0.01 eth from User

    var vaultEndEth = api.account.balance(config.VAULT_ADDRESS)
    vaultEndEth.then( (data) => {
      return web3.utils.fromWei(data, 'ether')
    }).then((endEth) => {
      expect(vaultStartingEth + (expectedEthCost / 2)).to.eql(endEth) // should have 0.005 eth sent to Vault
    })

    var teamEndEth = api.account.balance(config.TEAM_ADDRESS)
    teamEndEth.then( (data) => {
      return web3.utils.fromWei(data, 'ether')
    }).then((endEth) => {
      expect(teamStartingEth + (expectedEthCost / 2)).to.eql(endEth) // should have 0.005 eth sent to Team
    })
  })
  it('sell 1 NFT for 0.001 ETH and receive JAY', async () => {
    const expectedEthCost = 0.001

    await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
      await menuItems[2].click()
    })

    await delay(3000) // TODO: waiting for NFTs to load
    await page.waitForSelector('.searchBox')
    await page.click('.searchBox')
    await delay(3000) //flakey: waiting for li's to populate
    await page.$x("//li[contains(., 'Halo 3 Profile - Test')]").then( async (elements) => {
      await delay(3000) // flakey: waiting for li's to populate
      if (elements.length == 0) {
        throw new Error('Could not find button')
      }
     await elements[0].click()
    })

    // Have to close the collection selection dropdown
    await page.$$(constants.MENU_ITEMS).then( async (menuItems) => {
      await menuItems[2].click()
    })
    
    await page.waitForSelector('.imgPickerContainer')
    await page.$$('.imgPickerContainer').then( async (elements) => {
      await delay (3000) // TODO: without this, it doesn't click, only highlight
      await elements[0].click()
    })
    
    await delay(6000) // TODO: btn needs to convert to clickable 'Sell'
    await page.$x('//*[@id="root"]/div/div[2]/div[2]/button').then( async (elements) => {
      await elements[0].click()
    })

    await confirmTxAndClose()

    // Post tx verification
    let senderTxData = await getSenderTx(startingBlock, config.WALLET_ADDRESS)
    expect(web3.utils.fromWei(senderTxData.value, 'ether')).to.eql(expectedEthCost.toString()) // should cost 0.001 eth
  })
  it.skip('test', () => {

  })
 })
 
 after( async () => {
   await browser.close()
 })

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
  var supply = api.account.tokenbalance(config.WALLET_ADDRESS, '', config.VAULT_ADDRESS)
  supply.then( (data) => {
    return data.result / constants.DECIMALS
  })
}

// Generic delay
function delay(time_in_ms) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time_in_ms)
  })
}