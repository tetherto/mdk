'use strict'

const test = require('brittle')
const fs = require('fs')
const { createWorker } = require('tether-svc-test-helper').worker
const { setTimeout: sleep } = require('timers/promises')
const HttpFacility = require('@bitfinex/bfx-facs-http')
const { ENDPOINTS } = require('../../workers/lib/constants')
const { MOCK_MINERS: mockMiners } = require('./helpers/mock-data')

test('Api', { timeout: 90000 }, async (main) => {
  const baseDir = 'tests/integration'
  let worker
  let httpClient
  const appNodePort = 5000
  const ip = '127.0.0.1'
  const appNodeBaseUrl = `http://${ip}:${appNodePort}`
  const readonlyUser = 'readonly@test'
  const siteOperatorUser = 'siteoperator@test'
  const admin1 = 'admin1@test.test'
  const admin2 = 'admin2@test.test'
  const newCreatedUser = 'admin@test.test'
  let superadminUser
  const encoding = 'json'
  const tokenExpiredUser = 'tokenexpire@test'
  const invalidToken = 'invalid-token'

  main.teardown(async () => {
    await httpClient.stop()
    await worker.stop()
    // wait for worker to stop
    await sleep(2000)
    // delete store, status, config dirs after tests complete
    fs.rmSync(`./${baseDir}/store`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/status`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/config`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/db`, { recursive: true, force: true })
  })

  const createConfig = () => {
    fs.rmSync(`./${baseDir}/store`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/status`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/config`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/db`, { recursive: true, force: true })

    if (!fs.existsSync(`./${baseDir}/config/facs`)) {
      if (!fs.existsSync(`./${baseDir}/config`)) fs.mkdirSync(`./${baseDir}/config`)
      fs.mkdirSync(`./${baseDir}/config/facs`)
    }
    if (!fs.existsSync(`./${baseDir}/db`)) fs.mkdirSync(`./${baseDir}/db`)

    const commonConf = { dir_log: 'logs', debug: 0, orks: { 'cluster-1': { rpcPublicKey: '' } }, cacheTiming: {}, featureConfig: {} }
    const netConf = { r0: {} }
    const httpdConf = { h0: {} }
    const httpdOauthConf = {
      h0: { method: 'google', credentials: { client: { id: 'i', secret: 's' } }, users: [{ email: readonlyUser }, { email: tokenExpiredUser }, { email: siteOperatorUser, write: true }] },
      h1: { method: 'microsoft', credentials: { client: { id: 'i', secret: 's' }, tenant: 'test-tenant' }, users: [] }
    }
    const authConf = require('../../config/facs/auth.config.json')
    superadminUser = authConf.a0.superAdmin

    fs.writeFileSync(`./${baseDir}/config/common.json`, JSON.stringify(commonConf))
    fs.writeFileSync(`./${baseDir}/config/facs/net.config.json`, JSON.stringify(netConf))
    fs.writeFileSync(`./${baseDir}/config/facs/httpd.config.json`, JSON.stringify(httpdConf))
    fs.writeFileSync(`./${baseDir}/config/facs/httpd-oauth2.config.json`, JSON.stringify(httpdOauthConf))
    fs.writeFileSync(`./${baseDir}/config/facs/auth.config.json`, JSON.stringify(authConf))
  }

  const startWorker = async () => {
    worker = createWorker({
      env: 'test',
      wtype: 'wrk-node-http-test',
      rack: 'test-rack',
      tmpdir: baseDir,
      storeDir: 'test-store',
      serviceRoot: `${process.cwd()}/${baseDir}`,
      port: appNodePort
    })

    await worker.start()
    worker.worker.net_r0.jRequest = (publicKey, method) => {
      if (method === 'listThings') {
        return Promise.resolve(mockMiners)
      }
      if (method === 'getThingsCount') {
        return Promise.resolve(mockMiners.length)
      }
      if (method === 'getWrkExtData') {
        return Promise.resolve([])
      }
      return Promise.resolve({})
    }
  }

  const createHttpClient = async () => {
    httpClient = new HttpFacility({}, { ns: 'c0', timeout: 30000, debug: false }, { env: 'test' })
    await httpClient.start()
  }

  const getTestToken = async (email) => {
    worker.worker.authLib._auth.addHandlers({
      google: () => { return { email } }
    })
    const token = await worker.worker.auth_a0.authCallbackHandler('google', { ip })
    return token
  }

  const getTestTokenMicrosoft = async (email) => {
    worker.worker.authLib._auth.addHandlers({
      microsoft: () => { return { email } }
    })
    const token = await worker.worker.auth_a0.authCallbackHandler('microsoft', { ip })
    return token
  }

  const createUser = async (email, role, token) => {
    if (!token) token = await getTestToken(superadminUser)

    await httpClient.post(`${appNodeBaseUrl}${ENDPOINTS.USERS}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        body: { data: { email, role } },
        encoding
      })
  }

  const testMissingAuthToken = async (httpClient, method, api, options = {}) => {
    try {
      await httpClient[method](api, { ...options, encoding: options.encoding || 'json' })
      throw new Error('Expected error for missing auth token but request succeeded')
    } catch (e) {
      if (!e.response || !e.response.message || !e.response.message.includes('ERR_AUTH_FAIL')) {
        throw new Error(`Expected ERR_AUTH_FAIL but got: ${e.message || e}`)
      }
      return true
    }
  }

  const testInvalidAuthToken = async (httpClient, method, api, invalidToken, options = {}) => {
    const headers = { Authorization: `Bearer ${invalidToken}` }
    try {
      await httpClient[method](api, { ...options, headers, encoding: options.encoding || 'json' })
      throw new Error('Expected error for invalid auth token but request succeeded')
    } catch (e) {
      if (!e.response || !e.response.message || !e.response.message.includes('ERR_AUTH_FAIL')) {
        throw new Error(`Expected ERR_AUTH_FAIL but got: ${e.message || e}`)
      }
      return true
    }
  }

  const testValidAuthToken = async (httpClient, method, api, userEmail, options = {}) => {
    const token = await getTestToken(userEmail)
    const headers = { Authorization: `Bearer ${token}` }
    try {
      await httpClient[method](api, { ...options, headers, encoding: options.encoding || 'json' })
      return true
    } catch (e) {
      throw new Error(`Expected success but got error: ${e.message || e}`)
    }
  }

  const testInvalidPermissions = async (httpClient, method, api, userEmail, expectedError, options = {}) => {
    const token = await getTestToken(userEmail)
    const headers = { Authorization: `Bearer ${token}` }
    try {
      await httpClient[method](api, { ...options, headers, encoding: options.encoding || 'json' })
      throw new Error('Expected error for invalid permissions but request succeeded')
    } catch (e) {
      if (!e.response || !e.response.message || !e.response.message.includes(expectedError)) {
        throw new Error(`Expected ${expectedError} but got: ${e.message || e}`)
      }
      return true
    }
  }

  const createAuthHeaders = async (userEmail) => {
    const token = await getTestToken(userEmail)
    return { Authorization: `Bearer ${token}` }
  }

  const createEndpointSecurityTests = (httpClient, method, api, invalidToken, options = {}, userEmail = 'readonly@test', encoding = 'json') => {
    const requestOptions = { ...options, encoding }

    return [
      {
        name: 'api should fail for missing auth token',
        test: () => testMissingAuthToken(httpClient, method, api, requestOptions)
      },
      {
        name: 'api should fail for invalid auth token',
        test: () => testInvalidAuthToken(httpClient, method, api, invalidToken, requestOptions)
      },
      {
        name: 'api should succeed for valid auth token',
        test: () => testValidAuthToken(httpClient, method, api, userEmail, requestOptions)
      }
    ]
  }

  const createEndpointSecurityWithPermissionsTests = (httpClient, method, api, invalidToken, permissionUser, permissionError, validUser, options = {}, encoding = 'json') => {
    return [
      {
        name: 'api should fail for missing auth token',
        test: () => testMissingAuthToken(httpClient, method, api, { ...options, encoding })
      },
      {
        name: 'api should fail for invalid auth token',
        test: () => testInvalidAuthToken(httpClient, method, api, invalidToken, { ...options, encoding })
      },
      {
        name: 'api should fail for invalid permissions',
        test: () => testInvalidPermissions(httpClient, method, api, permissionUser, permissionError, { ...options, encoding })
      },
      {
        name: 'api should succeed for valid auth token',
        test: () => testValidAuthToken(httpClient, method, api, validUser, { ...options, encoding })
      }
    ]
  }

  const runTestCases = async (n, testCases) => {
    for (const testCase of testCases) {
      await n.test(testCase.name, async (t) => {
        try {
          await testCase.test()
          t.pass(testCase.name)
        } catch (e) {
          t.fail(e.message)
        }
      })
    }
  }

  const testEndpointSecurity = async (n, httpClient, method, api, invalidToken, options = {}, userEmail = 'readonly@test', encoding = 'json') => {
    const tests = createEndpointSecurityTests(httpClient, method, api, invalidToken, options, userEmail, encoding)
    await runTestCases(n, tests)
  }

  const testGetEndpointSecurity = async (n, httpClient, api, invalidToken, userEmail = 'readonly@test', encoding = 'json') => {
    await testEndpointSecurity(n, httpClient, 'get', api, invalidToken, {}, userEmail, encoding)
  }

  const testPostEndpointSecurity = async (n, httpClient, api, invalidToken, body, userEmail = 'readonly@test', encoding = 'json') => {
    await testEndpointSecurity(n, httpClient, 'post', api, invalidToken, { body }, userEmail, encoding)
  }

  const testPutEndpointSecurity = async (n, httpClient, api, invalidToken, body, userEmail = 'readonly@test', encoding = 'json') => {
    await testEndpointSecurity(n, httpClient, 'put', api, invalidToken, { body }, userEmail, encoding)
  }

  const testDeleteEndpointSecurity = async (n, httpClient, api, invalidToken, options = {}, userEmail = 'readonly@test', encoding = 'json') => {
    await testEndpointSecurity(n, httpClient, 'delete', api, invalidToken, options, userEmail, encoding)
  }

  const testPostEndpointSecurityWithPermissions = async (n, httpClient, api, invalidToken, body, permissionUser, permissionError, validUser, encoding = 'json') => {
    const tests = createEndpointSecurityWithPermissionsTests(httpClient, 'post', api, invalidToken, permissionUser, permissionError, validUser, { body }, encoding)
    await runTestCases(n, tests)
  }

  const testPutEndpointSecurityWithPermissions = async (n, httpClient, api, invalidToken, body, permissionUser, permissionError, validUser, encoding = 'json') => {
    const tests = createEndpointSecurityWithPermissionsTests(httpClient, 'put', api, invalidToken, permissionUser, permissionError, validUser, { body }, encoding)
    await runTestCases(n, tests)
  }

  const testDeleteEndpointSecurityWithPermissions = async (n, httpClient, api, invalidToken, permissionUser, permissionError, validUser, options = {}, encoding = 'json') => {
    const tests = createEndpointSecurityWithPermissionsTests(httpClient, 'delete', api, invalidToken, permissionUser, permissionError, validUser, options, encoding)
    await runTestCases(n, tests)
  }

  const testEndpointWithAuth = async (t, httpClient, method, api, userEmail, options = {}) => {
    const headers = await createAuthHeaders(userEmail)
    try {
      await httpClient[method](api, { ...options, headers, encoding: options.encoding || 'json' })
      t.pass()
      return true
    } catch (e) {
      t.fail(`Expected success but got error: ${e.message || e}`)
      return false
    }
  }

  const testEndpointWithAuthAndError = async (t, httpClient, method, api, userEmail, expectedError, options = {}) => {
    const headers = await createAuthHeaders(userEmail)
    try {
      await httpClient[method](api, { ...options, headers, encoding: options.encoding || 'json' })
      t.fail('Expected error but request succeeded')
      return false
    } catch (e) {
      const hasError = e.response && e.response.message && e.response.message.includes(expectedError)
      if (!hasError) {
        t.fail(`Expected ${expectedError} but got: ${e.message || e}`)
        return false
      }
      t.pass()
      return true
    }
  }

  createConfig()
  await startWorker()
  await createHttpClient()
  await sleep(2000)
  await createUser(admin1, 'admin')
  await createUser(admin2, 'admin')

  const minersApi = `${appNodeBaseUrl}${ENDPOINTS.MINERS}`

  await main.test('Api: miners - auth security', async (n) => {
    await n.test('should fail for missing auth token', async (t) => {
      try {
        await httpClient.get(minersApi, { encoding })
        t.fail('Expected error for missing auth token')
      } catch (e) {
        t.is(e.response.message.includes('ERR_AUTH_FAIL'), true)
      }
    })

    await n.test('should fail for invalid auth token', async (t) => {
      const headers = { Authorization: `Bearer ${invalidToken}` }
      try {
        await httpClient.get(minersApi, { headers, encoding })
        t.fail('Expected error for invalid auth token')
      } catch (e) {
        t.is(e.response.message.includes('ERR_AUTH_FAIL'), true)
      }
    })

    await n.test('should fail for readonly user (capCheck requires write)', async (t) => {
      const headers = await createAuthHeaders(readonlyUser)
      try {
        await httpClient.get(minersApi, { headers, encoding })
        t.fail('Expected error for readonly user')
      } catch (e) {
        t.is(e.response.message.includes('ERR_AUTH_FAIL'), true)
      }
    })

    await n.test('should succeed for site operator user (has actions:rw)', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      try {
        await httpClient.get(minersApi, { headers, encoding })
        t.pass()
      } catch (e) {
        t.fail(`Expected success but got: ${e.message || e}`)
      }
    })
  })

  await main.test('Api: miners - response structure', async (n) => {
    await n.test('should return paginated response with correct top-level fields', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const { body: data } = await httpClient.get(minersApi, { headers, encoding })

      t.ok(Array.isArray(data.data), 'data should be an array')
      t.ok(typeof data.totalCount === 'number', 'totalCount should be a number')
      t.ok(typeof data.offset === 'number', 'offset should be a number')
      t.ok(typeof data.limit === 'number', 'limit should be a number')
      t.ok(typeof data.hasMore === 'boolean', 'hasMore should be a boolean')
    })

    await n.test('should return all mock miners with default pagination', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const { body: data } = await httpClient.get(minersApi, { headers, encoding })

      t.is(data.totalCount, 5, 'totalCount should be 5')
      t.is(data.data.length, 5, 'data should have 5 items')
      t.is(data.offset, 0, 'offset should default to 0')
      t.is(data.hasMore, false, 'hasMore should be false when all items fit')
    })

    await n.test('each miner should have clean formatted fields', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const { body: data } = await httpClient.get(minersApi, { headers, encoding })
      const miner = data.data[0]

      t.ok(miner.id, 'should have id')
      t.ok(miner.type, 'should have type')
      t.ok(miner.model, 'should have model')
      t.ok(miner.code, 'should have code')
      t.ok(miner.ip, 'should have ip')
      t.ok(miner.container, 'should have container')
      t.ok(miner.rack, 'should have rack')
      t.ok(miner.status !== undefined, 'should have status')
      t.ok(typeof miner.hashrate === 'number', 'hashrate should be a number')
      t.ok(typeof miner.power === 'number', 'power should be a number')
      t.ok(typeof miner.efficiency === 'number', 'efficiency should be a number')
      t.ok(miner.temperature !== undefined, 'should have temperature')
      t.ok(miner.firmware, 'should have firmware')
      t.ok(miner.powerMode, 'should have powerMode')
      t.ok(miner.ledStatus !== undefined, 'should have ledStatus')
      t.ok(miner.poolConfig, 'should have poolConfig')
      t.ok(miner.lastSeen, 'should have lastSeen')
    })

    await n.test('formatted miner should have correct values from raw data', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const { body: data } = await httpClient.get(minersApi, { headers, encoding })

      const miner = data.data.find(m => m.id === 'miner-001')
      t.ok(miner, 'should find miner-001')
      t.is(miner.id, 'miner-001')
      t.is(miner.type, 'antminer-s19')
      t.is(miner.model, 'Antminer S19 XP')
      t.is(miner.code, 'M001')
      t.is(miner.ip, '192.168.1.100')
      t.is(miner.container, 'container-A')
      t.is(miner.rack, 'rack-1')
      t.is(miner.status, 'online')
      t.is(miner.hashrate, 140000)
      t.is(miner.power, 3010)
      t.is(miner.efficiency, 21.5)
      t.is(miner.temperature, 65)
      t.is(miner.firmware, '2024.01.01')
      t.is(miner.powerMode, 'normal')
    })
  })

  await main.test('Api: miners - pagination', async (n) => {
    await n.test('should respect limit parameter', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?limit=2`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.is(data.data.length, 2, 'should return only 2 items')
      t.is(data.totalCount, 5, 'totalCount should still be 5')
      t.is(data.limit, 2, 'limit should be 2')
      t.is(data.hasMore, true, 'hasMore should be true')
    })

    await n.test('should respect offset parameter', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?offset=3&limit=10`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.is(data.data.length, 2, 'should return remaining 2 items')
      t.is(data.totalCount, 5, 'totalCount should still be 5')
      t.is(data.offset, 3, 'offset should be 3')
      t.is(data.hasMore, false, 'hasMore should be false')
    })

    await n.test('should return empty page when offset exceeds total', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?offset=100`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.is(data.data.length, 0, 'should return 0 items')
      t.is(data.totalCount, 5, 'totalCount should still be 5')
      t.is(data.hasMore, false, 'hasMore should be false')
    })

    await n.test('should cap limit at MAX_LIMIT (200)', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?limit=500`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(data.limit <= 200, 'limit should be capped at 200')
    })
  })

  await main.test('Api: miners - filtering', async (n) => {
    await n.test('should accept filter param and return valid response', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const filter = JSON.stringify({ status: 'online' })
      const api = `${minersApi}?filter=${encodeURIComponent(filter)}`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(Array.isArray(data.data), 'should return data array')
      t.ok(typeof data.totalCount === 'number', 'should have totalCount')
    })

    await n.test('should accept $or filter without error', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const filter = JSON.stringify({ $or: [{ status: 'error' }, { status: 'sleep' }] })
      const api = `${minersApi}?filter=${encodeURIComponent(filter)}`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(Array.isArray(data.data), 'should return data array')
    })

    await n.test('should return error for invalid filter JSON', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?filter=not-valid-json`
      try {
        await httpClient.get(api, { headers, encoding })
        t.fail('Expected error for invalid JSON')
      } catch (e) {
        t.ok(e.response.message.includes('ERR_FILTER_INVALID_JSON'), 'should return filter JSON error')
      }
    })
  })

  await main.test('Api: miners - sorting', async (n) => {
    await n.test('should sort by hashrate descending', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const sort = JSON.stringify({ hashrate: -1 })
      const api = `${minersApi}?sort=${encodeURIComponent(sort)}`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(data.data.length > 1, 'should return multiple items')
      for (let i = 1; i < data.data.length; i++) {
        t.ok(
          data.data[i - 1].hashrate >= data.data[i].hashrate,
          `hashrate should be descending: ${data.data[i - 1].hashrate} >= ${data.data[i].hashrate}`
        )
      }
    })

    await n.test('should sort by hashrate ascending', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const sort = JSON.stringify({ hashrate: 1 })
      const api = `${minersApi}?sort=${encodeURIComponent(sort)}`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(data.data.length > 1, 'should return multiple items')
      for (let i = 1; i < data.data.length; i++) {
        t.ok(
          data.data[i - 1].hashrate <= data.data[i].hashrate,
          `hashrate should be ascending: ${data.data[i - 1].hashrate} <= ${data.data[i].hashrate}`
        )
      }
    })

    await n.test('should return error for invalid sort JSON', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?sort=not-valid-json`
      try {
        await httpClient.get(api, { headers, encoding })
        t.fail('Expected error for invalid JSON')
      } catch (e) {
        t.ok(e.response.message.includes('ERR_SORT_INVALID_JSON'), 'should return sort JSON error')
      }
    })
  })

  await main.test('Api: miners - search', async (n) => {
    await n.test('should accept search param and return valid response', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?search=192.168`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(Array.isArray(data.data), 'should return data array')
      t.ok(typeof data.totalCount === 'number', 'should have totalCount')
    })

    await n.test('should accept search combined with other params', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const sort = JSON.stringify({ hashrate: -1 })
      const api = `${minersApi}?search=miner&sort=${encodeURIComponent(sort)}&limit=3`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(Array.isArray(data.data), 'should return data array')
      t.ok(data.data.length <= 3, 'should respect limit')
    })
  })

  await main.test('Api: miners - combined query params', async (n) => {
    await n.test('should accept filter, sort, and pagination together', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const filter = JSON.stringify({ status: 'online' })
      const sort = JSON.stringify({ hashrate: -1 })
      const api = `${minersApi}?filter=${encodeURIComponent(filter)}&sort=${encodeURIComponent(sort)}&limit=2&offset=0`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.is(data.limit, 2, 'limit should be 2')
      t.ok(data.data.length <= 2, 'should return at most 2 items')
      if (data.data.length > 1) {
        t.ok(data.data[0].hashrate >= data.data[1].hashrate, 'should be sorted by hashrate desc')
      }
    })

    await n.test('should accept all query params together without error', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const filter = JSON.stringify({ status: 'online' })
      const sort = JSON.stringify({ temperature: 1 })
      const fields = JSON.stringify({ status: 1, ip: 1, temperature: 1 })
      const api = `${minersApi}?filter=${encodeURIComponent(filter)}&sort=${encodeURIComponent(sort)}&fields=${encodeURIComponent(fields)}&search=192&limit=3&offset=0`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.ok(Array.isArray(data.data), 'should return data array')
      t.ok(data.data.length <= 3, 'should respect limit')
      t.is(data.offset, 0, 'offset should be 0')
      if (data.data.length > 0) {
        const miner = data.data[0]
        t.ok(miner.id, 'should always include id')
        t.ok(miner.status !== undefined, 'should include requested field: status')
        t.ok(miner.ip !== undefined, 'should include requested field: ip')
        t.is(miner.hashrate, undefined, 'should exclude non-requested field: hashrate')
        t.is(miner.power, undefined, 'should exclude non-requested field: power')
        t.is(miner.firmware, undefined, 'should exclude non-requested field: firmware')
      }
    })
  })

  await main.test('Api: miners - overwriteCache', async (n) => {
    await n.test('should accept overwriteCache=true without error', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?overwriteCache=true`
      try {
        const { body: data } = await httpClient.get(api, { headers, encoding })
        t.ok(data.data, 'should return data')
        t.pass()
      } catch (e) {
        t.fail(`Expected success but got: ${e.message || e}`)
      }
    })
  })

  await main.test('Api: miners - pool enrichment', async (n) => {
    await n.test('should include poolHashrate when poolStats feature is enabled', async (t) => {
      worker.worker.conf.featureConfig = { poolStats: true }

      const originalJRequest = worker.worker.net_r0.jRequest
      worker.worker.net_r0.jRequest = (publicKey, method) => {
        if (method === 'listThings') {
          return Promise.resolve(mockMiners)
        }
        if (method === 'getThingsCount') {
          return Promise.resolve(mockMiners.length)
        }
        if (method === 'getWrkExtData') {
          return Promise.resolve([{
            workers: {
              'miner-001': { hashrate: 139500 },
              M002: { hashrate: 134000 }
            }
          }])
        }
        return Promise.resolve({})
      }

      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?overwriteCache=true`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      const miner1 = data.data.find(m => m.id === 'miner-001')
      t.ok(miner1, 'should find miner-001')
      t.is(miner1.poolHashrate, 139500, 'miner-001 should have poolHashrate from pool data')

      const miner2 = data.data.find(m => m.id === 'miner-002')
      t.ok(miner2, 'should find miner-002')
      t.is(miner2.poolHashrate, 134000, 'miner-002 should have poolHashrate matched by code')

      worker.worker.conf.featureConfig = {}
      worker.worker.net_r0.jRequest = originalJRequest
    })

    await n.test('should not include poolHashrate when poolStats feature is disabled', async (t) => {
      worker.worker.conf.featureConfig = {}
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?overwriteCache=true`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      const miner = data.data[0]
      t.is(miner.poolHashrate, undefined, 'poolHashrate should not be present')
    })
  })

  await main.test('Api: miners - edge cases', async (n) => {
    await n.test('should handle empty RPC response gracefully', async (t) => {
      const originalJRequest = worker.worker.net_r0.jRequest
      worker.worker.net_r0.jRequest = (publicKey, method) => {
        if (method === 'listThings') return Promise.resolve([])
        if (method === 'getThingsCount') return Promise.resolve(0)
        return Promise.resolve({})
      }

      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?overwriteCache=true`
      const { body: data } = await httpClient.get(api, { headers, encoding })

      t.is(data.data.length, 0, 'should return empty data array')
      t.is(data.totalCount, 0, 'totalCount should be 0')
      t.is(data.hasMore, false, 'hasMore should be false')

      worker.worker.net_r0.jRequest = originalJRequest
    })

    await n.test('should return error for invalid fields JSON', async (t) => {
      const headers = await createAuthHeaders(siteOperatorUser)
      const api = `${minersApi}?fields=not-valid-json`
      try {
        await httpClient.get(api, { headers, encoding })
        t.fail('Expected error for invalid JSON')
      } catch (e) {
        t.ok(e.response.message.includes('ERR_FIELDS_INVALID_JSON'), 'should return fields JSON error')
      }
    })
  })

  await main.test('Api: list-things', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.LIST_THINGS}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: list-racks', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.LIST_RACKS}?type=miner`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get pools stats/containers', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.POOLS_CONTAINERS_STATS}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get pools stats/containers - response structure', async (n) => {
    await n.test('returns array of container stats with container and overriddenConfig', async (t) => {
      const headers = await createAuthHeaders(readonlyUser)
      const api = `${appNodeBaseUrl}${ENDPOINTS.POOLS_CONTAINERS_STATS}`
      const { body: data } = await httpClient.get(api, { headers, encoding })
      t.ok(Array.isArray(data), 'response should be array')
      data.forEach((item, i) => {
        t.ok(item.container !== undefined, `item ${i} should have container`)
        t.ok(item.overriddenConfig !== undefined, `item ${i} should have overriddenConfig`)
        t.ok(Number.isInteger(item.overriddenConfig), `item ${i} overriddenConfig should be integer`)
      })
      t.pass()
    })
  })

  await main.test('Api: get pools config by id', async (n) => {
    await testGetEndpointSecurity(n, httpClient, `${appNodeBaseUrl}${ENDPOINTS.POOLS_THING_CONFIG.replace(':id', 'miner-001')}`, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get pools config by id - response and not found', async (n) => {
    const poolsConfigApi = (id) => `${appNodeBaseUrl}${ENDPOINTS.POOLS_THING_CONFIG.replace(':id', id)}`

    await n.test('returns 200 with poolConfig and overriddenConfig when thing exists', async (t) => {
      const headers = await createAuthHeaders(readonlyUser)
      const api = poolsConfigApi('miner-001')
      const { body: data } = await httpClient.get(api, { headers, encoding })
      t.ok(data.poolConfig !== undefined, 'response should have poolConfig')
      t.ok(data.overriddenConfig !== undefined, 'response should have overriddenConfig')
      t.ok(Number.isInteger(data.overriddenConfig), 'overriddenConfig should be integer')
      t.pass()
    })

    await n.test('returns error when thing not found', async (t) => {
      const originalJRequest = worker.worker.net_r0.jRequest
      worker.worker.net_r0.jRequest = (publicKey, method, params) => {
        if (method === 'listThings' && params?.query?.id === 'nonexistent-thing-id') {
          return Promise.resolve([])
        }
        return originalJRequest(publicKey, method, params)
      }

      const headers = await createAuthHeaders(readonlyUser)
      const api = poolsConfigApi('nonexistent-thing-id')
      try {
        await httpClient.get(api, { headers, encoding })
        t.fail('Expected error for non-existent thing')
      } catch (e) {
        t.ok(e.response?.message?.includes('ERR_THING_NOT_FOUND'), 'should return ERR_THING_NOT_FOUND')
      }
      worker.worker.net_r0.jRequest = originalJRequest
      t.pass()
    })
  })

  await main.test('Api: post thing-comment', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.THING_COMMENT}`
    const body = { thingId: 1, rackId: 1, comment: 'test' }
    await testPostEndpointSecurity(n, httpClient, api, invalidToken, body, siteOperatorUser, encoding)
  })

  await main.test('Api: put thing-comment', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.THING_COMMENT}`
    const body = { thingId: 1, rackId: 1, comment: 'test' }
    await testPutEndpointSecurity(n, httpClient, api, invalidToken, body, siteOperatorUser, encoding)
  })

  await main.test('Api: delete thing-comment', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.THING_COMMENT}`
    const body = { thingId: 1, rackId: 1, id: 1 }
    await testDeleteEndpointSecurity(n, httpClient, api, invalidToken, { body }, siteOperatorUser, encoding)
  })

  await main.test('Api: get settings', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.SETTINGS}?rackId=1`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: put settings', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.SETTINGS}`
    const body = { rackId: 1, entries: { val: 1 } }
    await testPutEndpointSecurity(n, httpClient, api, invalidToken, body, siteOperatorUser, encoding)
  })

  await main.test('Api: get worker-config', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.WORKER_CONFIG}?type=miner`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get thing-config', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.THING_CONFIG}?type=miner&requestType=miner`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get tail-log', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.TAIL_LOG}?key=stat-5m`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get tail-log/multi', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.TAIL_LOG_MULTI}?keys=[]`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get tail-log/range-aggr', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.TAIL_LOG_RANGE_AGGR}?keys=[{"type":1,"startDate":1,"endDate":1}]`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get history-log', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.HISTORY_LOG}?logType=alerts`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get global/data', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.GLOBAL_DATA}?type=features`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: post global/data', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.GLOBAL_DATA}?type=features`
    const body = { data: { site: 'A' } }
    await testPostEndpointSecurityWithPermissions(n, httpClient, api, invalidToken, body, siteOperatorUser, 'ERR_AUTH_FAIL_NO_PERMS', admin1, encoding)
  })

  await main.test('Api: get user/settings', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USER_SETTINGS}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: post user/settings', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USER_SETTINGS}`
    const body = { settings: { setting1: 'val-1' } }
    await testPostEndpointSecurity(n, httpClient, api, invalidToken, body, siteOperatorUser, encoding)
  })

  await main.test('Api: get featureConfig', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.FEATURE_CONFIG}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get features', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.FEATURES}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: post features', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.FEATURES}`
    const body = { data: { key: 'val' } }
    await testPostEndpointSecurityWithPermissions(n, httpClient, api, invalidToken, body, siteOperatorUser, 'ERR_AUTH_FAIL_NO_PERMS', admin1, encoding)
  })

  await main.test('Api: get global-config', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.GLOBAL_CONFIG}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: post global-config', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.GLOBAL_CONFIG}`
    const body = { data: { isAutoSleepAllowed: false } }
    await testPostEndpointSecurityWithPermissions(n, httpClient, api, invalidToken, body, siteOperatorUser, 'ERR_AUTH_FAIL_NO_PERMS', admin1, encoding)
  })

  await main.test('Api: get site', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.SITE}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get site/status/live', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.SITE_STATUS_LIVE}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get site/status/live with overwriteCache', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.SITE_STATUS_LIVE}?overwriteCache=true`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get site/status/live - response structure', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.SITE_STATUS_LIVE}`

    await n.test('response should have expected structure', async (t) => {
      const headers = await createAuthHeaders(readonlyUser)
      try {
        const { body: data } = await httpClient.get(api, { headers, encoding })

        // Verify top-level keys exist
        t.ok(data.hashrate !== undefined, 'should have hashrate')
        t.ok(data.power !== undefined, 'should have power')
        t.ok(data.efficiency !== undefined, 'should have efficiency')
        t.ok(data.miners !== undefined, 'should have miners')
        t.ok(data.alerts !== undefined, 'should have alerts')
        t.ok(data.pools !== undefined, 'should have pools')
        t.ok(data.ts !== undefined, 'should have timestamp')

        // Verify hashrate structure
        t.ok(data.hashrate.value !== undefined, 'hashrate should have value')
        t.ok(data.hashrate.nominal !== undefined, 'hashrate should have nominal')
        t.ok(data.hashrate.utilization !== undefined, 'hashrate should have utilization')

        // Verify power structure
        t.ok(data.power.value !== undefined, 'power should have value')
        t.ok(data.power.nominal !== undefined, 'power should have nominal')
        t.ok(data.power.utilization !== undefined, 'power should have utilization')

        // Verify efficiency structure
        t.ok(data.efficiency.value !== undefined, 'efficiency should have value')

        // Verify miners structure
        t.ok(data.miners.online !== undefined, 'miners should have online')
        t.ok(data.miners.offline !== undefined, 'miners should have offline')
        t.ok(data.miners.error !== undefined, 'miners should have error')
        t.ok(data.miners.sleep !== undefined, 'miners should have sleep')
        t.ok(data.miners.total !== undefined, 'miners should have total')
        t.ok(data.miners.containerCapacity !== undefined, 'miners should have containerCapacity')

        // Verify alerts structure
        t.ok(data.alerts.critical !== undefined, 'alerts should have critical')
        t.ok(data.alerts.high !== undefined, 'alerts should have high')
        t.ok(data.alerts.medium !== undefined, 'alerts should have medium')
        t.ok(data.alerts.total !== undefined, 'alerts should have total')

        // Verify pools structure
        t.ok(data.pools.totalHashrate !== undefined, 'pools should have totalHashrate')
        t.ok(data.pools.activeWorkers !== undefined, 'pools should have activeWorkers')
        t.ok(data.pools.totalWorkers !== undefined, 'pools should have totalWorkers')

        t.pass('response structure is valid')
      } catch (e) {
        t.fail(`Request failed: ${e.message || e}`)
      }
    })
  })

  await main.test('Api: get permissions', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.PERMISSIONS}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get userinfo', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USERINFO}`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: microsoft auth callback handler', async (n) => {
    await n.test('should generate valid token from microsoft provider callback', async (t) => {
      try {
        const token = await getTestTokenMicrosoft(readonlyUser)
        t.ok(typeof token === 'string' && token.length > 10, 'should return a non-empty auth token string')
      } catch (e) {
        t.fail(`Expected microsoft callback token generation to succeed: ${e.message || e}`)
      }
    })
  })

  await main.test('Api: get finance/ebitda', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.FINANCE_EBITDA}?start=1700000000000&end=1700100000000`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get finance/cost-summary', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.FINANCE_COST_SUMMARY}?start=1700000000000&end=1700100000000`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get ext-data', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.EXT_DATA}?type=miner`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get actions', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS}?queries=[]`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get actions/batch', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS_BATCH}?ids=1,2`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: get actions/:type/:id', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS_SINGLE}`.replace(':type', 'done').replace(':id', 1)
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Api: post actions/voting', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS_VOTING}`
    const body = { query: {}, action: '', params: [] }
    await testPostEndpointSecurity(n, httpClient, api, invalidToken, body, siteOperatorUser, encoding)
  })

  await main.test('Api: post actions/voting/batch', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS_VOTING_BATCH}`
    const body = { batchActionsPayload: [], batchActionUID: '' }
    await testPostEndpointSecurityWithPermissions(n, httpClient, api, invalidToken, body, readonlyUser, 'ERR_WRITE_PERM_REQUIRED', siteOperatorUser, encoding)
  })

  await main.test('Api: put actions/voting/:id/vote', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS_VOTE}`.replace(':id', 1)
    const body = { approve: false }
    await testPutEndpointSecurityWithPermissions(n, httpClient, api, invalidToken, body, readonlyUser, 'ERR_WRITE_PERM_REQUIRED', siteOperatorUser, encoding)
  })

  await main.test('Api: delete actions/voting/cancel', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.ACTIONS_CANCEL}?ids=1`
    // Fastify rejects application/json with an empty body; send {} so json encoding is valid
    await testDeleteEndpointSecurityWithPermissions(n, httpClient, api, invalidToken, readonlyUser, 'ERR_WRITE_PERM_REQUIRED', siteOperatorUser, { body: {} }, encoding)
  })

  await main.test('Api: post users', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USERS}`

    await n.test('api should fail due to invalid permissions', async (t) => {
      await testEndpointWithAuthAndError(t, httpClient, 'post', api, readonlyUser, 'ERR_AUTH_FAIL_NO_PERMS', {
        body: { data: { email: 'dev@test.test', role: 'read_only_user' } },
        encoding
      })
    })

    await n.test('api should succeed for valid permissions (superadmin)', async (t) => {
      await testEndpointWithAuth(t, httpClient, 'post', api, superadminUser, {
        body: { data: { email: newCreatedUser, role: 'admin' } },
        encoding
      })
    })

    await n.test('api should succeed for valid permissions (admin)', async (t) => {
      await testEndpointWithAuth(t, httpClient, 'post', api, newCreatedUser, {
        body: { data: { email: 'dev@test.test', role: 'read_only_user' } },
        encoding
      })
    })
  })

  await main.test('Api: get users', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USERS}`

    await n.test('api should fail due to invalid permissions', async (t) => {
      await testEndpointWithAuthAndError(t, httpClient, 'get', api, readonlyUser, 'ERR_AUTH_FAIL_NO_PERMS', { encoding })
    })

    await n.test('api should succeed for valid permissions', async (t) => {
      await testEndpointWithAuth(t, httpClient, 'get', api, superadminUser, { encoding })
    })

    await n.test('users list should not contain superadmin user data', async (t) => {
      const headers = await createAuthHeaders(superadminUser)
      const { body: data } = await httpClient.get(api, { headers, encoding })
      t.is(data.users.length > 1, true)
      data.users.forEach(user => {
        if (user.role === 'superadmin') t.fail()
      })
    })

    await n.test('admin user should not access other admins or superadmin user data', async (t) => {
      const headers = await createAuthHeaders(admin1)
      const { body: data } = await httpClient.get(api, { headers, encoding })
      t.is(data.users.length > 1, true)
      data.users.forEach(user => {
        if (user.role === 'superadmin' || user.role === 'admin') {
          t.fail()
        }
      })
    })
  })

  await main.test('Api: put users', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USERS}`

    await n.test('api should fail due to invalid permissions', async (t) => {
      await testEndpointWithAuthAndError(t, httpClient, 'put', api, readonlyUser, 'ERR_AUTH_FAIL_NO_PERMS', {
        body: { data: { id: 8, email: 'dev@test.test', role: 'admin' } },
        encoding
      })
    })

    await n.test('api should succeed for valid permissions', async (t) => {
      const headers = await createAuthHeaders(superadminUser)
      const { body: list } = await httpClient.get(api, { headers, encoding })
      const target = list.users.find(u => u.email === 'dev@test.test')
      if (!target) {
        t.fail('test user dev@test.test not found')
        return
      }
      await testEndpointWithAuth(t, httpClient, 'put', api, superadminUser, {
        body: { data: { id: target.id, email: 'dev@test.test', role: 'admin' } },
        encoding
      })
    })

    await n.test('api should fail for missing admin permissions', async (t) => {
      await testEndpointWithAuthAndError(t, httpClient, 'put', api, newCreatedUser, 'ERR_AUTH_FAIL_NO_PERMS', {
        body: { data: { id: 8, email: 'dev@test.test', role: 'admin' } },
        encoding
      })
    })
  })

  await main.test('Api: post users/delete', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.USERS_DELETE}`
    const usersApi = `${appNodeBaseUrl}${ENDPOINTS.USERS}`
    const headers = await createAuthHeaders(superadminUser)
    const { body: list } = await httpClient.get(usersApi, { headers, encoding })
    const deleteTarget = list.users.find(u => u.email === 'dev@test.test')
    const permTarget = list.users.find(u => u.email !== 'dev@test.test')

    await n.test('api should fail due to invalid permissions', async (t) => {
      await testEndpointWithAuthAndError(t, httpClient, 'post', api, readonlyUser, 'ERR_AUTH_FAIL_NO_PERMS', {
        body: { data: { id: deleteTarget.id } },
        encoding
      })
    })

    await n.test('api should succeed for valid permissions', async (t) => {
      await testEndpointWithAuth(t, httpClient, 'post', api, superadminUser, {
        body: { data: { id: deleteTarget.id } },
        encoding
      })
    })

    await n.test('api should fail for missing permissions', async (t) => {
      await testEndpointWithAuthAndError(t, httpClient, 'post', api, siteOperatorUser, 'ERR_AUTH_FAIL_NO_PERMS', {
        body: { data: { id: permTarget.id } },
        encoding
      })
    })
  })

  await main.test('Api: get finance/energy-balance', async (n) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.FINANCE_ENERGY_BALANCE}?start=1700000000000&end=1700100000000`
    await testGetEndpointSecurity(n, httpClient, api, invalidToken, readonlyUser, encoding)
  })

  await main.test('Token expiration: api should fail due to token expiration', async (t) => {
    const api = `${appNodeBaseUrl}${ENDPOINTS.LIST_RACKS}?type=miner`
    worker.worker.auth_a0.conf.ttl = 5
    const token = await getTestToken(tokenExpiredUser)
    const headers = { Authorization: `Bearer ${token}` }
    await sleep(6000)
    try {
      await httpClient.get(api, { headers, encoding })
      t.fail()
    } catch (e) {
      t.is(e.response.message.includes('ERR_AUTH_FAIL'), true)
    }
  })
})
