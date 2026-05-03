'use strict'

const test = require('brittle')
const { createDataProxy } = require('../../workers/lib/data.proxy')

function makeRackEntry (id, type, rpcPublicKey = `key-${id}`) {
  return { id, type, info: { rpcPublicKey } }
}

function makeGetRacksEntries (entries) {
  return () => Promise.resolve(entries)
}

function makeNet (handler) {
  const calls = []
  return {
    calls,
    async jRequest (rpcPublicKey, method, params, opts) {
      const call = { rpcPublicKey, method, params, opts }
      calls.push(call)
      return handler ? handler(rpcPublicKey, method, params, opts) : []
    }
  }
}

function makeLib (handler) {
  const calls = []
  return {
    calls,
    async listThings (params) {
      calls.push({ method: 'listThings', params })
      return handler ? handler('listThings', params) : []
    },
    async getHistoricalLogs (params) {
      calls.push({ method: 'getHistoricalLogs', params })
      return handler ? handler('getHistoricalLogs', params) : []
    },
    async forgetThings (params) {
      calls.push({ method: 'forgetThings', params })
      return handler ? handler('forgetThings', params) : []
    },
    async tailLog (params) {
      calls.push({ method: 'tailLog', params })
      return handler ? handler('tailLog', params) : []
    },
    async getWrkConf (params) {
      calls.push({ method: 'getWrkConf', params })
      return handler ? handler('getWrkConf', params) : []
    }
  }
}

