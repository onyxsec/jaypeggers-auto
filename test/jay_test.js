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

 let browser
 let page
 let tabs
 let web3
 let currentEthBalance

 before(async () => {
  browser = await dappeteer.launch(puppeteer, {
    metamaskVersion: config.METAMASK_VERSION,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const metamask = await dappeteer.setupMetamask(browser, {
    seed: config.METAMASK_MNEMONIC_PHRASE
  })

  page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1200 })
  await page.goto(constants.WEBSITE, { waitUntil: "networkidle0" })

  tabs = await browser.pages()

  // Close base tab
  await tabs[0].close()

  // NOTICE: metamask.switchNetwork() not working, manually change to Rinkeby
  await tabs[1].bringToFront()
  await tabs[1].click(constants.MM_NETWORK_DISPLAY)
  const networks = await tabs[1].$$(constants.MM_NETWORK_OPTIONS)
  await networks[3].click()

  // Connect wallet
  await page.bringToFront()
  await page.waitForSelector(constants.CONNECT_WALLET),
  await page.click(constants.CONNECT_WALLET)
  await metamask.approve()
  await page.bringToFront()

  // Setup Web3
  web3 = new Web3(config.INFURA)
 })
 
 beforeEach(async () => {
  currentEthBalance = await web3.eth.getBalance(config.WALLET_ADDRESS)
  console.log("Current ETH Balance: " + currentEthBalance)

  if (currentEthBalance < 0.10) {
    throw new Error('Not enough ETH to test')
  }
 })
 
 describe('Menu - Buy JAY', () => {
  it('buys JAY with ETH', async () => {
    await page.bringToFront()
    const menuItems = await page.$$(constants.MENU_ITEMS)
    menuItems[5].click()
    await delay(10000)
  })
 
 })
 
 after(async () => {
   await browser.close()
 })

 // Desc: general wait fnc
 // Usage: await delay(2000)
function delay(time_in_ms) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time_in_ms)
  })
}

// Desc: get the converted eth value
async function getEtherBalance() {
  const rawBalance = await web3.eth.getBalance(config.WALLET_ADDRESS)
  return web3.utils.fromWei(rawBalance, 'ether')
}