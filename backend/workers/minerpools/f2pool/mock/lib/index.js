'use strict'

const miningUserNamesMap = {
  haven7346: 'haven7346'
}

const currencyMap = {
  bitcoin: 'bitcoin'
}

module.exports = {
  getMiningPoolUserName: (name) => {
    return miningUserNamesMap[name]
  },
  getAvailableCurrency: (currency) => {
    return currencyMap[currency]
  }
}