test('createDataProxy — defaults to RPC mode when isRpcMode is undefined', async (t) => {
  const net = makeNet(() => [{ id: 'thing1' }])
  const proxy = createDataProxy({ getRacksEntries: makeGetRacksEntries([makeRackEntry('r1', 'miner')]), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {})

  t.is(net.calls.length, 1, 'should use RPC path')
  t.is(result.length, 1)
  t.is(result[0].id, 'thing1')
})

test('createDataProxy — uses RPC mode when isRpcMode is true', async (t) => {
  const net = makeNet(() => [{ id: 'thing1' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries([makeRackEntry('r1', 'miner')]), net_r0: net, libMap: new Map() })

  await proxy.requestData('listThings', {})

  t.is(net.calls.length, 1, 'should call jRequest')
})

test('createDataProxy — uses lib mode when isRpcMode is false', async (t) => {
  const lib = makeLib(() => [{ id: 'thing1' }])
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {})

  t.is(lib.calls.length, 1, 'should call lib method')
  t.is(result[0].id, 'thing1')
})

test('requestRpcData — fans out to all racks when no type filter', async (t) => {
  const entries = [
    makeRackEntry('r1', 'miner'),
    makeRackEntry('r2', 'psu'),
    makeRackEntry('r3', 'fan')
  ]
  const net = makeNet(() => [{ id: 'thing' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestData('listThings', {})

  t.is(net.calls.length, 3, 'should call all 3 racks')
})

test('requestRpcData — filters racks by exact type match', async (t) => {
  const entries = [
    makeRackEntry('r1', 'miner'),
    makeRackEntry('r2', 'psu'),
    makeRackEntry('r3', 'miner')
  ]
  const net = makeNet(() => [{ id: 'thing' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestData('listThings', {}, { type: 'miner' })

  t.is(net.calls.length, 2, 'should only call miner racks')
  t.ok(net.calls.every(c => c.rpcPublicKey === 'key-r1' || c.rpcPublicKey === 'key-r3'))
})

test('requestRpcData — filters racks by type prefix (e.g. miner-s9)', async (t) => {
  const entries = [
    makeRackEntry('r1', 'miner-s9'),
    makeRackEntry('r2', 'miner-l7'),
    makeRackEntry('r3', 'psu')
  ]
  const net = makeNet(() => [{ id: 'thing' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestData('listThings', {}, { type: 'miner' })

  t.is(net.calls.length, 2, 'should match miner-s9 and miner-l7 via prefix')
})

test('requestRpcData — returns empty array when no racks match type', async (t) => {
  const entries = [makeRackEntry('r1', 'psu'), makeRackEntry('r2', 'fan')]
  const net = makeNet(() => [{ id: 'thing' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {}, { type: 'miner' })

  t.is(net.calls.length, 0, 'should make no calls')
  t.alike(result, [])
})

test('requestRpcData — concatenates results from multiple racks', async (t) => {
  const entries = [makeRackEntry('r1', 'miner'), makeRackEntry('r2', 'miner')]
  const net = makeNet((key) => key === 'key-r1' ? [{ id: 'a' }] : [{ id: 'b' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {})

  t.is(result.length, 2)
  const ids = result.map(r => r.id).sort()
  t.alike(ids, ['a', 'b'])
})

test('requestRpcData — wraps non-array response in array', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => ({ id: 'single' }))
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {})

  t.is(result.length, 1)
  t.is(result[0].id, 'single')
})

test('requestRpcData — silently skips racks that throw', async (t) => {
  const entries = [makeRackEntry('r1', 'miner'), makeRackEntry('r2', 'miner')]
  let callCount = 0
  const net = makeNet((key) => {
    callCount++
    if (key === 'key-r1') throw new Error('network error')
    return [{ id: 'ok' }]
  })
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {})

  t.is(callCount, 2, 'should attempt both racks')
  t.is(result.length, 1, 'should return only successful result')
  t.is(result[0].id, 'ok')
})

test('requestRpcData — passes timeout option to jRequest', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => [])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestData('listThings', {}, { timeout: 5000 })

  t.is(net.calls[0].opts.timeout, 5000)
})

test('requestRpcData — uses default timeout of 30000 when not specified', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => [])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestData('listThings', {})

  t.is(net.calls[0].opts.timeout, 30000)
})

test('requestRpcData — passes params to jRequest', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => [])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const params = { query: { type: 'miner' }, fields: { id: 1 } }
  await proxy.requestData('listThings', params)

  t.alike(net.calls[0].params, params)
})

test('requestRpcData — returns empty array when racks store is empty', async (t) => {
  const net = makeNet(() => [{ id: 'thing' }])
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries([]), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {})

  t.alike(result, [])
  t.is(net.calls.length, 0)
})

test('requestLibData — fans out to all libs when no type filter', async (t) => {
  const lib1 = makeLib(() => [{ id: 'a' }])
  const lib2 = makeLib(() => [{ id: 'b' }])
  const libMap = new Map([
    ['r1', { lib: lib1, type: 'miner' }],
    ['r2', { lib: lib2, type: 'psu' }]
  ])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {})

  t.is(lib1.calls.length, 1)
  t.is(lib2.calls.length, 1)
  t.is(result.length, 2)
})

test('requestLibData — filters libs by exact type match', async (t) => {
  const lib1 = makeLib(() => [{ id: 'a' }])
  const lib2 = makeLib(() => [{ id: 'b' }])
  const libMap = new Map([
    ['r1', { lib: lib1, type: 'miner' }],
    ['r2', { lib: lib2, type: 'psu' }]
  ])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {}, { type: 'miner' })

  t.is(lib1.calls.length, 1, 'should call miner lib')
  t.is(lib2.calls.length, 0, 'should skip psu lib')
  t.is(result.length, 1)
  t.is(result[0].id, 'a')
})

test('requestLibData — filters libs by type prefix', async (t) => {
  const lib1 = makeLib(() => [{ id: 'a' }])
  const lib2 = makeLib(() => [{ id: 'b' }])
  const lib3 = makeLib(() => [{ id: 'c' }])
  const libMap = new Map([
    ['r1', { lib: lib1, type: 'miner-s9' }],
    ['r2', { lib: lib2, type: 'miner-l7' }],
    ['r3', { lib: lib3, type: 'psu' }]
  ])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {}, { type: 'miner' })

  t.is(lib1.calls.length, 1)
  t.is(lib2.calls.length, 1)
  t.is(lib3.calls.length, 0)
  t.is(result.length, 2)
})

