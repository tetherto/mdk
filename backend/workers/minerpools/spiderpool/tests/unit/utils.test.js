'use strict'

const test = require('brittle')
const crypto = require('crypto')
const { toNumber, getWorkersStats, getMonthlyDateRanges, normalizePrivateKey } = require('../../lib/utils')
const { TEST_PRIVATE_KEY } = require('../../mock/lib/test-keys')

// the same key with the PEM armour stripped — what the SpiderPool console issues
const BARE_BASE64 = TEST_PRIVATE_KEY
  .replace(/-----[A-Z ]+-----/g, '')
  .replace(/\s+/g, '')

test('toNumber parses decimal strings and guards bad input', (t) => {
  t.is(toNumber('100.5'), 100.5)
  // hashrates arrive as large H/s decimal strings
  t.is(toNumber('3832641468476948.48'), Number('3832641468476948.48'))
  t.is(toNumber(5), 5)
  t.is(toNumber('not-a-number'), 0)
  t.is(toNumber(undefined), 0)
  t.is(toNumber(null), 0)
})

test('getWorkersStats maps SpiderPool worker records', (t) => {
  const stats = getWorkersStats([{
    subaccount: 'spider1',
    workerName: 'w-1',
    minuteHashRate: '100.5',
    hourHashRate: '200',
    hourStaleRate: '0.01',
    dayHashRate: '300',
    dayStaleRate: '0.02',
    lastShareTime: 1748490153,
    status: 'online'
  }, {
    subaccount: 'spider1',
    workerName: 'w-2',
    minuteHashRate: '0',
    hourHashRate: '0',
    hourStaleRate: '0',
    dayHashRate: '0',
    dayStaleRate: '0',
    lastShareTime: 0,
    status: 'offline'
  }], 'spider1')

  t.is(stats.length, 2)
  t.is(stats[0].username, 'spider1')
  t.is(stats[0].id, 'w-1')
  t.is(stats[0].name, 'w-1')
  t.is(stats[0].online, 1)
  t.is(stats[0].last_updated, 1748490153)
  t.is(stats[0].hashrate, 100.5)
  t.is(stats[0].hashrate_1h, 200)
  t.is(stats[0].hashrate_24h, 300)
  t.is(stats[0].hashrate_stale_1h, 2)
  t.is(stats[0].hashrate_stale_24h, 6)
  t.is(stats[1].online, 0)
})

test('isSuccessCode accepts every success spelling the live API uses', (t) => {
  const { isSuccessCode } = require('../../lib/utils')
  t.ok(isSuccessCode('SUCCESS'), '/v2/subaccount/* namespace')
  t.ok(isSuccessCode(200), '/v2/sp/* namespace')
  t.ok(isSuccessCode('200'))
  t.absent(isSuccessCode('PERMISSION_DENIED'))
  t.absent(isSuccessCode('SIGN_INVALID'))
  t.absent(isSuccessCode(undefined))
})

test('normalizePrivateKey accepts a PEM block', (t) => {
  const key = normalizePrivateKey(TEST_PRIVATE_KEY)
  t.is(key.asymmetricKeyType, 'rsa')
})

test('normalizePrivateKey accepts the console bare base64 body', (t) => {
  const key = normalizePrivateKey(BARE_BASE64)
  t.is(key.asymmetricKeyType, 'rsa')

  // the re-wrapped key must sign identically to the PEM one
  const sign = (k) => {
    const s = crypto.createSign('MD5')
    s.update('payload|123', 'utf8')
    return s.sign(k, 'base64')
  }
  t.is(sign(key), sign(normalizePrivateKey(TEST_PRIVATE_KEY)), 'same signature as the PEM form')
})

test('normalizePrivateKey accepts base64 split across lines', (t) => {
  const wrapped = BARE_BASE64.match(/.{1,40}/g).join('\n')
  t.is(normalizePrivateKey(wrapped).asymmetricKeyType, 'rsa')
})

test('normalizePrivateKey unescapes literal \\n from config and env vars', (t) => {
  const escaped = TEST_PRIVATE_KEY.replace(/\n/g, '\\n')
  t.is(normalizePrivateKey(escaped).asymmetricKeyType, 'rsa')
})

test('normalizePrivateKey accepts a PKCS#1 RSA key', (t) => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' })
  t.is(normalizePrivateKey(pkcs1).asymmetricKeyType, 'rsa', 'PKCS#1 PEM')

  const barePkcs1 = pkcs1.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')
  t.is(normalizePrivateKey(barePkcs1).asymmetricKeyType, 'rsa', 'PKCS#1 bare base64')
})

test('normalizePrivateKey passes a KeyObject through unchanged', (t) => {
  const key = crypto.createPrivateKey(TEST_PRIVATE_KEY)
  t.is(normalizePrivateKey(key), key)
})

test('normalizePrivateKey rejects missing and malformed keys', (t) => {
  t.exception(() => normalizePrivateKey(undefined), /PRIVATE_KEY_MISSING/)
  t.exception(() => normalizePrivateKey(''), /PRIVATE_KEY_MISSING/)
  t.exception(() => normalizePrivateKey('   '), /PRIVATE_KEY_MISSING/)
  t.exception(() => normalizePrivateKey('not a key!'), /PRIVATE_KEY_INVALID/)
  t.exception(() => normalizePrivateKey('aGVsbG8gd29ybGQ='), /PRIVATE_KEY_INVALID/)
  t.exception(() => normalizePrivateKey('-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----'), /PRIVATE_KEY_INVALID/)
})

test('normalizePrivateKey rejects a public key', (t) => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const pub = publicKey.export({ type: 'spki', format: 'pem' })
  t.exception(() => normalizePrivateKey(pub), /PRIVATE_KEY_INVALID/)
})

test('getMonthlyDateRanges returns requested number of months', (t) => {
  const ranges = getMonthlyDateRanges(12)
  const keys = Object.keys(ranges)
  t.is(keys.length, 12)
  for (const { startDate, endDate } of Object.values(ranges)) {
    t.ok(startDate < endDate)
  }
})
