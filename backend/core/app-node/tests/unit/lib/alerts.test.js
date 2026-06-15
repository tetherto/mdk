'use strict'

const test = require('brittle')
const { AlertsService } = require('../../../workers/lib/alerts')
const { buildDataProxy } = require('../helpers/mockHelpers')

const makeService = (orks, jRequestImpl) => {
  return new AlertsService({ dataProxy: buildDataProxy(orks, jRequestImpl) })
}

test('AlertsService constructor should initialize with dataProxy', (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = { jRequest: async () => { } }
  const service = makeService(mockOrks, mockNet.jRequest)

  t.ok(service.dataProxy, 'Should set dataProxy property')
})

test('fetchAlerts should fetch alerts from orks', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }, { rpcPublicKey: 'key2' }]
  const mockNet = {
    jRequest: async (_key, method) => {
      t.ok(method === 'listThings', 'Should call listThings method')
      return [{ id: 'thing1', last: { alerts: { createdAt: Date.now() } } }]
    }
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.ok(Array.isArray(result), 'Should return an array')
})

test('fetchAlerts should handle fetchAll parameter', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  let capturedQuery = null
  const mockNet = {
    jRequest: async (_key, _method, query) => {
      capturedQuery = query
      return [{ id: 'thing1' }]
    }
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  await service.fetchAlerts(true)

  t.ok(capturedQuery.query['last.alerts.createdAt'].$exists === true, 'Should use $exists when fetchAll is true')
  t.ok(capturedQuery.limit === 1000, 'Should set limit to 1000')
})

test('fetchAlerts should filter by time when fetchAll is false', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  let capturedQuery = null
  const mockNet = {
    jRequest: async (_key, _method, query) => {
      capturedQuery = query
      return []
    }
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  await service.fetchAlerts(false)

  t.ok(capturedQuery.query['last.alerts.createdAt'].$gte, 'Should use $gte time filter when fetchAll is false')
})

test('fetchAlerts should handle errors and return empty array', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => {
      throw new Error('Network error')
    }
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.alike(result, [], 'Should return empty array on error')
})

test('fetchAlerts should fetch from multiple orks', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }, { rpcPublicKey: 'key2' }, { rpcPublicKey: 'key3' }]
  let requestCount = 0
  const mockNet = {
    jRequest: async (_key, _method, _query) => {
      requestCount++
      return [{ id: `thing-${_key}` }]
    }
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(requestCount, 3, 'Should make requests to all orks')
  t.ok(Array.isArray(result), 'Should return merged results as array')
})

test('broadcastAlerts should send alerts to all clients', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  let sentData = null
  const mockClient = {
    readyState: 1,
    subscriptions: new Set(['alerts']),
    send: (data) => {
      sentData = data
    }
  }
  const clients = new Set([mockClient])
  await service.broadcastAlerts(clients)

  t.ok(sentData !== null, 'Should send data to subscribed client')
  t.ok(typeof sentData === 'string', 'Should send stringified JSON')
})

test('broadcastAlerts should remove clients with readyState !== 1', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const mockClient = {
    readyState: 0,
    send: () => { }
  }

  const clients = new Set([mockClient])
  await service.broadcastAlerts(clients)

  t.is(clients.size, 0, 'Should remove disconnected client from set')
})

test('broadcastAlerts should remove clients that throw errors on send', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const mockClient = {
    readyState: 1,
    subscriptions: new Set(['alerts']),
    send: () => {
      throw new Error('Send failed')
    }
  }
  const clients = new Set([mockClient])
  await service.broadcastAlerts(clients)

  t.is(clients.size, 0, 'Should remove client that threw error')
})

