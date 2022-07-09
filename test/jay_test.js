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

 let browser, page, tabs, web3, startingEthBalance, metamask

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
  const rawStartingBalance = await web3.eth.getBalance(config.WALLET_ADDRESS)
  startingEthBalance = web3.utils.fromWei(rawStartingBalance, 'ether')
  console.log("Current ETH Balance: " + startingEthBalance)

  if (startingEthBalance < 0.10) {
    throw new Error('Not enough ETH to test')
  }
 })
 
 describe('Menu - Buy JAY', () => {
  it('buys JAY with ETH', async () => {
    const convertAmt = 0.001

    await page.bringToFront()
    const menuItems = await page.$$(constants.MENU_ITEMS)
    await menuItems[5].click()

    await page.focus('div.MuiBox-root.css-0 > div > div > div > div:nth-child(1) > div > input')
    await page.keyboard.type(convertAmt.toString())
    await delay(6000) // btn needs to convert to clickable 'Buy'

    const elements = await page.$x('//*[@id="root"]/div/div[2]/div[2]/div/div/button')
    await elements[0].click()
    await delay(6000) // wait for mm confirm
    await metamask.confirmTransaction() 
    await delay(30000) // wait for tx

    const rawBalance = await web3.eth.getBalance(config.WALLET_ADDRESS)
    const currentEthBalance = web3.utils.fromWei(rawBalance, 'ether')

    // TODO take tx cost into account or approx range or log for visual compare or something...
    expect(currentEthBalance).to.eql(startingEthBalance - convertAmt)
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