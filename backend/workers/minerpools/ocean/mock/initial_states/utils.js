'use strict'

const BTC_SATS = 100000000
const crypto = require('crypto')

function generateMockBlocks (count = 10) {
  const blocks = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const blockTime = now - (i * 2 * 60 * 60 * 1000) // Every 2 hours
    const luck = 80 + randomNumber() * 40 // Between 80% and 120%
    const networkDifficulty = 70000000000000 + randomNumber() * 5000000000000
    const acceptedShares = networkDifficulty / (luck / 100)

    blocks.push({
      block_hash: randomNumber().toString(16).substring(2).padEnd(64, '0'),
      ts: blockTime,
      legacy: false,
      username: 'test',
      workername: `test.worker${Math.floor(randomNumber() * 5) + 1}`,
      solution: randomNumber().toString(16).substring(2).padEnd(160, '0'),
      network_difficulty: networkDifficulty,
      height: 810000 - i,
      generation_txn_hash: randomNumber().toString(16).substring(2).padEnd(64, '0'),
      accepted_shares: acceptedShares,
      subsidy_sats: 625000000,
      txn_fees_sats: Math.floor(0.1 * BTC_SATS + randomNumber() * 0.5 * BTC_SATS),
      total_reward_sats: 625000000 + Math.floor(0.1 * BTC_SATS + randomNumber() * 0.5 * BTC_SATS),
      sharelog_window: Math.floor(networkDifficulty * 8)
    })
  }

  return blocks
}

function generateMockWorkers (username) {
  const workers = {}
  const workerCount = 5 + Math.floor(randomNumber() * 10)

  for (let i = 0; i < workerCount; i++) {
    const workerName = `${username}.worker${i + 1}`
    workers[workerName] = [{
      hashrate_60s: 100000000000000 + randomNumber() * 10000000000000,
      hashrate_3600s: 100000000000000 + randomNumber() * 10000000000000,
      hashrate_86400s: 100000000000000 + randomNumber() * 10000000000000
    }]
  }

  return {
    snap_ts: Date.now() / 1000,
    workers
  }
}

function generateMockTransactions (username, startTime, endTime) {
  const transactions = []
  let currentTime = startTime

  while (currentTime < endTime) {
    transactions.push({
      ts: Math.floor(currentTime / 1000), // Unix timestamp in seconds
      amount_sats: 1000000 + randomNumber() * 5000000, // 0.01 to 0.06 BTC
      type: 'payout',
      status: 'confirmed'
    })
    currentTime += 24 * 60 * 60 * 1000 // Add 1 day
  }

  return transactions
}

function generateUserHashrate (username) {
  const now = Math.floor(Date.now() / 1000)
  const baseHashrate = 100000000000000 // 100 TH/s

  return {
    snap_ts: now,
    hashrate_60s: baseHashrate + randomNumber() * 10000000000000,
    hashrate_300s: baseHashrate + randomNumber() * 10000000000000,
    hashrate_600s: baseHashrate + randomNumber() * 10000000000000,
    hashrate_1800s: baseHashrate + randomNumber() * 10000000000000,
    hashrate_3600s: baseHashrate + randomNumber() * 10000000000000,
    hashrate_43200s: baseHashrate + randomNumber() * 10000000000000,
    hashrate_86400s: baseHashrate + randomNumber() * 10000000000000,
    active_worker_count: 5
  }
}

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min = 0, max = 1) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

module.exports = {
  generateMockBlocks,
  generateMockWorkers,
  generateMockTransactions,
  generateUserHashrate,
  randomNumber
}
