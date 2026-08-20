'use strict'

const test = require('brittle')
const CryptoJS = require('crypto-js')
const WMApiV3 = require('../../lib/protocols/wm-api-v3')
const hex2a = require('../../lib/utils/hex2a')

test('api-v3 auth - SHA256 token matches fixed vendor vector', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })
  handler.salt = '5QAHiKMb'
  const auth = handler._generateToken('set.miner.pools', 1692685512)

  t.is(auth.token, 't5VzZdBe')
  t.is(auth.key.toString(), 'b7957365d05ec273e788a1034d1a4b0df51b295a3da79d14f46b2bf7b56e4ab3')
})

test('api-v3 auth - encrypts only sensitive param and keeps outer command plaintext', async (t) => {
  let sent
  const rpc = {
    request: async (raw) => {
      sent = JSON.parse(raw)
      return JSON.stringify({ code: 0, when: 1692685512, msg: 'ok', desc: sent.cmd })
    }
  }
  const handler = new WMApiV3({ rpc, account: 'operator', password: 'super' })
  handler.salt = '5QAHiKMb'
  const pools = [{ pool: 'stratum+tcp://pool:3333', worker: 'worker', passwd: 'x' }]

  const originalNow = Date.now
  Date.now = () => 1692685512000
  t.teardown(() => { Date.now = originalNow })
  await handler.requestWrite('set.miner.pools', { param: pools })

  t.is(sent.cmd, 'set.miner.pools')
  t.is(sent.token, 't5VzZdBe')
  t.is(sent.account, 'operator')
  t.is(sent.enc, undefined)
  t.is(sent.data, undefined)
  t.is(sent.param, 'M7c6KBuUVIiP+BnrFxPBexRUr3Zw94Ng42eBDFq02W9o7MSxcGd0EcmSwVx72paF9s8xliqcLqi00gxEFa8AzpW/A3R+69wXNkHPuGtqhA4=')

  const key = handler._generateToken(sent.cmd, sent.ts).key
  const plaintext = CryptoJS.AES.decrypt(sent.param, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
  t.alike(JSON.parse(hex2a(plaintext)), pools)
})

test('api-v3 auth - leaves ordinary params unencrypted', async (t) => {
  let sent
  const handler = new WMApiV3({
    password: 'super',
    rpc: {
      request: async (raw) => {
        sent = JSON.parse(raw)
        return JSON.stringify({ code: 0, msg: 'ok', desc: sent.cmd })
      }
    }
  })
  handler.salt = '5QAHiKMb'
  await handler.requestWrite('set.miner.power_mode', { param: 'normal' })
  t.is(sent.param, 'normal')
})

test('api-v3 auth - encrypts change-password param without encrypting the outer command', async (t) => {
  let sent
  const handler = new WMApiV3({
    password: 'super',
    rpc: {
      request: async (raw) => {
        sent = JSON.parse(raw)
        return JSON.stringify({ code: 0, msg: 'ok', desc: sent.cmd })
      }
    }
  })
  handler.salt = '5QAHiKMb'
  const param = { user: 'super', old_password: 'super', new_password: 'new-secret' }

  await handler.requestWrite('set.user.change_passwd', { param })

  t.is(sent.cmd, 'set.user.change_passwd')
  t.is(typeof sent.param, 'string')
  t.is(sent.enc, undefined)
  t.is(sent.data, undefined)

  const key = handler._generateToken(sent.cmd, sent.ts).key
  const plaintext = CryptoJS.AES.decrypt(sent.param, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
  t.alike(JSON.parse(hex2a(plaintext)), param)
})

test('api-v3 auth - malformed JSON response surfaces a stable error string', async (t) => {
  const handler = new WMApiV3({
    password: 'super',
    rpc: { request: async () => 'not-json' }
  })

  await t.exception(handler.requestRead('get.device.info'), /ERR_API_RESPONSE_INVALID/)
})

test('api-v3 auth - write failure is not retried', async (t) => {
  let calls = 0
  const handler = new WMApiV3({
    password: 'super',
    rpc: {
      request: async () => {
        calls++
        return JSON.stringify({ code: -4, msg: 'no permission', desc: 'set.miner.power_mode' })
      }
    }
  })
  handler.salt = '5QAHiKMb'

  await t.exception(handler.requestWrite('set.miner.power_mode', { param: 'normal' }), /ERR_NO_PERMISSION/)
  t.is(calls, 1)
  t.is(handler.salt, undefined)
})

test('api-v3 auth - write timeout is surfaced once without retry', async (t) => {
  let calls = 0
  const handler = new WMApiV3({
    password: 'super',
    rpc: {
      request: async () => {
        calls++
        throw new Error('ERR_API_V3_TIMEOUT')
      }
    }
  })
  handler.salt = '5QAHiKMb'

  await t.exception(handler.requestWrite('set.miner.power_mode', { param: 'normal' }), /ERR_API_V3_TIMEOUT/)
  t.is(calls, 1)
})

test('api-v3 auth - fetches salt once before the first write', async (t) => {
  const sent = []
  const handler = new WMApiV3({
    password: 'super',
    rpc: {
      request: async (raw) => {
        const request = JSON.parse(raw)
        sent.push(request)
        if (request.cmd === 'get.device.info') {
          return JSON.stringify({ code: 0, msg: { salt: '5QAHiKMb' }, desc: request.cmd })
        }
        return JSON.stringify({ code: 0, msg: 'ok', desc: request.cmd })
      }
    }
  })

  await handler.requestWrite('set.miner.power_mode', { param: 'normal' })
  t.is(sent.length, 2)
  t.is(sent[0].cmd, 'get.device.info')
  t.is(sent[1].cmd, 'set.miner.power_mode')
  t.ok(sent[1].token)
})
