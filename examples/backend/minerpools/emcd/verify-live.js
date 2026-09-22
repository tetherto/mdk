'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { EMCD_POOL } = require('@tetherto/mdk-worker-emcd')

const METRIC_FIELDS = ['hashrate', 'active_workers_count', 'balance', 'estimated_today_income']

function readCredentials (env) {
  const { EMCD_API_KEY: apiKey, EMCD_API_SECRET: apiSecret, EMCD_SUBACCOUNT_ID: subaccount } = env
  if (!apiKey || !apiSecret) {
    throw new Error('Set EMCD_API_KEY and EMCD_API_SECRET before running live verification')
  }
  return { apiKey, apiSecret, accounts: subaccount ? [subaccount] : [] }
}

async function main () {
  const emcd = readCredentials(process.env)
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-emcd-live-'))
  const pool = new EMCD_POOL({ emcd }, { rack: 'verify', root: storeDir, storeDir })

  try {
    await pool.init()
    await pool.fetchWorkers(new Date())
    await pool.fetchStats(new Date())

    for (const field of METRIC_FIELDS) {
      if (!Number.isFinite(pool.getMetric(field))) {
        throw new Error(`Invalid ${field}`)
      }
      console.log(`${field}: OK`)
    }
    console.log('EMCD live verification passed')
  } finally {
    await new Promise(resolve => pool.stop(resolve))
    fs.rmSync(storeDir, { recursive: true, force: true })
  }
}

main().catch(err => {
  console.error(err.message)
  process.exitCode = 1
})