test('requestLibData — returns empty array when no libs match type', async (t) => {
  const lib1 = makeLib(() => [{ id: 'a' }])
  const libMap = new Map([['r1', { lib: lib1, type: 'psu' }]])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {}, { type: 'miner' })

  t.alike(result, [])
  t.is(lib1.calls.length, 0)
})

test('requestLibData — silently skips libs that throw and logs error', async (t) => {
  const errors = []
  const origError = console.error
  console.error = (...args) => errors.push(args)

  const lib1 = {
    calls: [],
    async listThings () { throw new Error('lib error') }
  }
  const lib2 = makeLib(() => [{ id: 'ok' }])
  const libMap = new Map([
    ['r1', { lib: lib1, type: 'miner' }],
    ['r2', { lib: lib2, type: 'miner' }]
  ])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {})

  console.error = origError

  t.is(result.length, 1, 'should return result from healthy lib')
  t.is(result[0].id, 'ok')
  t.is(errors.length, 1, 'should log one error')
  t.ok(errors[0][0].includes('listThings'), 'error message should include method name')
})

test('requestLibData — concatenates results from multiple libs', async (t) => {
  const lib1 = makeLib(() => [{ id: 'a' }, { id: 'b' }])
  const lib2 = makeLib(() => [{ id: 'c' }])
  const libMap = new Map([
    ['r1', { lib: lib1, type: 'miner' }],
    ['r2', { lib: lib2, type: 'miner' }]
  ])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {})

  t.is(result.length, 3)
})

test('requestLibData — handles lib returning non-array gracefully', async (t) => {
  const lib = {
    async listThings () { return { id: 'not-an-array' } }
  }
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {})

  t.alike(result, [], 'non-array response should be ignored')
})

test('requestLibData — returns empty array when libMap is empty', async (t) => {
  const proxy = createDataProxy({ isRpcMode: false, libMap: new Map(), getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestData('listThings', {})

  t.alike(result, [])
})

test('requestLibData — passes params to lib method', async (t) => {
  const lib = makeLib(() => [])
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const params = { query: { active: true } }
  await proxy.requestData('listThings', params)

  t.alike(lib.calls[0].params, params)
})

test('requestRackData — returns result for known rackId in RPC mode', async (t) => {
  const entries = [makeRackEntry('r1', 'miner'), makeRackEntry('r2', 'psu')]
  const net = makeNet(() => ({ setting: 'value' }))
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestRackData('r1', 'getWrkSettings', { rackId: 'r1' })

  t.is(net.calls.length, 1, 'should call jRequest exactly once')
  t.is(net.calls[0].rpcPublicKey, 'key-r1', 'should call correct rack')
  t.is(net.calls[0].method, 'getWrkSettings')
  t.alike(result, { setting: 'value' })
})

test('requestRackData — returns null for unknown rackId in RPC mode', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => ({ setting: 'value' }))
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestRackData('unknown', 'getWrkSettings', {})

  t.is(result, null, 'should return null when rack not found')
  t.is(net.calls.length, 0, 'should not call jRequest')
})

test('requestRackData — throws when jRequest throws in RPC mode', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => { throw new Error('network error') })
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  try {
    await proxy.requestRackData('r1', 'getWrkSettings', {})
    t.fail('should throw')
  } catch (e) {
    t.is(e.message, 'network error', 'should propagate the error')
  }
})

test('requestRackData — passes timeout option to jRequest', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => 1)
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestRackData('r1', 'saveWrkSettings', {}, { timeout: 5000 })

  t.is(net.calls[0].opts.timeout, 5000)
})

