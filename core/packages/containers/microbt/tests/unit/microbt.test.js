'use strict'

const { test } = require('brittle')
const MicroBT = require('../../lib/microbt')
const { CONTAINER_TYPES } = require('../../lib/utils/constants')

test('MicroBT constructor throws ERR_NO_CLIENT when getClient is missing', (t) => {
  t.exception(() => new MicroBT({ address: '127.0.0.1', port: 502 }), /ERR_NO_CLIENT/)
})

test('MicroBT constructor accepts getClient and sets type and units', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient, address: '127.0.0.1', port: 502 })
  t.is(c.type, CONTAINER_TYPES.WONDERINT, 'default type is wonderint')
  t.ok(c.units, 'has units')
  t.is(c.units.fcdu, 1, 'fcdu unit 1')
  t.is(c.units.pdu01, 9, 'pdu01 unit 9')
  t.ok(c.client, 'client set')
})

test('MicroBT constructor accepts type option', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient, type: CONTAINER_TYPES.KEHUA })
  t.is(c.type, CONTAINER_TYPES.KEHUA, 'type is kehua')
})

test('MicroBT extends Container with _type container', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c._type, 'container', 'type is container')
})

test('MicroBT close() calls client.end()', (t) => {
  let ended = false
  const getClient = () => ({ end: () => { ended = true }, unitId: 1 })
  const c = new MicroBT({ getClient })
  c.close()
  t.ok(ended, 'client.end was called')
})

test('MicroBT validateWriteAction inherited: unknown action returns 1', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c.validateWriteAction('unknownAction'), 1, 'returns 1')
})

test('MicroBT validateWriteAction switchContainer: valid boolean', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c.validateWriteAction('switchContainer', true), 1)
  t.is(c.validateWriteAction('switchContainer', false), 1)
})

test('MicroBT validateWriteAction switchCoolingSystem: valid boolean', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c.validateWriteAction('switchCoolingSystem', true), 1)
  t.is(c.validateWriteAction('switchCoolingSystem', false), 1)
})

test('MicroBT validateWriteAction switchSocket: valid array of tuples', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c.validateWriteAction('switchSocket', [['1', '2', true]]), 1)
})

test('MicroBT _getStatus returns ERROR when isErrored', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c._getStatus(true, false), 'error')
  t.is(c._getStatus(true, true), 'error')
})

test('MicroBT _getStatus returns RUNNING when isRunning and not errored', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c._getStatus(false, true), 'running')
})

test('MicroBT _getStatus returns STOPPED when not running and not errored', (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  t.is(c._getStatus(false, false), 'stopped')
})

test('MicroBT switchContainer calls _writeSingleRegister with correct value', async (t) => {
  let written = null
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async (fc, addr, value) => {
      written = { addr, value }
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient, address: '127.0.0.1', port: 502 })
  c.client.unitId = 1
  await c.switchContainer(true)
  t.alike(written, { addr: 601, value: 1 }, 'wrote 1 for enabled')
  written = null
  await c.switchContainer(false)
  t.alike(written, { addr: 601, value: 0 }, 'wrote 0 for disabled')
})

test('MicroBT switchCoolingSystem delegates to switchContainer', async (t) => {
  let written = null
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async (fc, addr, value) => {
      written = { addr, value }
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient })
  c.client.unitId = 1
  await c.switchCoolingSystem(true)
  t.alike(written, { addr: 601, value: 1 }, 'wrote 1 for cooling on')
})

test('MicroBT setCoolingFanThreshold writes registers', async (t) => {
  const writes = []
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async (fc, addr, value) => {
      writes.push({ addr, value })
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient })
  c.client.unitId = 1
  await c.setCoolingFanThreshold({
    runningSpeed: 50,
    startTemp: 25,
    stopTemp: 20
  })
  t.is(writes.length, 3, 'three writes')
  t.is(writes[0].addr, 613, 'running speed register')
  t.is(writes[0].value, 5000, 'runningSpeed * 100')
  t.is(writes[1].addr, 614, 'start temp register')
  t.is(writes[1].value, 2500, 'startTemp * 100')
  t.is(writes[2].addr, 615, 'stop temp register')
  t.is(writes[2].value, 2000, 'stopTemp * 100')
})

