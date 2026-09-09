'use strict'

// Live check against the REAL SpiderPool API (no mock).
//
// Unlike index.js, this talks to api.spiderpool.com with your own credentials,
// so it needs an access key + the RSA private key whose public half you
// registered under the SpiderPool website's "Account Management" section.
//
// It probes each endpoint separately before running the manager's full fetch
// cycle, so a failure points at one specific call rather than the whole poll.
//
// Usage:
//   export SPIDERPOOL_ACCESS_KEY=your-access-key
//   export SPIDERPOOL_PRIVATE_KEY_FILE=/path/to/spiderpool_rsa.pem
//   export SPIDERPOOL_ACCOUNTS=your-subaccount[,another]
//   node examples/backend/minerpools/spiderpool/verify-live.js
//
// Optional:
//   SPIDERPOOL_API_URL   (default https://api.spiderpool.com)
//   SPIDERPOOL_COIN      (default btc)
//   SPIDERPOOL_PRIVATE_KEY  inline PEM instead of *_FILE

const os = require('os')
const fs = require('fs')
const path = require('path')

const { SPIDER_POOL } = require('@tetherto/mdk-worker-spiderpool')

const API_URL = process.env.SPIDERPOOL_API_URL || 'https://api.spiderpool.com'
const COIN = process.env.SPIDERPOOL_COIN || 'btc'

const ths = (hps) => {
  const n = Number(hps)
  return Number.isFinite(n) ? `${(n / 1e12).toFixed(2)} TH/s` : 'n/a'
}

function readCredentials () {
  const accessKey = process.env.SPIDERPOOL_ACCESS_KEY
  const keyFile = process.env.SPIDERPOOL_PRIVATE_KEY_FILE
  const inlineKey = process.env.SPIDERPOOL_PRIVATE_KEY
  const accounts = (process.env.SPIDERPOOL_ACCOUNTS || '').split(',').map(s => s.trim()).filter(Boolean)

  const missing = []
  if (!accessKey) missing.push('SPIDERPOOL_ACCESS_KEY')
  if (!keyFile && !inlineKey) missing.push('SPIDERPOOL_PRIVATE_KEY_FILE (or SPIDERPOOL_PRIVATE_KEY)')
  if (!accounts.length) missing.push('SPIDERPOOL_ACCOUNTS')
  if (missing.length) {
    console.error('Missing required environment variables:')
    for (const m of missing) console.error(`  - ${m}`)
    console.error('\nSee the header of this file for the full usage example.')
    process.exit(1)
  }

  let privateKey = inlineKey
  if (keyFile) {
    if (!fs.existsSync(keyFile)) {
      console.error(`Private key file not found: ${keyFile}`)
      process.exit(1)
    }
    privateKey = fs.readFileSync(keyFile, 'utf8')
  }

  // The SpiderPool console hands out a bare base64 body rather than a PEM
  // block; the worker accepts either, so just report which one we got and let
  // it fail loudly at init() if the bytes are not a usable RSA key.
  const format = privateKey.includes('-----BEGIN')
    ? 'PEM block'
    : 'bare base64 key body (as issued by the SpiderPool console)'

  return { accessKey, privateKey, accounts, format }
}

// SpiderPool answers auth/permission problems with a code in the body rather
// than an HTTP status, so translate the common ones into a next step.
function explain (err) {
  const msg = String((err && err.message) || err)
  if (/PRIVATE_KEY_MISSING/.test(msg)) {
    return 'No private key was supplied. Set SPIDERPOOL_PRIVATE_KEY_FILE or SPIDERPOOL_PRIVATE_KEY.'
  }
  if (/PRIVATE_KEY_INVALID/.test(msg)) {
    return 'The key bytes are not a usable RSA private key. Paste the console value exactly as issued ' +
      '(bare base64 is fine, no PEM header needed) and make sure it is the PRIVATE key, not the public one.'
  }
  if (/SIGN_INVALID|sign/i.test(msg)) {
    return 'Signature rejected. The public key registered with SpiderPool does not match this private key.'
  }
  if (/AUTH_FAILED|accessKey/i.test(msg)) {
    return 'Access key rejected. Check SPIDERPOOL_ACCESS_KEY against Account Management.'
  }
  if (/PERMISSION_DENIED|permission/i.test(msg)) {
    return 'Subaccount not permitted for this access key. Check SPIDERPOOL_ACCOUNTS spelling and that the key covers it.'
  }
  if (/PARAM_ERROR/i.test(msg)) {
    return `Parameter rejected. Confirm the coin abbreviation ("${COIN}") is right for this subaccount.`
  }
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|timeout/i.test(msg)) {
    return `Could not reach ${API_URL}. Check outbound HTTPS and any egress firewall.`
  }
  return null
}

async function probe (label, fn) {
  process.stdout.write(`  ${label} ... `)
  try {
    const res = await fn()
    console.log('ok')
    return { ok: true, res }
  } catch (err) {
    console.log('FAILED')
    console.log(`      ${err.message}`)
    const hint = explain(err)
    if (hint) console.log(`      → ${hint}`)
    return { ok: false, err }
  }
}

