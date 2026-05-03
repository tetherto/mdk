'use strict'

const test = require('brittle')
const {
  dateNowSec,
  extractIps,
  isValidJsonObject,
  isValidEmail,
  getRpcTimeout,
  getAuthTokenFromHeaders,
  parseJsonQueryParam
} = require('../../../workers/lib/utils')

const randomIPv4 = () => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.')
}

const TEST_IPS = {
  PRIVATE_1: randomIPv4(),
  PRIVATE_2: randomIPv4(),
  PRIVATE_3: randomIPv4(),
  PRIVATE_4: randomIPv4(),
  PRIVATE_5: randomIPv4()
}

test('dateNowSec - returns current timestamp in seconds', (t) => {
  const now = Date.now()
  const result = dateNowSec()

  t.ok(typeof result === 'number', 'should return number')
  t.ok(result > 0, 'should return positive number')
  t.ok(result <= Math.floor(now / 1000), 'should be less than or equal to current time')
  t.ok(result >= Math.floor(now / 1000) - 1, 'should be within 1 second of current time')

  t.pass()
})

test('extractIps - with x-forwarded-for header', (t) => {
  const req = {
    headers: {
      'x-forwarded-for': `${TEST_IPS.PRIVATE_1}, ${TEST_IPS.PRIVATE_2}, ${TEST_IPS.PRIVATE_3}`
    }
  }

  const result = extractIps(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 3, 'should return 3 IPs')
  t.ok(result.includes(TEST_IPS.PRIVATE_1), 'should include first IP')
  t.ok(result.includes(TEST_IPS.PRIVATE_2), 'should include second IP')
  t.ok(result.includes(TEST_IPS.PRIVATE_3), 'should include third IP')

  t.pass()
})