test('broadcastAlerts should handle multiple clients with mixed states', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  let sendCount = 0
  const goodClient1 = {
    readyState: 1,
    subscriptions: new Set(['alerts']),
    send: () => {
      sendCount++
    }
  }
  const goodClient2 = {
    readyState: 1,
    subscriptions: new Set(['alerts']),
    send: () => {
      sendCount++
    }
  }
  const badClient = {
    readyState: 0,
    send: () => { }
  }
  const clients = new Set([goodClient1, goodClient2, badClient])
  await service.broadcastAlerts(clients)

  t.is(sendCount, 2, 'Should send to 2 subscribed clients')
  t.is(clients.size, 2, 'Should keep 2 connected clients')
  t.ok(!clients.has(badClient), 'Should remove disconnected client')
})

test('fetchAlerts should create correct query structure', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  let capturedQuery = null
  const mockNet = {
    jRequest: async (_key, _method, query) => {
      capturedQuery = query
      return []
    }
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  await service.fetchAlerts()

  t.is(capturedQuery.status, 1, 'Should query for status 1')
  t.ok(capturedQuery.query['last.alerts'].$ne === null, 'Should filter for non-null alerts')
  t.ok(capturedQuery.fields['last.alerts'] === 1, 'Should include alerts field')
  t.ok(capturedQuery.fields['info.container'] === 1, 'Should include info.container field')
  t.ok(capturedQuery.fields.type === 1, 'Should include type field')
  t.ok(capturedQuery.fields.id === 1, 'Should include id field')
  t.ok(capturedQuery.fields.code === 1, 'Should include code field')
})

test('broadcastAlerts should handle empty clients set', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const clients = new Set()
  await service.broadcastAlerts(clients)

  t.pass('Should not throw error with empty clients set')
})

test('broadcastAlerts should skip null clients', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const clients = new Set([null, undefined])

  await service.broadcastAlerts(clients)

  t.is(clients.size, 0, 'Should remove null/undefined clients')
})

test('fetchAlerts should handle empty orks array', async (t) => {
  const mockOrks = []
  const mockNet = {
    jRequest: async () => []
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.ok(Array.isArray(result), 'Should return array even with no orks')
})

test('broadcastAlerts should not send to clients without subscription', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  let sendCount = 0
  const unsubscribedClient = {
    readyState: 1,
    subscriptions: new Set(),
    send: () => {
      sendCount++
    }
  }
  const clients = new Set([unsubscribedClient])
  await service.broadcastAlerts(clients)

  t.is(sendCount, 0, 'Should not send to unsubscribed client')
  t.is(clients.size, 1, 'Should keep unsubscribed client in set')
})

test('broadcastAlerts should only send to clients subscribed to alerts', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{ id: 'alert1' }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  let sendCount = 0
  const subscribedClient = {
    readyState: 1,
    subscriptions: new Set(['alerts']),
    send: () => {
      sendCount++
    }
  }
  const otherChannelClient = {
    readyState: 1,
    subscriptions: new Set(['other']),
    send: () => {
      sendCount++
    }
  }
  const clients = new Set([subscribedClient, otherChannelClient])
  await service.broadcastAlerts(clients)

  t.is(sendCount, 1, 'Should only send to alerts-subscribed client')
  t.is(clients.size, 2, 'Should keep both clients in set')
})

test('fetchAlerts should extract alerts and append id, type, code and container', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [{
      id: 'miner-123',
      type: 'miner-wm-m56s',
      code: 'M56S-001',
      info: { container: 'container-1' },
      last: {
        alerts: [
          { alertCode: 'HIGH_TEMP', message: 'Temperature too high', createdAt: Date.now() },
          { alertCode: 'FAN_ERROR', message: 'Fan malfunction', createdAt: Date.now() }
        ]
      }
    }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(result.length, 2, 'Should return 2 alerts')
  t.is(result[0].id, 'miner-123', 'First alert should have id')
  t.is(result[0].type, 'miner-wm-m56s', 'First alert should have type')
  t.is(result[0].code, 'M56S-001', 'First alert should have code')
  t.is(result[0].container, 'container-1', 'First alert should have container')
  t.is(result[0].alertCode, 'HIGH_TEMP', 'First alert should preserve original properties')
  t.is(result[1].id, 'miner-123', 'Second alert should have id')
  t.is(result[1].type, 'miner-wm-m56s', 'Second alert should have type')
  t.is(result[1].alertCode, 'FAN_ERROR', 'Second alert should preserve original properties')
})

