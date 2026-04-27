'use strict'

const { test } = require('brittle')
const Antspace = require('../../lib/antspace')

function createMockFetch (opts = {}) {
  const { body = { ok: true, params: {} } } = opts
  return {
    get: async (url, options) => ({ body }),
    request: async (url, options) => ({ body })
  }
}

test('Antspace throws when method called without client', async (t) => {
  const c = new Antspace({ address: '127.0.0.1', port: 8080 })
  try {
    await c.switchCoolingSystem(true)
    t.fail('expected switchCoolingSystem to throw')
  } catch (err) {
    t.ok(err.message.includes('undefined') || err.message.includes('get') || err.message.includes('fetch'), 'error mentions undefined or get')
  }
})

test('Antspace constructor accepts client and opts', (t) => {
  const client = createMockFetch()
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  t.ok(c.fetch === client, 'fetch is client')
  t.is(c.opts.address, '127.0.0.1', 'address set')
  t.is(c.opts.port, 8080, 'port set')
})

test('Antspace extends Container with _type container', (t) => {
  const client = createMockFetch()
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  t.is(c._type, 'container', '_type is container')
})

test('Antspace switchCoolingSystem(true) calls get with operation open', async (t) => {
  let captured = null
  const client = {
    get: async (url, options) => {
      captured = { url, qs: options?.qs }
      return { body: { ok: true } }
    }
  }
  const c = new Antspace({ client, address: '192.168.1.1', port: 9000 })
  const result = await c.switchCoolingSystem(true)
  t.ok(captured, 'get was called')
  t.ok(captured.url.includes('192.168.1.1') && captured.url.includes('9000'), 'url has address and port')
  t.is(captured.qs?.operation, 'open', 'operation is open')
  t.alike(result, { success: true }, 'returns success')
})

test('Antspace switchCoolingSystem(false) calls get with operation close', async (t) => {
  let captured = null
  const client = {
    get: async (url, options) => {
      captured = { qs: options?.qs }
      return { body: { ok: true } }
    }
  }
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  await c.switchCoolingSystem(false)
  t.is(captured?.qs?.operation, 'close', 'operation is close')
})

test('Antspace resetCoolingSystem calls get with operation reset', async (t) => {
  let captured = null
  const client = {
    get: async (url, options) => {
      captured = { qs: options?.qs }
      return { body: { ok: true } }
    }
  }
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  const result = await c.resetCoolingSystem()
  t.is(captured?.qs?.operation, 'reset', 'operation is reset')
  t.alike(result, { success: true }, 'returns success')
})

test('Antspace setLiquidSupplyTemperature calls get with setTemp and temp', async (t) => {
  let captured = null
  const client = {
    get: async (url, options) => {
      captured = { qs: options?.qs }
      return { body: { ok: true } }
    }
  }
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  await c.setLiquidSupplyTemperature(18)
  t.is(captured?.qs?.operation, 'setTemp', 'operation is setTemp')
  t.is(captured?.qs?.temp, 18, 'temp is 18')
})

test('Antspace getSystemData calls request with coolerState and returns data', async (t) => {
  const params = { supply_liquid_temp: 20, circulating_pump: true }
  const client = {
    request: async (url, options) => {
      t.is(options?.qs?.operation, 'coolerState', 'operation is coolerState')
      return { body: { ok: true, params } }
    }
  }
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  const result = await c.getSystemData()
  t.alike(result, { success: true, data: params }, 'returns success and data')
})

test('Antspace getMinerInfo calls request with minerInfo and returns data', async (t) => {
  const params = { model: 'S19', hashrate: 100 }
  const client = {
    request: async (url, options) => {
      t.is(options?.qs?.operation, 'minerInfo', 'operation is minerInfo')
      return { body: { ok: true, params } }
    }
  }
  const c = new Antspace({ client, address: '127.0.0.1', port: 8080 })
  const result = await c.getMinerInfo()
  t.alike(result, { success: true, data: params }, 'returns success and data')
})
