'use strict'

const { test } = require('brittle')
const Container = require('../../lib/container')

test('Container extends Thing with type "container"', (t) => {
  const c = new Container()
  t.is(c._type, 'container', 'type is container')
  t.ok(c.conf !== undefined, 'has conf')
  t.ok(c.opts !== undefined, 'has opts')
})

test('validateWriteAction returns 1 for unknown action', (t) => {
  const c = new Container()
  t.is(c.validateWriteAction('unknownAction'), 1, 'returns 1')
})

test('validateWriteAction switchContainer: valid boolean enabled', (t) => {
  const c = new Container()
  t.is(c.validateWriteAction('switchContainer', true), 1, 'enabled true')
  t.is(c.validateWriteAction('switchContainer', false), 1, 'enabled false')
})

test('validateWriteAction switchContainer: invalid enabled throws', (t) => {
  const c = new Container()
  t.exception(() => c.validateWriteAction('switchContainer', 1), /ERR_SWITCH_CONTAINER_ENABLED_INVALID/)
  t.exception(() => c.validateWriteAction('switchContainer', 'true'), /ERR_SWITCH_CONTAINER_ENABLED_INVALID/)
  t.exception(() => c.validateWriteAction('switchContainer', null), /ERR_SWITCH_CONTAINER_ENABLED_INVALID/)
  t.exception(() => c.validateWriteAction('switchContainer'), /ERR_SWITCH_CONTAINER_ENABLED_INVALID/)
})

test('validateWriteAction switchSocket: valid array of [pduIndex, socketIndex, enabled]', (t) => {
  const c = new Container()
  t.is(c.validateWriteAction('switchSocket', [['pdu1', 'sock1', true]]), 1, 'single tuple')
  t.is(c.validateWriteAction('switchSocket', [['pdu1', 'sock1', true], ['pdu2', 'sock2', false]]), 1, 'multiple tuples')
})

test('validateWriteAction switchSocket: non-array args throws ERR_SWITCH_SOCKET_ARGS_INVALID', (t) => {
  const c = new Container()
  t.exception(() => c.validateWriteAction('switchSocket', {}), /ERR_SWITCH_SOCKET_ARGS_INVALID/)
  t.exception(() => c.validateWriteAction('switchSocket', 'x'), /ERR_SWITCH_SOCKET_ARGS_INVALID/)
  t.exception(() => c.validateWriteAction('switchSocket', null), /ERR_SWITCH_SOCKET_ARGS_INVALID/)
})

test('validateWriteAction switchSocket: invalid pduIndex throws', (t) => {
  const c = new Container()
  t.exception(() => c.validateWriteAction('switchSocket', [[1, 'sock1', true]]), /ERR_SWITCH_SOCKET_PDU_INDEX_INVALID/)
})

test('validateWriteAction switchSocket: invalid socketIndex throws', (t) => {
  const c = new Container()
  t.exception(() => c.validateWriteAction('switchSocket', [['pdu1', 1, true]]), /ERR_SWITCH_SOCKET_SOCKET_INDEX_INVALID/)
})

test('validateWriteAction switchSocket: invalid enabled throws', (t) => {
  const c = new Container()
  t.exception(() => c.validateWriteAction('switchSocket', [['pdu1', 'sock1', 1]]), /ERR_SWITCH_SOCKET_ENABLED_INVALID/)
})

test('validateWriteAction switchCoolingSystem: valid boolean', (t) => {
  const c = new Container()
  t.is(c.validateWriteAction('switchCoolingSystem', true), 1)
  t.is(c.validateWriteAction('switchCoolingSystem', false), 1)
})

test('validateWriteAction switchCoolingSystem: invalid enabled throws', (t) => {
  const c = new Container()
  t.exception(() => c.validateWriteAction('switchCoolingSystem', 1), /ERR_SWITCH_COOLING_SYSTEM_ENABLED_INVALID/)
})

test('async methods throw ERR_NO_IMPL', async (t) => {
  const c = new Container()
  const methods = [
    ['turnOnContainer', []],
    ['turnOffContainer', []],
    ['switchContainer', [true]],
    ['switchCoolingSystem', [true]],
    ['switchSocket', [[]]],
    ['turnOnCoolingSystem', []],
    ['turnOffCoolingSystem', []],
    ['resetAlarm', []]
  ]
  for (const [name, args] of methods) {
    await t.exception(async () => await c[name](...args), /ERR_NO_IMPL/, `${name} throws ERR_NO_IMPL`)
  }
})
