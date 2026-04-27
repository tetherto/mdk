'use strict'

const test = require('brittle')
const SettingsService = require('../../lib/services/settings.service')

function makeDb () {
  const store = {}
  return {
    get: async (key) => store[key] ? { value: store[key] } : null,
    put: async (key, value) => { store[key] = value },
    _store: store
  }
}

function makeService () {
  const db = makeDb()
  return { svc: new SettingsService({ settingsDb: db }), db }
}

// ---------------------------------------------------------------------------
// getSettings
// ---------------------------------------------------------------------------

test('getSettings returns empty object when nothing is stored', async (t) => {
  const { svc } = makeService()
  const result = await svc.getSettings()
  t.alike(result, {})
})

test('getSettings returns persisted settings', async (t) => {
  const { svc, db } = makeService()
  db._store.settings_00 = JSON.stringify({ foo: 'bar' })
  const result = await svc.getSettings()
  t.is(result.foo, 'bar')
})

// ---------------------------------------------------------------------------
// saveSettingsEntries
// ---------------------------------------------------------------------------

test('saveSettingsEntries throws ERR_ENTRIES_INVALID for null input', async (t) => {
  const { svc } = makeService()
  await t.exception(svc.saveSettingsEntries(null), /ERR_ENTRIES_INVALID/)
})

test('saveSettingsEntries throws ERR_ENTRIES_INVALID for string input', async (t) => {
  const { svc } = makeService()
  await t.exception(svc.saveSettingsEntries('bad'), /ERR_ENTRIES_INVALID/)
})

test('saveSettingsEntries persists new entries and returns merged result', async (t) => {
  const { svc } = makeService()
  const result = await svc.saveSettingsEntries({ a: 1, b: 2 })
  t.is(result.a, 1)
  t.is(result.b, 2)
})

test('saveSettingsEntries merges with existing entries', async (t) => {
  const { svc } = makeService()
  await svc.saveSettingsEntries({ a: 1 })
  const result = await svc.saveSettingsEntries({ b: 2 })
  t.is(result.a, 1)
  t.is(result.b, 2)
})

test('saveSettingsEntries overwrites existing key with new value', async (t) => {
  const { svc } = makeService()
  await svc.saveSettingsEntries({ a: 1 })
  const result = await svc.saveSettingsEntries({ a: 99 })
  t.is(result.a, 99)
})

test('saveSettingsEntries persists so getSettings returns updated values', async (t) => {
  const { svc } = makeService()
  await svc.saveSettingsEntries({ x: 'hello' })
  const settings = await svc.getSettings()
  t.is(settings.x, 'hello')
})

test('saveSettingsEntries handles numeric and boolean values', async (t) => {
  const { svc } = makeService()
  const result = await svc.saveSettingsEntries({ count: 42, active: true })
  t.is(result.count, 42)
  t.is(result.active, true)
})
