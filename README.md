# Jaypeggers Tests
## About The Project

Testing Jaypeggers daap with metamask ext

### References

* [Puppeteer](https://pptr.dev/)
* [Mocha](https://mochajs.org/)
* [Chai Assertion](https://www.chaijs.com/)
* [Dappeteer](https://github.com/decentraland/dappeteer)
* [Web3](https://web3js.readthedocs.io/en/v1.7.4/)

### Prerequisites

```sh
# NPM
npm install npm@latest -g
npm init --yes

# Testing Tools
npm i -s @chainsafe/dappeteer
npm i --save-dev mocha-puppeteer
npm i --save-dev chai
npm i --save-dev node
npm i --save-dev web3
npm i mochawesome mochawesome-report-generator --save-dev
npm i --save-dev etherscan-api
```

You'll need a config.js at project root that contains sensitive data (ASK ME FOR TEMPLATE)

### Run

```sh
npm test
```