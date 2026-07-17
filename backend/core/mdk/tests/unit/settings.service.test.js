'use strict'

const test = require('brittle')
const SettingsService = require('../../lib/services/settings.service')
const { createTestStore, createTestBee } = require('../helpers/store')

async function createService (t) {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  return new SettingsService({ settingsDb: db.sub('settings') })
}

test('constructor requires settingsDb', (t) => {
  t.exception(() => new SettingsService({}), /ERR_SETTINGS_DB_REQUIRED/)
})

test('getSettings returns {} when nothing saved', async (t) => {
  const svc = await createService(t)
  t.alike(await svc.getSettings(), {})
})

test('saveSettingsEntries merges and persists', async (t) => {
  const svc = await createService(t)

  await t.exception(svc.saveSettingsEntries(null), /ERR_ENTRIES_INVALID/)
  await t.exception(svc.saveSettingsEntries('x'), /ERR_ENTRIES_INVALID/)

  const first = await svc.saveSettingsEntries({ a: 1 })
  t.alike(first, { a: 1 })

  const second = await svc.saveSettingsEntries({ b: 2 })
  t.alike(second, { a: 1, b: 2 })

  t.alike(await svc.getSettings(), { a: 1, b: 2 })
})
