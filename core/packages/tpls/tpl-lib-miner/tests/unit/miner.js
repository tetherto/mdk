'use strict'

const { test } = require('brittle')

let Miner
try {
  Miner = require('../../lib/miner')
} catch (e) {
  test.skip('lib/miner requires tpl-lib-thing', (t) => {
    t.pass('skipped')
  })
}

if (Miner) {
  function createMiner (opts = {}) {
    return new Miner(opts)
  }

  test('Miner constructor initializes deviceDataCache and cachedShares', (t) => {
    const miner = createMiner()
    t.alike(miner.deviceDataCache, {})
    t.alike(miner.cachedShares, { accepted: 0, rejected: 0, stale: 0 })
    t.is(miner._type, 'miner')
  })

  test('Miner constructor passes opts to Thing', (t) => {
    const miner = createMiner({ id: 'm1', timeout: 5000 })
    t.is(miner.opts.id, 'm1')
    t.is(miner.opts.timeout, 5000)
  })

  test('validateWriteAction: setLED with valid boolean returns 1', (t) => {
    const miner = createMiner()
    t.is(miner.validateWriteAction('setLED', true), 1)
    t.is(miner.validateWriteAction('setLED', false), 1)
  })

  test('validateWriteAction: setLED with invalid type throws', (t) => {
    const miner = createMiner()
    t.exception(() => miner.validateWriteAction('setLED', 1), /ERR_SET_LED_ENABLED_INVALID/)
    t.exception(() => miner.validateWriteAction('setLED', 'on'), /ERR_SET_LED_ENABLED_INVALID/)
    t.exception(() => miner.validateWriteAction('setLED', null), /ERR_SET_LED_ENABLED_INVALID/)
  })

  test('validateWriteAction: unknown action returns 1', (t) => {
    const miner = createMiner()
    t.is(miner.validateWriteAction('reboot'), 1)
  })

  test('checkSamePools: returns true when pools match', (t) => {
    const miner = createMiner()
    const newPools = [
      { url: 'stratum://pool1', worker_name: 'w1.id' },
      { url: 'stratum://pool2', worker_name: 'w2.id' }
    ]
    const oldPools = [
      { url: 'stratum://pool1', username: 'w1.id' },
      { url: 'stratum://pool2', username: 'w2.id' }
    ]
    t.ok(miner.checkSamePools(newPools, oldPools))
  })

  test('checkSamePools: returns false when length differs', (t) => {
    const miner = createMiner()
    const newPools = [{ url: 'x', worker_name: 'w' }]
    const oldPools = [{ url: 'x', username: 'w' }, { url: 'y', username: 'w2' }]
    t.not(miner.checkSamePools(newPools, oldPools))
  })

  test('checkSamePools: returns false when url not found in old', (t) => {
    const miner = createMiner()
    const newPools = [{ url: 'stratum://pool1', worker_name: 'w1' }]
    const oldPools = [{ url: 'stratum://pool2', username: 'w1' }]
    t.not(miner.checkSamePools(newPools, oldPools))
  })

  test('checkSamePools: returns false when worker_name !== username', (t) => {
    const miner = createMiner()
    const newPools = [{ url: 'stratum://pool1', worker_name: 'w1' }]
    const oldPools = [{ url: 'stratum://pool1', username: 'w2' }]
    t.not(miner.checkSamePools(newPools, oldPools))
  })

  test('preProcessPoolData: throws for non-array', (t) => {
    const miner = createMiner({ id: 'm1' })
    t.exception(() => miner.preProcessPoolData(null), /ERR_INVALID_ARG_TYPE/)
    t.exception(() => miner.preProcessPoolData('pools'), /ERR_INVALID_ARG_TYPE/)
  })

  test('preProcessPoolData: with appendId adds id to worker_name', (t) => {
    const miner = createMiner({ id: 'm1' })
    const pools = [
      { url: 'stratum://p1', worker_name: 'w1', worker_password: 'pwd' }
    ]
    const result = miner.preProcessPoolData(pools, true)
    t.is(result.length, 3)
    t.is(result[0].worker_name, 'w1.m1')
    t.is(result[1].url, '')
    t.is(result[2].worker_name, '')
  })

  test('preProcessPoolData: without appendId does not modify worker_name', (t) => {
    const miner = createMiner({ id: 'm1' })
    const pools = [
      { url: 'stratum://p1', worker_name: 'w1' }
    ]
    const result = miner.preProcessPoolData(pools, false)
    t.is(result.length, 3)
    t.is(result[0].worker_name, 'w1')
  })

  test('preProcessPoolData: pads to 3 pools when less', (t) => {
    const miner = createMiner({ id: 'm1' })
    const pools = []
    const result = miner.preProcessPoolData(pools, false)
    t.is(result.length, 3)
    t.alike(result[0], { url: '', worker_name: '', worker_password: '' })
  })

  test('_prepPools: returns false when same as oldPools', (t) => {
    const miner = createMiner({ id: 'm1' })
    const pools = [
      { url: 'stratum://p1', worker_name: 'w1' }
    ]
    const oldPools = [
      { url: 'stratum://p1', username: 'w1.m1' },
      { url: '', username: '' },
      { url: '', username: '' }
    ]
    t.is(miner._prepPools(pools, true, oldPools), false)
  })

  test('_prepPools: returns pools when different from oldPools', (t) => {
    const miner = createMiner({ id: 'm1' })
    const pools = [{ url: 'stratum://p1', worker_name: 'w2' }]
    const oldPools = [{ url: 'stratum://p1', username: 'w1.m1' }]
    const result = miner._prepPools(pools, true, oldPools)
    t.ok(Array.isArray(result))
    t.is(result[0].worker_name, 'w2.m1')
  })

  test('_prepPools: without oldPools returns processed pools', (t) => {
    const miner = createMiner({ id: 'm1' })
    const pools = [{ url: 'stratum://p1', worker_name: 'w1' }]
    const result = miner._prepPools(pools, true)
    t.ok(Array.isArray(result))
    t.is(result.length, 3)
  })

  test('setupPools: returns success false when setPools throws', async (t) => {
    const miner = createMiner()
    miner.conf = { pools: [] }
    const result = await miner.setupPools()
    t.not(result.success)
    t.ok(result.error_msg)
  })

  test('setupPools: returns success true when setPools succeeds', async (t) => {
    const miner = createMiner()
    miner.conf = { pools: [] }
    miner.setPools = async () => {}
    const result = await miner.setupPools()
    t.ok(result.success)
  })

  test('fetchDeviceData: calls fn when cache empty', async (t) => {
    const miner = createMiner()
    let called = 0
    async function fetcher () {
      called++
      return { temp: 65 }
    }
    const data = await miner.fetchDeviceData(fetcher)
    t.is(called, 1)
    t.alike(data, { temp: 65 })
  })

  test('fetchDeviceData: uses cache within cacheTime', async (t) => {
    const miner = createMiner()
    let called = 0
    async function fetcher () {
      called++
      return { temp: 65 }
    }
    await miner.fetchDeviceData(fetcher, 5000)
    const data = await miner.fetchDeviceData(fetcher, 5000)
    t.is(called, 1)
    t.alike(data, { temp: 65 })
  })

  test('fetchDeviceData: refetches after cacheTime', async (t) => {
    const miner = createMiner()
    let called = 0
    async function fetcher () {
      called++
      return { temp: 65 + called }
    }
    await miner.fetchDeviceData(fetcher, 0)
    await new Promise(resolve => setTimeout(resolve, 10))
    const data = await miner.fetchDeviceData(fetcher, 1)
    t.is(called, 2)
    t.is(data.temp, 67)
  })

  test('_calcNewShares: returns zeros for non-array or empty pools', (t) => {
    const miner = createMiner()
    t.alike(miner._calcNewShares(null), { accepted: 0, rejected: 0, stale: 0 })
    t.alike(miner._calcNewShares([]), { accepted: 0, rejected: 0, stale: 0 })
  })

  test('_calcNewShares: calculates new shares correctly', (t) => {
    const miner = createMiner()
    const pools = [
      { accepted: 10, rejected: 1, stale: 0 },
      { accepted: 5, rejected: 0, stale: 2 }
    ]
    const shares = miner._calcNewShares(pools)
    t.is(shares.accepted, 15)
    t.is(shares.rejected, 1)
    t.is(shares.stale, 2)
    t.alike(miner.cachedShares, { accepted: 15, rejected: 1, stale: 2 })
  })

  test('_calcNewShares: computes delta on subsequent call', (t) => {
    const miner = createMiner()
    miner._calcNewShares([{ accepted: 10, rejected: 0, stale: 0 }])
    const shares = miner._calcNewShares([{ accepted: 25, rejected: 2, stale: 1 }])
    t.is(shares.accepted, 15)
    t.is(shares.rejected, 2)
    t.is(shares.stale, 1)
  })

  test('_calcNewShares: handles reset/counter rollover', (t) => {
    const miner = createMiner()
    miner.cachedShares = { accepted: 100, rejected: 10, stale: 5 }
    const pools = [{ accepted: 5, rejected: 1, stale: 0 }]
    const shares = miner._calcNewShares(pools)
    t.is(shares.accepted, 5)
    t.is(shares.rejected, 1)
    t.is(shares.stale, 0)
  })

  test('getPools throws Not implemented', async (t) => {
    const miner = createMiner()
    await t.exception(async () => miner.getPools(), /Not implemented/)
  })
}
