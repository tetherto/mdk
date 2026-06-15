'use strict'

const test = require('brittle')
const { getGlobalConfig, setGlobalConfig, getFeatureConfig, getFeatures, setFeatures, getGlobalData, setGlobalData } = require('../../../workers/lib/server/handlers/global.handlers')
const { GLOBAL_DATA_TYPES } = require('../../../workers/lib/constants')
const { withDataProxy } = require('../helpers/mockHelpers')

test('getGlobalConfig - with fields query param', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' },
        { rpcPublicKey: 'key2' }
      ]
    },
    net_r0: {
      jRequest: async () => ({ config: 'test' })
    }
  })

  const mockReq = {
    query: {
      fields: '{"name":1,"value":1}'
    }
  }

  const result = await getGlobalConfig(mockCtx, mockReq, {})
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return results for all orks')
  t.pass()
})

test('getGlobalConfig - without fields query param', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    net_r0: {
      jRequest: async () => ({ config: 'test' })
    }
  })

  const mockReq = {
    query: {}
  }

  const result = await getGlobalConfig(mockCtx, mockReq, {})
  t.ok(Array.isArray(result), 'should return array')
  t.pass()
})

test('setGlobalConfig - basic functionality', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' },
        { rpcPublicKey: 'key2' }
      ]
    },
    net_r0: {
      jRequest: async () => ({ success: true })
    }
  })

  const mockReq = {
    body: {
      data: { setting: 'value' }
    }
  }

  const result = await setGlobalConfig(mockCtx, mockReq, {})
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return results for all orks')
  t.pass()
})

test('getFeatureConfig - returns feature config from context', async (t) => {
  const mockCtx = {
    conf: {
      featureConfig: { feature1: true, feature2: false }
    }
  }

  const result = await getFeatureConfig(mockCtx)
  t.ok(typeof result === 'object', 'should return object')
  t.is(result.feature1, true, 'should return feature config')
  t.pass()
})

test('getFeatures - returns features from globalDataLib', async (t) => {
  const mockCtx = {
    globalDataLib: {
      getGlobalData: async (req) => {
        t.is(req.type, GLOBAL_DATA_TYPES.FEATURES, 'should request features type')
        return { feature1: true, feature2: false }
      }
    }
  }

  const result = await getFeatures(mockCtx)
  t.ok(typeof result === 'object', 'should return object')
  t.is(result.feature1, true, 'should return features')
  t.pass()
})

test('setFeatures - sets features via globalDataLib', async (t) => {
  const mockCtx = {
    globalDataLib: {
      setGlobalData: async (data, type) => {
        t.is(type, GLOBAL_DATA_TYPES.FEATURES, 'should set features type')
        t.is(data.feature1, true, 'should set correct data')
        return true
      }
    }
  }

  const mockReq = {
    body: {
      data: { feature1: true, feature2: false }
    }
  }

  const result = await setFeatures(mockCtx, mockReq)
  t.is(result, true, 'should return true')
  t.pass()
})

test('getGlobalData - basic functionality', async (t) => {
  const mockCtx = {
    globalDataLib: {
      getGlobalData: async (req) => {
        t.is(req.type, 'test-type', 'should pass type')
        t.ok(req.range, 'should pass range')
        t.ok(req.opts, 'should pass opts')
        return [{ id: 1, data: 'test' }]
      }
    }
  }

  const mockReq = {
    query: {
      type: 'test-type',
      gt: '100',
      gte: '200',
      lt: '300',
      lte: '400',
      limit: '10',
      query: '{"id":1}',
      sort: '{"id":1}',
      fields: '{"id":1,"data":1}',
      offset: '0',
      groupBy: 'id'
    }
  }

  const result = await getGlobalData(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.pass()
})

test('getGlobalData - without optional params', async (t) => {
  const mockCtx = {
    globalDataLib: {
      getGlobalData: async (req) => {
        t.is(req.type, 'test-type', 'should pass type')
        return []
      }
    }
  }

  const mockReq = {
    query: {
      type: 'test-type'
    }
  }

  const result = await getGlobalData(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.pass()
})

test('setGlobalData - basic functionality', async (t) => {
  const mockCtx = {
    globalDataLib: {
      setGlobalData: async (data, type) => {
        t.is(type, 'test-type', 'should pass type')
        t.is(data.key, 'value', 'should pass data')
        return true
      }
    }
  }

  const mockReq = {
    body: {
      data: { key: 'value' }
    },
    query: {
      type: 'test-type'
    }
  }

  const result = await setGlobalData(mockCtx, mockReq)
  t.is(result, true, 'should return true')
  t.pass()
})
