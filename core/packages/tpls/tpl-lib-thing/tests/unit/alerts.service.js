'use strict'

const test = require('brittle')
const AlertsService = require('../../lib/services/alerts.service')

function makeThg (overrides = {}) {
  return {
    id: 'thg-1',
    type: 'thing',
    info: {},
    last: {},
    tags: [],
    ...overrides
  }
}

function makeService ({ things = {}, loadLib = () => null, conf = {}, getSpecTags = () => ['default'] } = {}) {
  return new AlertsService({
    logs: null,
    getThings: () => things,
    loadLib,
    conf,
    getSpecTags,
    debugError: () => {}
  })
}

// ---------------------------------------------------------------------------
// processThingAlerts — no lib
// ---------------------------------------------------------------------------

test('processThingAlerts returns null when loadLib returns null', (t) => {
  const svc = makeService()
  const result = svc.processThingAlerts(makeThg())
  t.is(result, null)
})

// ---------------------------------------------------------------------------
// processThingAlerts — no alerts config
// ---------------------------------------------------------------------------

test('processThingAlerts returns null when conf.thing.alerts is missing', (t) => {
  const svc = makeService({
    loadLib: () => ({ specs: { default: {} } }),
    conf: { thing: {} }
  })
  const result = svc.processThingAlerts(makeThg())
  t.is(result, null)
})

test('processThingAlerts returns null when alerts config does not include the thing type', (t) => {
  const svc = makeService({
    loadLib: () => ({ specs: { default: {} } }),
    conf: { thing: { alerts: { 'other-type': {} } } }
  })
  const result = svc.processThingAlerts(makeThg({ type: 'thing' }))
  t.is(result, null)
})

// ---------------------------------------------------------------------------
// processThingAlerts — no snap (offline thing)
// ---------------------------------------------------------------------------

test('processThingAlerts returns error_snap alert when last.snap is missing', (t) => {
  const svc = makeService({
    loadLib: () => ({ specs: { default: {} } }),
    conf: { thing: { alerts: { thing: {} } } }
  })
  const thg = makeThg({ last: {} })
  const result = svc.processThingAlerts(thg)
  t.ok(Array.isArray(result))
  t.is(result.length, 1)
  t.is(result[0].name, 'error_snap')
  t.is(result[0].severity, 'medium')
})

test('processThingAlerts preserves createdAt of existing error_snap alert', (t) => {
  const svc = makeService({
    loadLib: () => ({ specs: { default: {} } }),
    conf: { thing: { alerts: { thing: {} } } }
  })
  const prevCreatedAt = Date.now() - 5000
  const thg = makeThg({
    last: {
      alerts: [{
        name: 'error_snap',
        description: 'No snap',
        message: undefined,
        createdAt: prevCreatedAt,
        uuid: 'existing-uuid'
      }]
    }
  })
  const result = svc.processThingAlerts(thg)
  t.is(result[0].createdAt, prevCreatedAt)
  t.is(result[0].uuid, 'existing-uuid')
})

// ---------------------------------------------------------------------------
// processThingAlerts — with snap, raw_errors
// ---------------------------------------------------------------------------

test('processThingAlerts maps raw_errors from snap to alerts', (t) => {
  const svc = makeService({
    loadLib: () => ({ specs: { default: {} } }),
    conf: { thing: { alerts: { thing: { my_err: { description: 'My error', severity: 'high' } } } } }
  })
  const thg = makeThg({
    last: {
      snap: {
        success: true,
        raw_errors: [{ name: 'my_err', code: 'E01', message: 'something failed', timestamp: 1000 }]
      }
    }
  })
  const result = svc.processThingAlerts(thg)
  t.ok(Array.isArray(result))
  t.is(result[0].name, 'my_err')
  t.is(result[0].code, 'E01')
  t.is(result[0].createdAt, 1000)
})

// ---------------------------------------------------------------------------
// processThingAlerts — spec checks (valid/probe)
// ---------------------------------------------------------------------------

test('processThingAlerts runs spec checks and creates alert when probe returns true', (t) => {
  const specs = {
    default: {
      high_temp: {
        valid: () => true,
        probe: () => true
      }
    }
  }
  const svc = makeService({
    loadLib: () => ({ specs }),
    conf: { thing: { alerts: { thing: { high_temp: { name: 'High Temp', code: 'HT', description: 'Too hot', severity: 'critical' } } } } }
  })
  const thg = makeThg({ last: { snap: { success: true } } })
  const result = svc.processThingAlerts(thg)
  t.ok(Array.isArray(result))
  t.is(result[0].name, 'High Temp')
  t.is(result[0].severity, 'critical')
})

test('processThingAlerts skips spec check when valid returns false', (t) => {
  const specs = {
    default: {
      high_temp: {
        valid: () => false,
        probe: () => true
      }
    }
  }
  const svc = makeService({
    loadLib: () => ({ specs }),
    conf: { thing: { alerts: { thing: {} } } }
  })
  const thg = makeThg({ last: { snap: { success: true } } })
  const result = svc.processThingAlerts(thg)
  t.is(result, null)
})

test('processThingAlerts creates alert when spec check throws', (t) => {
  const specs = {
    default: {
      broken_check: {
        valid: () => true,
        probe: () => { throw new Error('probe failed') }
      }
    }
  }
  const svc = makeService({
    loadLib: () => ({ specs }),
    conf: { thing: { alerts: { thing: {} } } }
  })
  const thg = makeThg({ last: { snap: { success: true } } })
  const result = svc.processThingAlerts(thg)
  t.ok(Array.isArray(result))
  t.is(result[0].name, 'broken_check')
  t.is(result[0].description, 'probe failed')
})

test('processThingAlerts returns null when no alerts are triggered', (t) => {
  const specs = {
    default: {
      high_temp: {
        valid: () => true,
        probe: () => false
      }
    }
  }
  const svc = makeService({
    loadLib: () => ({ specs }),
    conf: { thing: { alerts: { thing: {} } } }
  })
  const thg = makeThg({ last: { snap: { success: true } } })
  const result = svc.processThingAlerts(thg)
  t.is(result, null)
})

test('processThingAlerts skips spec type that is not in specs', (t) => {
  const specs = { default: {} }
  const svc = makeService({
    loadLib: () => ({ specs }),
    conf: { thing: { alerts: { thing: {} } } },
    getSpecTags: () => ['nonexistent']
  })
  const thg = makeThg({ last: { snap: { success: true } } })
  const result = svc.processThingAlerts(thg)
  t.is(result, null)
})
