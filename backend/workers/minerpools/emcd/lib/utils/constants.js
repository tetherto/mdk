'use strict'

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

module.exports = {
  COIN: 'btc',
  POOL_TYPE: 'emcd',
  DEFAULT_API_URL: 'https://endpoint.emcd.io/pool/v1',

  // The EMCD API addresses the master account by an empty subaccount ID.
  MASTER_ACCOUNT: '',

  // EMCD rate-limits signed requests to one per second; keep a small margin.
  REQUEST_INTERVAL_MS: 1100,
  REQUEST_TIMEOUT_MS: 30 * SECOND_MS,
  PAGE_SIZE: 100,
  MAX_PAGES: 10000,

  DAY_MS,
  STATS_MAX_AGE_MS: 3 * MINUTE_MS,
  HISTORY_TTL_MS: HOUR_MS,

  TRANSACTION_TYPES: { PAYOUT: 'payout' }
}