const main = async () => {
  const { accessKey, privateKey, accounts, format } = readCredentials()
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-spiderpool-live-'))

  console.log(`SpiderPool live check — ${API_URL}`)
  console.log(`  coin:      ${COIN}`)
  console.log(`  accounts:  ${accounts.join(', ')}`)
  console.log(`  key:       ${format}`)
  console.log('')

  const pool = new SPIDER_POOL(
    { spiderpool: { accounts, apiUrl: API_URL, accessKey, privateKey, coin: COIN } },
    { rack: 'rack-spiderpool-live', storeDir, root: storeDir }
  )
  await pool.init()

  let failures = 0
  const cleanup = async () => {
    // init() arms the pool scheduler, so a poll can already be in flight when we
    // tear down. stop() aborts it via PoolService's abortSignal, but the
    // rejection still surfaces through the manager's error log — silence it,
    // since it says nothing about the account.
    pool._logErr = () => {}
    await new Promise((resolve) => pool.stop(resolve))
    fs.rmSync(storeDir, { recursive: true, force: true })
  }

  // Stage 1 — each endpoint on its own, so a failure names one call.
  for (const account of accounts) {
    console.log(`Endpoint probes for "${account}":`)
    const results = {}
    results.profit = await probe('getSubaccountProfitInfo   ', () => pool.spiderApi.getProfitInfo(account))
    results.hashrate = await probe('fullHashRate              ', () => pool.spiderApi.getFullHashRate(account))
    results.workers = await probe('worker/list               ', () => pool.spiderApi.getWorkers(account))
    results.payments = await probe('getSubaccountPaymentRecord', () => {
      const end = Date.now()
      return pool.spiderApi.getPaymentRecords(account, end - 7 * 24 * 60 * 60 * 1000, end)
    })

    failures += Object.values(results).filter(r => !r.ok).length

    if (results.profit.ok) {
      const p = results.profit.res || {}
      console.log(`      unpaid ${p.unpaidProfit ?? 'n/a'} BTC | total ${p.totalProfit ?? 'n/a'} BTC | est. today ${p.dayEstimateProfit ?? 'n/a'} BTC`)
    }
    if (results.hashrate.ok) {
      const h = results.hashrate.res || {}
      console.log(`      hashrate 10m=${ths(h.hashRate10)} 1h=${ths(h.hashRateHour)} 24h=${ths(h.hashRateDay)}`)
    }
    if (results.workers.ok) {
      const w = results.workers.res || []
      const online = w.filter(x => x.status === 'online').length
      console.log(`      workers ${w.length} total, ${online} online${w.length ? '' : '  (no miners on this subaccount yet)'}`)
    }
    if (results.payments.ok) {
      console.log(`      payments (last 7d) ${(results.payments.res || []).length}`)
    }
    console.log('')
  }

  if (failures) {
    console.log(`${failures} endpoint probe(s) failed — fix those before trusting the poll cycle.`)
    await cleanup()
    process.exit(1)
  }

  // Stage 2 — the real poll cycle the worker runs on its scheduler.
  console.log('Manager fetch cycle:')
  const now = new Date()
  await probe('fetchWorkers      ', () => pool.fetchWorkers(now))
  await probe('fetchStats        ', () => pool.fetchStats(now))
  await probe('fetchTransactions ', () => pool.fetchTransactions())
  console.log('')

  const stats = await pool.getWrkExtData({ query: { key: 'stats' } })
  const workers = await pool.getWorkers({ offset: 0, limit: 20 })

  for (const account of accounts) {
    const row = (stats?.stats || []).find(s => s.username === account) || {}
    const list = (workers?.workers || []).filter(w => w.username === account)
    console.log(`SpiderPool account: ${account}`)
    console.log(`  hashrate: 10m=${ths(row.hashrate)} 1h=${ths(row.hashrate_1h)} 24h=${ths(row.hashrate_24h)}`)
    console.log(`  workers:  ${row.worker_count ?? list.length} total, ${row.active_workers_count ?? 'n/a'} online`)
    console.log(`  balance:  ${row.balance ?? 'n/a'} BTC   (unpaid ${row.unsettled ?? 'n/a'}, est. today ${row.estimated_today_income ?? 'n/a'})`)
    for (const w of list.slice(0, 10)) {
      console.log(`    └─ ${w.name}  online=${w.online}  ${ths(w.hashrate)}`)
    }
    if (list.length > 10) console.log(`    … ${list.length - 10} more`)
  }

  console.log('\nOK — SpiderPool worker is fetching live data from the real API.\n')
  await cleanup()
  // don't wait on scheduler polls that were already in flight
  process.exit(0)
}

main().catch(async (err) => {
  console.error('\nverify-live failed:', err.message)
  const hint = explain(err)
  if (hint) console.error(`→ ${hint}`)
  process.exit(1)
})
