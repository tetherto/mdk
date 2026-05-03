'use strict'

const test = require('brittle')
const { cachedRoute } = require('../../../workers/lib/server/lib/cachedRoute')

test('cachedRoute - returns cached value', async (t) => {
  const cachedValue = { data: 'cached' }
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: {
      get: (key) => {
        t.is(key, 'test-key', 'should use correct cache key')
        return cachedValue
      },
      set: () => {}
    },
    queuedRequests: new Map()
  }

  const result = await cachedRoute(mockCtx, ['test-key'], '/test', async () => ({ data: 'new' }), false)
  t.is(result.data, 'cached', 'should return cached value')
  t.pass()
})

test('cachedRoute - overwrites cache', async (t) => {
  let setCalled = false
  const newValue = { data: 'new' }
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: {
      get: () => ({ data: 'cached' }),
      set: (key, value) => {
        setCalled = true
        t.is(key, 'test-key', 'should use correct cache key')
        t.is(value.data, 'new', 'should set new value')
      }
    },
    queuedRequests: new Map()
  }

  const result = await cachedRoute(mockCtx, ['test-key'], '/test', async () => newValue, true)
  t.is(result.data, 'new', 'should return new value')
  t.ok(setCalled, 'should set cache')
  t.pass()
})

test('cachedRoute - handles queued requests', async (t) => {
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: {
      get: () => undefined,
      set: (key, value) => {
        // Simulate queued requests
        const queued = mockCtx.queuedRequests.get('test-key')
        if (queued) {
          queued.forEach(({ resolve }) => resolve(value))
        }
      }
    },
    queuedRequests: new Map()
  }

  // Start first request
  const promise1 = cachedRoute(mockCtx, ['test-key'], '/test', async () => {
    // Simulate slow operation
    await new Promise(resolve => setTimeout(resolve, 50))
    return { data: 'result' }
  }, false)

  // Start second request before first completes
  await new Promise(resolve => setTimeout(resolve, 10))
  const promise2 = cachedRoute(mockCtx, ['test-key'], '/test', async () => {
    return { data: 'result' }
  }, false)

  const [result1, result2] = await Promise.all([promise1, promise2])
  t.is(result1.data, 'result', 'first request should return result')
  t.is(result2.data, 'result', 'second request should return same result')
  t.pass()
})

test('cachedRoute - handles function errors', async (t) => {
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: {
      get: () => undefined,
      set: () => {}
    },
    queuedRequests: new Map()
  }

  const testError = new Error('Function error')

  try {
    await cachedRoute(mockCtx, ['test-key'], '/test', async () => {
      throw testError
    }, false)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'Function error', 'should propagate error')
  }
  t.pass()
})

test('cachedRoute - handles queued request errors', async (t) => {
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: {
      get: () => undefined,
      set: () => {}
    },
    queuedRequests: new Map()
  }

  const testError = new Error('Function error')

  // Start first request
  const promise1 = cachedRoute(mockCtx, ['test-key'], '/test', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
    throw testError
  }, false)

  // Start second request before first completes
  await new Promise(resolve => setTimeout(resolve, 10))
  const promise2 = cachedRoute(mockCtx, ['test-key'], '/test', async () => {
    return { data: 'result' }
  }, false)

  try {
    await Promise.all([promise1, promise2])
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'Function error', 'should propagate error to queued requests')
  }
  t.pass()
})

test('cachedRoute - missing LRU cache', async (t) => {
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: null,
    queuedRequests: new Map()
  }

  try {
    await cachedRoute(mockCtx, ['test-key'], '/test', async () => ({}), false)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'INTERNAL_SERVER_ERROR', 'should throw INTERNAL_SERVER_ERROR')
  }
  t.pass()
})

test('cachedRoute - null key parts', async (t) => {
  const mockCtx = {
    conf: {
      cacheTiming: {
        '/test': '30s'
      }
    },
    lru_30s: {
      get: (key) => {
        t.is(key, 'test:-:-', 'should handle null key parts as dashes')
        return undefined
      },
      set: () => {}
    },
    queuedRequests: new Map()
  }

  await cachedRoute(mockCtx, ['test', null, null], '/test', async () => ({}), false)
  t.pass()
})
