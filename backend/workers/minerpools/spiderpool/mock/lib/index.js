'use strict'

const subaccountNamesMap = {
  'spider-test': 'spider-test'
}

const coinMap = {
  btc: 'btc'
}

module.exports = {
  getSubaccountName: (name) => {
    return subaccountNamesMap[name]
  },
  getAvailableCoin: (coin) => {
    return coinMap[coin]
  }
}