test('fetchAlerts should handle multiple miners with alerts', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [
      {
        id: 'miner-1',
        type: 'miner-am-s19',
        code: 'S19-001',
        info: { container: 'container-1' },
        last: {
          alerts: [{ alertCode: 'ALERT_1', createdAt: Date.now() }]
        }
      },
      {
        id: 'miner-2',
        type: 'miner-wm-m30s',
        code: 'M30S-002',
        info: { container: 'container-2' },
        last: {
          alerts: [
            { alertCode: 'ALERT_2', createdAt: Date.now() },
            { alertCode: 'ALERT_3', createdAt: Date.now() }
          ]
        }
      }
    ]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(result.length, 3, 'Should return 3 total alerts from 2 miners')
  t.is(result[0].id, 'miner-1', 'First alert from first miner')
  t.is(result[1].id, 'miner-2', 'Second alert from second miner')
  t.is(result[2].id, 'miner-2', 'Third alert from second miner')
})

test('fetchAlerts should skip miners without alerts array', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [
      {
        id: 'miner-1',
        type: 'miner-am-s19',
        code: 'S19-001',
        info: { container: 'container-1' },
        last: {
          alerts: [{ alertCode: 'ALERT_1', createdAt: Date.now() }]
        }
      },
      {
        id: 'miner-2',
        type: 'miner-wm-m30s',
        last: {
          alerts: null
        }
      },
      {
        id: 'miner-3',
        type: 'miner-av-1246',
        last: {}
      }
    ]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(result.length, 1, 'Should only return alerts from miner with valid alerts array')
  t.is(result[0].id, 'miner-1', 'Should have alert from first miner')
})

test('fetchAlerts should handle miners with empty alerts array', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [
      {
        id: 'miner-1',
        type: 'miner-am-s19',
        last: {
          alerts: []
        }
      }
    ]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(result.length, 0, 'Should return empty array when miner has no alerts')
})

test('fetchAlerts should handle miners without last property', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const mockNet = {
    jRequest: async () => [
      {
        id: 'miner-1',
        type: 'miner-am-s19'
      }
    ]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(result.length, 0, 'Should return empty array when miner has no last property')
})

test('fetchAlerts should preserve all original alert properties', async (t) => {
  const mockOrks = [{ rpcPublicKey: 'key1' }]
  const alertTime = Date.now()
  const mockNet = {
    jRequest: async () => [{
      id: 'miner-123',
      type: 'miner-wm-m56s',
      code: 'M56S-001',
      info: { container: 'container-1' },
      last: {
        alerts: [{
          alertCode: 'HIGH_TEMP',
          message: 'Temperature too high',
          severity: 'critical',
          createdAt: alertTime,
          customField: 'customValue'
        }]
      }
    }]
  }
  const service = makeService(mockOrks, mockNet.jRequest)
  const result = await service.fetchAlerts()

  t.is(result.length, 1, 'Should return 1 alert')
  t.is(result[0].alertCode, 'HIGH_TEMP', 'Should preserve alertCode')
  t.is(result[0].message, 'Temperature too high', 'Should preserve message')
  t.is(result[0].severity, 'critical', 'Should preserve severity')
  t.is(result[0].createdAt, alertTime, 'Should preserve createdAt')
  t.is(result[0].customField, 'customValue', 'Should preserve custom fields')
  t.is(result[0].id, 'miner-123', 'Should append id')
  t.is(result[0].type, 'miner-wm-m56s', 'Should append type')
  t.is(result[0].code, 'M56S-001', 'Should append code')
  t.is(result[0].container, 'container-1', 'Should append container')
})
