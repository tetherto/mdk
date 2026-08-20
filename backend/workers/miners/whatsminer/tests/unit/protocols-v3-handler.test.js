'use strict'

const test = require('brittle')
const WMApiV3 = require('../../lib/protocols/wm-api-v3')
const { API_VERSIONS } = require('../../lib/protocols/constants')

const createMockRpc = (responses) => {
  let callIndex = 0
  return {
    request: async (cmd) => {
      const response = responses[callIndex] || responses[0]
      callIndex++
      return JSON.stringify(response)
    }
  }
}

test('protocols/v3-handler - static VERSION', (t) => {
  t.is(WMApiV3.VERSION, API_VERSIONS.V3, 'VERSION should be 3.0.3')
  t.is(WMApiV3.VERSION, '3.0.3', 'VERSION should match string')
})

test('protocols/v3-handler - static DEFAULT_PORT', (t) => {
  t.is(WMApiV3.DEFAULT_PORT, 4433, 'DEFAULT_PORT should be 4433')
})

test('protocols/v3-handler - constructor', (t) => {
  const handler = new WMApiV3({
    rpc: {},
    password: 'testpass'
  })
  t.ok(handler, 'should create handler')
  t.is(handler.password, 'testpass', 'should set password')
  t.is(handler.token, undefined, 'token should be undefined initially')
})

test('protocols/v3-handler - getAuthCommand', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })
  t.is(handler.getAuthCommand(), 'get.device.info', 'should return get.device.info')
})

test('protocols/v3-handler - accepts native API v3 commands unchanged', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })

  t.is(handler.transformCommand('custom.command'), 'custom.command', 'dot notation should remain unchanged')
})

test('protocols/v3-handler - authenticate success with V3 format', async (t) => {
  const mockRpc = createMockRpc([{
    code: 0,
    when: Math.floor(Date.now() / 1000),
    msg: {
      salt: '5QAHiKMb',
      time: '0000'
    },
    desc: 'get.device.info'
  }])

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  const result = await handler.authenticate()
  t.ok(result, 'should return result')
  t.ok(result.salt, 'should have salt')
  t.is(result.salt, '5QAHiKMb', 'should have correct salt value')
  t.ok(handler.salt, 'should store salt on handler')
  t.is(handler.salt, '5QAHiKMb', 'should have correct salt stored')
})

test('protocols/v3-handler - authenticate IP limit error (V3 format)', async (t) => {
  const mockRpc = createMockRpc([{
    code: -4,
    when: Math.floor(Date.now() / 1000),
    msg: 'Too many connections',
    desc: 'get.device.info'
  }])

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  try {
    await handler.authenticate()
    t.fail('should throw error')
  } catch (error) {
    t.is(error.message, 'ERR_TOKEN_FETCH_IP_LIMIT', 'should throw IP limit error')
  }
})

test('protocols/v3-handler - authenticate missing salt error', async (t) => {
  const mockRpc = createMockRpc([{
    code: 0,
    when: Math.floor(Date.now() / 1000),
    msg: {
      time: '0000'
    },
    desc: 'get.device.info'
  }])

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  try {
    await handler.authenticate()
    t.fail('should throw error')
  } catch (error) {
    t.is(error.message, 'ERR_INVALID_AUTH_RESPONSE', 'should throw invalid auth response error')
  }
})

test('protocols/v3-handler - authenticate fail response', async (t) => {
  const mockRpc = createMockRpc([{
    code: -1,
    when: Math.floor(Date.now() / 1000),
    msg: 'Auth failed',
    desc: 'get.device.info'
  }])

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  try {
    await handler.authenticate()
    t.fail('should throw error')
  } catch (error) {
    t.is(error.message, 'ERR_AUTH_FAILED', 'should throw stable auth failed error')
  }
})

