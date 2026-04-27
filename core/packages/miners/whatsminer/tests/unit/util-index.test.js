'use strict'

const test = require('brittle')
const { getErrorMsg, getAPICodeMsg } = require('../../lib/utils')

test('getErrorMsg - returns known error message for valid code', (t) => {
  t.is(getErrorMsg(110), 'hashrate_low')
  t.is(getErrorMsg(120), 'fan_speed_error')
  t.is(getErrorMsg(200), 'power_probing_error')
  t.is(getErrorMsg(300), 'temp_sensor_detection_error')
  t.is(getErrorMsg(600), 'env_temp_high')
})

test('getErrorMsg - returns "Unknown error" for unknown code', (t) => {
  t.is(getErrorMsg(99999), 'Unknown error')
  t.is(getErrorMsg(0), 'Unknown error')
})

test('getErrorMsg - returns string for all entries', (t) => {
  const knownCodes = [110, 111, 120, 121, 130, 131, 140, 200, 201, 350, 360, 500, 600, 800, 2000]
  for (const code of knownCodes) {
    t.is(typeof getErrorMsg(code), 'string')
    t.not(getErrorMsg(code), '')
  }
})

test('getAPICodeMsg - returns "OK" for code 131', (t) => {
  const res = { Code: 131, Msg: 'API command OK' }
  t.is(getAPICodeMsg(res), 'Error 131: OK')
})

test('getAPICodeMsg - returns auth error for code 23 with enc json load err', (t) => {
  const res = { Code: 23, Msg: 'enc json load err' }
  t.is(getAPICodeMsg(res), 'Invalid authentication')
})

test('getAPICodeMsg - returns generic message for code 23 with other msg', (t) => {
  const res = { Code: 23, Msg: 'some other error' }
  t.is(getAPICodeMsg(res), 'Error 23: Invalid JSON message')
})

test('getAPICodeMsg - returns permission denied for code 45', (t) => {
  const res = { Code: 45, Msg: 'Permission denied' }
  t.is(getAPICodeMsg(res), 'Error 45: Permission denied')
})

test('getAPICodeMsg - returns token error for code 135', (t) => {
  const res = { Code: 135, Msg: 'check token err' }
  t.is(getAPICodeMsg(res), 'Error 135: Token error')
})

test('getAPICodeMsg - returns unknown code for unrecognized code', (t) => {
  const res = { Code: 9999, Msg: 'something' }
  t.is(getAPICodeMsg(res), 'Error 9999: Unknown code')
})

test('getAPICodeMsg - returns too many tokens for code 136', (t) => {
  const res = { Code: 136, Msg: 'too many tokens' }
  t.is(getAPICodeMsg(res), 'Error 136: Too many tokens')
})