test('requestRackData — uses default timeout of 30000 when not specified', async (t) => {
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => 1)
  const proxy = createDataProxy({ isRpcMode: true, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  await proxy.requestRackData('r1', 'saveWrkSettings', {})

  t.is(net.calls[0].opts.timeout, 30000)
})

test('requestRackData — returns result for known rackId in lib mode', async (t) => {
  const lib = {
    async getWrkSettings (params) { return { setting: 'lib-value' } }
  }
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestRackData('r1', 'getWrkSettings', { rackId: 'r1' })

  t.alike(result, { setting: 'lib-value' })
})

test('requestRackData — returns null for unknown rackId in lib mode', async (t) => {
  const libMap = new Map([['r1', { lib: {}, type: 'miner' }]])
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries([]), net_r0: makeNet() })

  const result = await proxy.requestRackData('unknown', 'getWrkSettings', {})

  t.is(result, null, 'should return null when lib entry not found')
})

test('requestRackData — routes to lib mode when isRpcMode is false', async (t) => {
  const lib = { async getWrkSettings () { return { from: 'lib' } } }
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => ({ from: 'rpc' }))
  const proxy = createDataProxy({ isRpcMode: false, libMap, getRacksEntries: makeGetRacksEntries(entries), net_r0: net })

  const result = await proxy.requestRackData('r1', 'getWrkSettings', {})

  t.is(net.calls.length, 0, 'should not call RPC')
  t.alike(result, { from: 'lib' })
})

test('isRpcMode — undefined falls back to RPC mode via default parameter', async (t) => {
  // ctx has no isRpcMode key → destructuring default { isRpcMode = true } kicks in
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => [{ id: 'x' }])
  const proxy = createDataProxy({ getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap: new Map() })

  const result = await proxy.requestData('listThings', {})

  t.is(net.calls.length, 1, 'undefined isRpcMode should default to RPC mode')
  t.is(result[0].id, 'x')
})

test('isRpcMode — null routes to lib mode (null is not undefined, default does not apply)', async (t) => {
  // The worker normalises null → true before calling createDataProxy.
  // If null reaches createDataProxy directly, !null === true → lib mode is used.
  const lib = makeLib(() => [{ id: 'lib-result' }])
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => [{ id: 'rpc-result' }])
  const proxy = createDataProxy({ isRpcMode: null, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap })

  const result = await proxy.requestData('listThings', {})

  t.is(net.calls.length, 0, 'should not call RPC when isRpcMode is null')
  t.is(lib.calls.length, 1, 'should fall through to lib mode')
  t.is(result[0].id, 'lib-result')
})

test('isRpcMode — false explicitly routes to lib mode', async (t) => {
  const lib = makeLib(() => [{ id: 'lib-result' }])
  const libMap = new Map([['r1', { lib, type: 'miner' }]])
  const entries = [makeRackEntry('r1', 'miner')]
  const net = makeNet(() => [{ id: 'rpc-result' }])
  const proxy = createDataProxy({ isRpcMode: false, getRacksEntries: makeGetRacksEntries(entries), net_r0: net, libMap })

  const result = await proxy.requestData('listThings', {})

  t.is(net.calls.length, 0, 'should not call RPC')
  t.is(lib.calls.length, 1, 'should call lib')
  t.is(result[0].id, 'lib-result')
})

test('isRpcMode — mode is captured at proxy creation time (not re-evaluated)', async (t) => {
  const ctx = { isRpcMode: true, getRacksEntries: makeGetRacksEntries([makeRackEntry('r1', 'miner')]), net_r0: makeNet(() => [{ id: 'rpc' }]), libMap: new Map() }
  const proxy = createDataProxy(ctx)

  // mutate ctx after proxy creation — should have no effect
  ctx.isRpcMode = false

  const result = await proxy.requestData('listThings', {})

  t.is(ctx.net_r0.calls.length, 1, 'should still use RPC mode captured at creation')
  t.is(result[0].id, 'rpc')
})