test('protocols/v3-handler - requestRead success', async (t) => {
  const mockRpc = createMockRpc([{
    code: 0,
    msg: { api: '3.0.3' },
    desc: 'get.device.info'
  }])

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  const response = await handler.requestRead('get.device.info')
  t.ok(response, 'should return response')
  t.is(response.code, 0, 'should have correct code')
  t.is(response.msg.api, '3.0.3', 'should have correct data')
})

test('protocols/v3-handler - requestRead with params', async (t) => {
  let capturedCmd
  const mockRpc = {
    request: async (cmd) => {
      capturedCmd = JSON.parse(cmd)
      return JSON.stringify({ code: 0, msg: {}, desc: 'test.cmd' })
    }
  }

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  await handler.requestRead('test.cmd', { param1: 'value1' })
  t.is(capturedCmd.cmd, 'test.cmd', 'should include command')
  t.is(capturedCmd.param1, 'value1', 'should include additional params')
})

test('protocols/v3-handler - requestRead error', async (t) => {
  const mockRpc = {
    request: async () => {
      throw new Error('Connection failed')
    }
  }

  const handler = new WMApiV3({
    rpc: mockRpc,
    password: 'super'
  })

  try {
    await handler.requestRead('get.device.info')
    t.fail('should throw error')
  } catch (error) {
    t.is(error.message, 'ERR_READ_FAILED', 'should throw read failed error')
  }
})

test('protocols/v3-handler - getTokenInfo', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })

  t.is(handler.getTokenInfo(), undefined, 'should return undefined when no salt')

  handler.salt = '5QAHiKMb'
  t.alike(handler.getTokenInfo(), { salt: '5QAHiKMb' }, 'should return salt info')
})

test('protocols/v3-handler - generateTokenInfo', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })

  t.is(handler.generateTokenInfo('set.miner.power'), undefined, 'should return undefined when no salt')

  handler.salt = '5QAHiKMb'
  const tokenInfo = handler.generateTokenInfo('set.miner.power')
  t.ok(tokenInfo, 'should return token info')
  t.ok(tokenInfo.token, 'should have token')
  t.is(tokenInfo.token.length, 8, 'token should be 8 characters')
  t.ok(tokenInfo.key, 'should have key')
  t.is(tokenInfo.salt, '5QAHiKMb', 'should have salt')
  t.ok(tokenInfo.ts, 'should have timestamp')
})

test('protocols/v3-handler - clearToken', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })

  handler.salt = '5QAHiKMb'
  t.ok(handler.salt, 'should have salt')

  handler.clearToken()
  t.is(handler.salt, undefined, 'should clear salt')
})

test('protocols/v3-handler - _getAPICodeMsg V3 format', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })

  t.is(handler._getAPICodeMsg({ code: 0 }), 'OK', 'should return OK for V3 code 0')
  t.is(handler._getAPICodeMsg({ code: -1 }), 'ERR_FAIL', 'should return FAIL for V3 code -1')
  t.is(handler._getAPICodeMsg({ code: -2 }), 'ERR_INVALID_CMD', 'should return INVALID_CMD for V3 code -2')
  t.is(handler._getAPICodeMsg({ code: -4 }), 'ERR_NO_PERMISSION', 'should return NO_PERMISSION for V3 code -4')

  t.is(handler._getAPICodeMsg({ code: 999 }), 'ERR_UNKNOWN_API_CODE', 'should return stable unknown-code error')
})

test('protocols/v3-handler - isResponseOK', (t) => {
  const handler = new WMApiV3({ rpc: {}, password: 'super' })

  t.ok(handler.isResponseOK({ code: 0 }), 'should return true for V3 code 0')
  t.not(handler.isResponseOK({ code: -1 }), 'should return false for V3 code -1')
  t.not(handler.isResponseOK({ code: -4 }), 'should return false for V3 code -4')

  t.ok(handler.isResponseOK({ Code: 131 }), 'should return true for V2 Code 131')
  t.not(handler.isResponseOK({ Code: 135 }), 'should return false for V2 Code 135')
  t.not(handler.isResponseOK(null), 'should return false for null')
})
