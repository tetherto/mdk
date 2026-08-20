'use strict'

const test = require('brittle')
const {
  API_VERSIONS,
  DEFAULT_API_VERSION,
  API_DEFAULTS,
  RESPONSE_CODES
} = require('../../lib/protocols/constants')

test('protocols/constants - API_VERSIONS exports', (t) => {
  t.ok(API_VERSIONS, 'should export API_VERSIONS')
  t.is(API_VERSIONS.V2, '2.0.5', 'V2 should be 2.0.5')
  t.is(API_VERSIONS.V3, '3.0.3', 'V3 should be 3.0.3')
})

test('protocols/constants - DEFAULT_API_VERSION', (t) => {
  t.ok(DEFAULT_API_VERSION, 'should export DEFAULT_API_VERSION')
  t.is(DEFAULT_API_VERSION, '3.0.3', 'DEFAULT_API_VERSION should be 3.0.3')
  t.is(DEFAULT_API_VERSION, API_VERSIONS.V3, 'DEFAULT_API_VERSION should equal API_VERSIONS.V3')
})

test('protocols/constants - API_DEFAULTS structure', (t) => {
  t.ok(API_DEFAULTS, 'should export API_DEFAULTS')
  t.ok(API_DEFAULTS['2.0.5'], 'should have 2.0.5 defaults')
  t.ok(API_DEFAULTS['3.0.3'], 'should have 3.0.3 defaults')
})

test('protocols/constants - V2 defaults', (t) => {
  const v2 = API_DEFAULTS['2.0.5']
  t.is(v2.port, 4028, 'V2 default port should be 4028')
  t.is(v2.authCommand, 'get_token', 'V2 auth command should be get_token')
})

test('protocols/constants - V3 defaults', (t) => {
  const v3 = API_DEFAULTS['3.0.3']
  t.is(v3.port, 4433, 'V3 default port should be 4433')
  t.is(v3.authCommand, 'get.device.info', 'V3 auth command should be get.device.info')
})

test('protocols/constants - RESPONSE_CODES', (t) => {
  t.ok(RESPONSE_CODES, 'should export RESPONSE_CODES')
  t.is(RESPONSE_CODES.OK, 131, 'OK should be 131')
  t.is(RESPONSE_CODES.TOKEN_EXPIRED, 135, 'TOKEN_EXPIRED should be 135')
  t.is(RESPONSE_CODES.IP_LIMIT, 136, 'IP_LIMIT should be 136')
})