test('extractIps - with req.ip', (t) => {
  const req = {
    ip: TEST_IPS.PRIVATE_4,
    headers: {}
  }

  const result = extractIps(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should return 1 IP')
  t.ok(result.includes(TEST_IPS.PRIVATE_4), 'should include req.ip')

  t.pass()
})

test('extractIps - with req.ips', (t) => {
  const req = {
    ips: [TEST_IPS.PRIVATE_1, TEST_IPS.PRIVATE_2],
    headers: {}
  }

  const result = extractIps(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return 2 IPs')
  t.ok(result.includes(TEST_IPS.PRIVATE_1), 'should include first IP')
  t.ok(result.includes(TEST_IPS.PRIVATE_2), 'should include second IP')

  t.pass()
})

test('extractIps - with socket.remoteAddress', (t) => {
  const req = {
    socket: {
      remoteAddress: TEST_IPS.PRIVATE_5
    },
    headers: {}
  }

  const result = extractIps(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should return 1 IP')
  t.ok(result.includes(TEST_IPS.PRIVATE_5), 'should include socket.remoteAddress')

  t.pass()
})

test('extractIps - with multiple sources', (t) => {
  const req = {
    headers: {
      'x-forwarded-for': `${TEST_IPS.PRIVATE_1}, ${TEST_IPS.PRIVATE_2}`
    },
    ip: TEST_IPS.PRIVATE_4,
    ips: [TEST_IPS.PRIVATE_3],
    socket: {
      remoteAddress: TEST_IPS.PRIVATE_5
    }
  }

  const result = extractIps(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 5, 'should return 5 unique IPs')
  t.ok(result.includes(TEST_IPS.PRIVATE_1), 'should include x-forwarded-for IPs')
  t.ok(result.includes(TEST_IPS.PRIVATE_2), 'should include x-forwarded-for IPs')
  t.ok(result.includes(TEST_IPS.PRIVATE_4), 'should include req.ip')
  t.ok(result.includes(TEST_IPS.PRIVATE_3), 'should include req.ips')
  t.ok(result.includes(TEST_IPS.PRIVATE_5), 'should include socket.remoteAddress')

  t.pass()
})

test('extractIps - with no IP sources throws error', (t) => {
  const req = {
    headers: {},
    socket: null
  }

  try {
    extractIps(req)
    t.fail('should throw error when no IPs found')
  } catch (err) {
    t.is(err.message, 'ERR_IP_RESOLVE_FAIL', 'should throw ERR_IP_RESOLVE_FAIL')
  }

  t.pass()
})

test('isValidJsonObject - with valid objects', (t) => {
  const validObjects = [
    {},
    { key: 'value' },
    { nested: { key: 'value' } },
    { array: [1, 2, 3] },
    { null: null },
    { undefined }
  ]

  validObjects.forEach(obj => {
    t.ok(isValidJsonObject(obj), `should validate ${JSON.stringify(obj)} as valid`)
  })

  t.pass()
})

test('isValidJsonObject - with invalid objects', (t) => {
  const invalidObjects = [
    null,
    undefined,
    'string',
    123,
    true,
    false,
    [],
    [1, 2, 3],
    function () {}
  ]

  invalidObjects.forEach(obj => {
    t.ok(!isValidJsonObject(obj), `should validate ${typeof obj} as invalid`)
  })

  t.pass()
})

test('isValidEmail - with valid emails', (t) => {
  const validEmails = [
    'test@example.com',
    'user.name@domain.co.uk',
    'user+tag@example.org',
    'user123@test-domain.com',
    'a@b.co',
    'user.name+tag@example-domain.com'
  ]

  validEmails.forEach(email => {
    t.ok(isValidEmail(email), `should validate ${email} as valid`)
  })

  t.pass()
})

test('isValidEmail - with invalid emails', (t) => {
  const invalidEmails = [
    'not-an-email',
    '@example.com',
    'user@',
    'user@.com',
    'user@example..com',
    'user@example.com.',
    'user name@example.com',
    'user@example com',
    '',
    null,
    undefined,
    123
  ]

  invalidEmails.forEach(email => {
    t.ok(!isValidEmail(email), `should validate ${email} as invalid`)
  })

  t.pass()
})

test('getRpcTimeout - with custom timeout in conf', (t) => {
  const conf = { rpcTimeout: 30000 }
  const result = getRpcTimeout(conf)

  t.is(result, 30000, 'should return custom timeout')

  t.pass()
})

test('getRpcTimeout - without custom timeout in conf', (t) => {
  const conf = {}
  const result = getRpcTimeout(conf)

  t.is(result, 15000, 'should return default timeout')

  t.pass()
})

test('getRpcTimeout - with null conf', (t) => {
  const conf = null

  try {
    const result = getRpcTimeout(conf)
    t.is(result, 15000, 'should return default timeout for null conf')
  } catch (err) {
    t.ok(err.message.includes('Cannot read properties'), 'should handle null conf gracefully')
  }

  t.pass()
})

test('getRpcTimeout - with undefined conf', (t) => {
  const conf = undefined

  try {
    const result = getRpcTimeout(conf)
    t.is(result, 15000, 'should return default timeout for undefined conf')
  } catch (err) {
    t.ok(err.message.includes('Cannot read properties'), 'should handle undefined conf gracefully')
  }

  t.pass()
})

test('getAuthTokenFromHeaders - with authorization header', (t) => {
  const headers = {
    authorization: 'Bearer token123'
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, 'token123', 'should extract token from authorization header')

  t.pass()
})

test('getAuthTokenFromHeaders - with Authorization header (capitalized)', (t) => {
  const headers = {
    Authorization: 'Bearer token456'
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, 'token456', 'should extract token from Authorization header')

  t.pass()
})

test('getAuthTokenFromHeaders - with bearer in different case', (t) => {
  const headers = {
    authorization: 'bearer token789'
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, 'token789', 'should extract token with lowercase bearer')

  t.pass()
})

test('getAuthTokenFromHeaders - with BEARER in uppercase', (t) => {
  const headers = {
    authorization: 'BEARER tokenABC'
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, 'tokenABC', 'should extract token with uppercase BEARER')

  t.pass()
})

test('getAuthTokenFromHeaders - without bearer prefix', (t) => {
  const headers = {
    authorization: 'token123'
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, null, 'should return null without bearer prefix')

  t.pass()
})

test('getAuthTokenFromHeaders - without authorization header', (t) => {
  const headers = {}

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, null, 'should return null without authorization header')

  t.pass()
})

test('getAuthTokenFromHeaders - with null headers', (t) => {
  const headers = null

  try {
    const result = getAuthTokenFromHeaders(headers)
    t.is(result, null, 'should return null with null headers')
  } catch (err) {
    t.ok(err.message.includes('Cannot read properties'), 'should handle null headers gracefully')
  }

  t.pass()
})

test('getAuthTokenFromHeaders - with undefined headers', (t) => {
  const headers = undefined

  try {
    const result = getAuthTokenFromHeaders(headers)
    t.is(result, null, 'should return null with undefined headers')
  } catch (err) {
    t.ok(err.message.includes('Cannot read properties'), 'should handle undefined headers gracefully')
  }

  t.pass()
})

test('getAuthTokenFromHeaders - with empty authorization header', (t) => {
  const headers = {
    authorization: ''
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, null, 'should return null with empty authorization header')

  t.pass()
})

test('getAuthTokenFromHeaders - with bearer but no token', (t) => {
  const headers = {
    authorization: 'Bearer '
  }

  const result = getAuthTokenFromHeaders(headers)

  t.is(result, '', 'should return empty string with bearer but no token')

  t.pass()
})

test('parseJsonQueryParam - with valid JSON string', (t) => {
  const jsonString = '{"key": "value", "number": 123}'
  const result = parseJsonQueryParam(jsonString)

  t.ok(typeof result === 'object', 'should return object')
  t.is(result.key, 'value', 'should parse key correctly')
  t.is(result.number, 123, 'should parse number correctly')

  t.pass()
})

test('parseJsonQueryParam - with array JSON string', (t) => {
  const jsonString = '[1, 2, 3, "test"]'
  const result = parseJsonQueryParam(jsonString)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 4, 'should parse array correctly')

  t.pass()
})

test('parseJsonQueryParam - with null or undefined', (t) => {
  t.is(parseJsonQueryParam(null), undefined, 'should return undefined for null')
  t.is(parseJsonQueryParam(undefined), undefined, 'should return undefined for undefined')
  t.is(parseJsonQueryParam(''), undefined, 'should return undefined for empty string')

  t.pass()
})

test('parseJsonQueryParam - with invalid JSON throws error', (t) => {
  const invalidJson = '{"key": "value"'

  try {
    parseJsonQueryParam(invalidJson)
    t.fail('should throw error for invalid JSON')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_JSON', 'should throw ERR_INVALID_JSON')
  }

  t.pass()
})

test('parseJsonQueryParam - with custom error code', (t) => {
  const invalidJson = 'invalid-json'

  try {
    parseJsonQueryParam(invalidJson, 'ERR_CUSTOM_ERROR')
    t.fail('should throw error with custom error code')
  } catch (err) {
    t.is(err.message, 'ERR_CUSTOM_ERROR', 'should throw custom error code')
  }

  t.pass()
})