test('MicroBT setCoolingFanThreshold only writes provided thresholds', async (t) => {
  const writes = []
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async (fc, addr, value) => {
      writes.push({ addr, value })
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient })
  c.client.unitId = 1
  await c.setCoolingFanThreshold({ runningSpeed: 30 })
  t.is(writes.length, 1, 'one write')
  t.is(writes[0].addr, 613)
  t.is(writes[0].value, 3000)
})

test('MicroBT init completes authentication', async (t) => {
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    read: async () => Buffer.alloc(8),
    write: async () => Buffer.alloc(4)
  })
  const c = new MicroBT({
    getClient,
    username: 'u',
    password: 'p',
    timeout: 5000,
    retry: 1,
    retryInterval: 1
  })
  await c.init()
  t.pass('init did not throw')
  c.close()
})

test('MicroBT _readHoldingRegisters throws ERR_MODBUS_TIMEOUT when read returns null', async (t) => {
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    read: async () => null
  })
  const c = new MicroBT({
    getClient,
    retry: 1,
    retryInterval: 1,
    timeout: 50
  })
  await t.exception(async () => {
    await c._readHoldingRegisters('fcdu', 0, 1)
  }, /ERR_MODBUS_TIMEOUT/)
  c.close()
})

test('MicroBT getSystemErrorInformation maps set bits', async (t) => {
  const buf = Buffer.alloc(20)
  buf[0] = 0x80
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    read: async () => buf,
    write: async () => Buffer.alloc(2)
  })
  const c = new MicroBT({ getClient, timeout: 5000, retry: 1, retryInterval: 1 })
  const errors = await c.getSystemErrorInformation()
  t.ok(Array.isArray(errors), 'returns array')
  t.ok(errors.length >= 1, 'at least one error when high bit set')
  c.close()
})

test('MicroBT getGeneralErrorInformation maps set bits', async (t) => {
  const buf = Buffer.alloc(10)
  buf[0] = 0x80
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    read: async () => buf,
    write: async () => Buffer.alloc(2)
  })
  const c = new MicroBT({ getClient, timeout: 5000, retry: 1, retryInterval: 1 })
  const errors = await c.getGeneralErrorInformation()
  t.ok(Array.isArray(errors), 'returns array')
  t.ok(errors.length >= 1, 'at least one error when MSB of first byte set')
  c.close()
})

test('MicroBT _socketControl throws ERR_INVALID_ARG_TYPE for non-boolean enabled', async (t) => {
  const getClient = () => ({ end: () => {}, unitId: 1 })
  const c = new MicroBT({ getClient })
  await t.exception(async () => {
    await c._socketControl('1', '1', 'true')
  }, /ERR_INVALID_ARG_TYPE/)
})

test('MicroBT switchSocket all PDUs branch', async (t) => {
  const writes = []
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async () => {
      writes.push(1)
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient, timeout: 5000, retry: 1, retryInterval: 1 })
  c.client.unitId = 1
  const res = await c.switchSocket([['-1', '-1', true]])
  t.ok(res.success)
  t.ok(writes.length >= 12 * 20, 'writes for each pdu socket')
  c.close()
})

test('MicroBT switchSocket single PDU all sockets branch', async (t) => {
  const writes = []
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async () => {
      writes.push(1)
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient, timeout: 5000, retry: 1, retryInterval: 1 })
  c.client.unitId = 1
  const res = await c.switchSocket([['1', '-1', false]])
  t.ok(res.success)
  t.is(writes.length, 20, 'twenty sockets')
  c.close()
})

test('MicroBT switchSocket single socket branch', async (t) => {
  const writes = []
  const getClient = () => ({
    end: () => {},
    unitId: 1,
    write: async (fc, addr, value) => {
      writes.push({ addr, value })
      return Buffer.alloc(2)
    }
  })
  const c = new MicroBT({ getClient, timeout: 5000, retry: 1, retryInterval: 1 })
  c.client.unitId = 1
  const res = await c.switchSocket([['01', '3', true]])
  t.ok(res.success)
  t.is(writes.length, 1)
  t.is(writes[0].addr, 309 - 3)
  t.is(writes[0].value, 1)
  c.close()
})
