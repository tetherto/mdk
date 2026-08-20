'use strict'

const test = require('brittle')
const {
  ApiHandlerFactory,
  WMApiV2,
  WMApiV3,
  API_VERSIONS,
  DEFAULT_API_VERSION,
  API_DEFAULTS
} = require('../../lib/protocols')

test('protocols/factory - exports', (t) => {
  t.ok(ApiHandlerFactory, 'should export ApiHandlerFactory')
  t.ok(WMApiV2, 'should export WMApiV2')
  t.ok(WMApiV3, 'should export WMApiV3')
  t.ok(API_VERSIONS, 'should export API_VERSIONS')
  t.ok(API_DEFAULTS, 'should export API_DEFAULTS')
})

test('protocols/factory - create V2 handler', (t) => {
  const handler = ApiHandlerFactory.create('2.0.5', {
    rpc: {},
    password: 'admin'
  })

  t.ok(handler, 'should create handler')
  t.ok(handler instanceof WMApiV2, 'should be WMApiV2 instance')
  t.is(handler.password, 'admin', 'should set password')
})

test('protocols/factory - create V3 handler', (t) => {
  const handler = ApiHandlerFactory.create('3.0.3', {
    rpc: {},
    password: 'super'
  })

  t.ok(handler, 'should create handler')
  t.ok(handler instanceof WMApiV3, 'should be WMApiV3 instance')
  t.is(handler.password, 'super', 'should set password')
})

test('protocols/factory - create with API_VERSIONS constants', (t) => {
  const v2Handler = ApiHandlerFactory.create(API_VERSIONS.V2, {
    rpc: {},
    password: 'admin'
  })

  const v3Handler = ApiHandlerFactory.create(API_VERSIONS.V3, {
    rpc: {},
    password: 'super'
  })

  t.ok(v2Handler instanceof WMApiV2, 'should create V2 handler with constant')
  t.ok(v3Handler instanceof WMApiV3, 'should create V3 handler with constant')
})

test('protocols/factory - create unsupported version throws', (t) => {
  try {
    ApiHandlerFactory.create('1.0.0', { rpc: {}, password: 'test' })
    t.fail('should throw error')
  } catch (error) {
    t.ok(error.message.includes('ERR_UNSUPPORTED_API_VERSION'), 'should throw unsupported version error')
    t.ok(error.message.includes('1.0.0'), 'should include version in error')
  }
})

test('protocols/factory - create invalid version throws', (t) => {
  const invalidVersions = [null, undefined, '', 'invalid', 'abc']

  for (const version of invalidVersions) {
    try {
      ApiHandlerFactory.create(version, { rpc: {}, password: 'test' })
      t.fail(`should throw error for version: ${version}`)
    } catch (error) {
      t.ok(error.message.includes('ERR_UNSUPPORTED_API_VERSION'), `should throw for ${version}`)
    }
  }
})

test('protocols/factory - create with partial version works', (t) => {
  const validPartialVersions = ['2.0', '2', '3', '2.2.2', '3.1.0']

  for (const version of validPartialVersions) {
    const handler = ApiHandlerFactory.create(version, { rpc: {}, password: 'test' })
    t.ok(handler, `should create handler for version: ${version}`)
  }
})

test('protocols/factory - getSupportedVersions', (t) => {
  const versions = ApiHandlerFactory.getSupportedVersions()

  t.ok(Array.isArray(versions), 'should return array')
  t.is(versions.length, 2, 'should have 2 versions')
  t.ok(versions.includes('2.0.5'), 'should include 2.0.5')
  t.ok(versions.includes('3.0.3'), 'should include 3.0.3')
})

test('protocols/factory - getHandlerClass', (t) => {
  const v2Class = ApiHandlerFactory.getHandlerClass('2.0.5')
  const v3Class = ApiHandlerFactory.getHandlerClass('3.0.3')

  t.is(v2Class, WMApiV2, 'should return WMApiV2 class')
  t.is(v3Class, WMApiV3, 'should return WMApiV3 class')

  const invalidClass = ApiHandlerFactory.getHandlerClass('invalid')
  t.is(invalidClass, undefined, 'should return undefined for invalid version')
})

test('protocols/factory - getDefaultPort', (t) => {
  t.is(ApiHandlerFactory.getDefaultPort('2.0.5'), 4028, 'V2 port should be 4028')
  t.is(ApiHandlerFactory.getDefaultPort('3.0.3'), 4433, 'V3 port should be 4433')
  t.is(ApiHandlerFactory.getDefaultPort('invalid'), 4433, 'should default to V3 port for invalid')
  t.is(ApiHandlerFactory.getDefaultPort(null), 4433, 'should default to V3 port for null')
  t.is(ApiHandlerFactory.getDefaultPort(undefined), 4433, 'should default to V3 port for undefined')
})

test('protocols/factory - DEFAULT_API_VERSION', (t) => {
  t.is(DEFAULT_API_VERSION, '3.0.3', 'DEFAULT_API_VERSION should be 3.0.3')
  t.is(DEFAULT_API_VERSION, API_VERSIONS.V3, 'DEFAULT_API_VERSION should equal API_VERSIONS.V3')
})

test('protocols/factory - isVersionSupported', (t) => {
  t.ok(ApiHandlerFactory.isVersionSupported('2.0.5'), '2.0.5 should be supported')
  t.ok(ApiHandlerFactory.isVersionSupported('3.0.3'), '3.0.3 should be supported')
  t.not(ApiHandlerFactory.isVersionSupported('1.0.0'), '1.0.0 should not be supported')
  t.not(ApiHandlerFactory.isVersionSupported('invalid'), 'invalid should not be supported')
  t.not(ApiHandlerFactory.isVersionSupported(null), 'null should not be supported')
  t.not(ApiHandlerFactory.isVersionSupported(undefined), 'undefined should not be supported')
})

test('protocols/factory - created handlers have correct properties', (t) => {
  const v2Handler = ApiHandlerFactory.create('2.0.5', {
    rpc: { test: true },
    password: 'admin',
    debugError: () => {}
  })

  const v3Handler = ApiHandlerFactory.create('3.0.3', {
    rpc: { test: true },
    password: 'super',
    debugError: () => {}
  })

  t.is(v2Handler.getAuthCommand(), 'get_token', 'V2 auth command should be get_token')
  t.is(v2Handler.transformCommand('summary'), 'summary', 'V2 should not transform commands')

  t.is(v3Handler.getAuthCommand(), 'get.device.info', 'V3 auth command should be get.device.info')
  t.is(v3Handler.transformCommand('get.device.info'), 'get.device.info', 'V3 native commands should remain unchanged')
})

test('protocols/factory - API_VERSIONS matches handler static properties', (t) => {
  t.is(API_VERSIONS.V2, WMApiV2.VERSION, 'API_VERSIONS.V2 should match WMApiV2.VERSION')
  t.is(API_VERSIONS.V3, WMApiV3.VERSION, 'API_VERSIONS.V3 should match WMApiV3.VERSION')
})

test('protocols/factory - API_DEFAULTS matches handler static properties', (t) => {
  t.is(API_DEFAULTS['2.0.5'].port, WMApiV2.DEFAULT_PORT, 'V2 port should match')
  t.is(API_DEFAULTS['3.0.3'].port, WMApiV3.DEFAULT_PORT, 'V3 port should match')
})
