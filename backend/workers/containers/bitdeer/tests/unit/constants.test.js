'use strict'

const { test } = require('brittle')
const {
  MAPPINGS,
  ERROR_MAP,
  PDU_SOCKET_POWER_ON,
  PDU_SOCKET_CURRENT_ON,
  PDU_SOCKET_POWER_OFF,
  PDU_SOCKET_CURRENT_OFF,
  DEVICE_TYPE_MAP,
  DEFAULT_MQTT_PORT
} = require('../../lib/utils/constants')

test('MAPPINGS has m56, m30, a1346, s19xp', (t) => {
  t.ok(MAPPINGS.m56, 'm56 mapping exists')
  t.ok(MAPPINGS.m30, 'm30 mapping exists')
  t.ok(MAPPINGS.a1346, 'a1346 mapping exists')
  t.ok(MAPPINGS.s19xp, 's19xp mapping exists')
})

test('MAPPINGS.m56 has expected PDU keys', (t) => {
  const keys = Object.keys(MAPPINGS.m56)
  t.is(keys.length, 8, 'eight PDU keys')
  t.ok(keys.includes('1-1'), 'has 1-1')
  t.ok(keys.includes('2-4'), 'has 2-4')
})

test('MAPPINGS.m30 has socket names', (t) => {
  const sockets = MAPPINGS.m30['1-1']
  t.ok(Array.isArray(sockets), '1-1 is array')
  t.ok(sockets.includes('a1'), 'has a1')
  t.ok(sockets.includes('c5'), 'has c5')
})

test('ERROR_MAP has expected error entries', (t) => {
  t.ok(ERROR_MAP['OilPump1 error'], 'OilPump1 error')
  t.is(ERROR_MAP['OilPump1 error'].name, 'oil_pump_error', 'oil_pump_error name')
  t.is(ERROR_MAP['OilPump1 error'].message, 'Oil pump #1 has an error', 'message')
  t.ok(ERROR_MAP['Tank1 hot oil overheat'], 'Tank1 hot oil overheat')
  t.is(ERROR_MAP['Tank1 hot oil overheat'].name, 'hot_oil_overheat', 'hot_oil_overheat name')
})

test('ERROR_MAP unknown key returns undefined', (t) => {
  t.is(ERROR_MAP['Unknown error'], undefined, 'unknown key undefined')
})

test('PDU socket constants', (t) => {
  t.is(PDU_SOCKET_POWER_ON, '7.0', 'power on')
  t.is(PDU_SOCKET_CURRENT_ON, '10.1', 'current on')
  t.is(PDU_SOCKET_POWER_OFF, '0.0', 'power off')
  t.is(PDU_SOCKET_CURRENT_OFF, '0.0', 'current off')
})

test('DEVICE_TYPE_MAP has D40 types', (t) => {
  t.is(DEVICE_TYPE_MAP.D40_M56, 'm56', 'D40_M56 -> m56')
  t.is(DEVICE_TYPE_MAP.D40_M30, 'm30', 'D40_M30 -> m30')
  t.is(DEVICE_TYPE_MAP.D40_A1346, 'a1346', 'D40_A1346 -> a1346')
  t.is(DEVICE_TYPE_MAP.D40_S19xp, 's19xp', 'D40_S19xp -> s19xp')
})

test('DEFAULT_MQTT_PORT is number', (t) => {
  t.is(typeof DEFAULT_MQTT_PORT, 'number', 'DEFAULT_MQTT_PORT is number')
  t.is(DEFAULT_MQTT_PORT, 10883, 'DEFAULT_MQTT_PORT value')
})
