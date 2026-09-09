'use strict'

const TRANSACTION_TYPES = {
  PAYOUT: 'payout'
}

const WORKER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline'
}

// The docs describe a single `code: "SUCCESS"` envelope, but the live API is
// split: the older /v2/subaccount/* endpoints answer "SUCCESS" while the newer
// /v2/sp/* ones answer 200. Accept every success spelling we've observed.
const SUCCESS_CODES = ['SUCCESS', 'success', 200, '200', 0, '0']

const MINERPOOL_TAG = 't-minerpool'
const COIN = 'btc'
const POOL_TYPE = 'spiderpool'
const PAGE_SIZE = 100

module.exports = {
  TRANSACTION_TYPES,
  WORKER_STATUS,
  SUCCESS_CODES,
  MINERPOOL_TAG,
  COIN,
  POOL_TYPE,
  PAGE_SIZE
}
