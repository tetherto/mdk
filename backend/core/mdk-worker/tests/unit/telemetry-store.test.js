'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const { openTelemetryStore } = require('../../lib/telemetry')

function tmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-telemetry-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }), { order: 1 })
  return dir
}

async function seed (store) {
  await store.put('SIM-001', 1000, { power: 100 })
  await store.put('SIM-001', 2000, { power: 200 })
  await store.put('SIM-001', 3000, { power: 300 })
  await store.put('SIM-002', 2500, { power: 50 })
}

test('store - put, latest, range and del are per device and ordered by ts', async (t) => {
  const store = await openTelemetryStore({ storeDir: tmpDir(t) })
  t.teardown(() => store.close())
  await seed(store)

  t.alike(await store.latest('SIM-001'), { ts: 3000, data: { power: 300 } })
  t.alike(await store.latest('SIM-002'), { ts: 2500, data: { power: 50 } })
  t.is(await store.latest('SIM-003'), null)
  t.alike(await store.range('SIM-001', 1500, 3000), [{ ts: 2000, data: { power: 200 } }, { ts: 3000, data: { power: 300 } }])
  t.alike(await store.range('SIM-001', 0, 999), [])

  await store.del('SIM-001', 0, 2000)
  t.alike(await store.range('SIM-001', 0, Date.now()), [{ ts: 3000, data: { power: 300 } }])
  t.alike(await store.latest('SIM-002'), { ts: 2500, data: { power: 50 } }, 'other devices untouched')
})

// Rollup clears a bucket and writes its rolled point. Doing that as a del
// followed by a separate put left a window in which the bucket held nothing,
// so a process that stopped there lost the readings outright: archiving is
// off by default, so nothing could put them back.
test('store - replace clears a span and writes its replacement in one batch', async (t) => {
  const store = await openTelemetryStore({ storeDir: tmpDir(t) })
  t.teardown(() => store.close())
  await seed(store)

  await store.replace('SIM-001', 1000, 2999, 1000, { power: 150 }, { n: 2 })
  t.alike(await store.range('SIM-001', 0, 5000), [
    { ts: 1000, data: { power: 150 }, n: 2 },
    { ts: 3000, data: { power: 300 } }
  ], 'the span holds only the replacement, the point outside it is untouched')
  t.alike(await store.latest('SIM-002'), { ts: 2500, data: { power: 50 } }, 'other devices untouched')

  // The replacement's own timestamp falls inside the span it clears, so the
  // put has to outlive the deletes in the same batch.
  await store.replace('SIM-001', 3000, 3999, 3000, { power: 300 }, { n: 1 })
  t.alike(await store.range('SIM-001', 3000, 3999), [{ ts: 3000, data: { power: 300 }, n: 1 }])
})

test('store - points survive close and reopen of the same directory', async (t) => {
  const dir = tmpDir(t)
  const first = await openTelemetryStore({ storeDir: dir })
  await seed(first)
  await first.close()

  const second = await openTelemetryStore({ storeDir: dir })
  t.teardown(() => second.close())
  t.alike(await second.latest('SIM-001'), { ts: 3000, data: { power: 300 } })
  t.is((await second.range('SIM-001', 0, 5000)).length, 3)
})

test('store - a host-provided facility or bee is used and never closed here', async (t) => {
  const facility = new StoreFacility({}, { storeDir: tmpDir(t) }, {})
  await new Promise((resolve, reject) => facility.start((err) => (err ? reject(err) : resolve())))
  t.teardown(() => new Promise((resolve) => facility.stop(resolve)))

  const viaFacility = await openTelemetryStore({ store: facility })
  await viaFacility.put('SIM-001', 10, { power: 1 })
  await viaFacility.close()
  t.ok(facility.store, 'facility still open after close()')

  const bee = facility.getBee({ name: 'other' }, { keyEncoding: 'utf-8' })
  await bee.ready()
  const viaBee = await openTelemetryStore({ store: bee })
  await viaBee.put('SIM-001', 20, { power: 2 })
  t.alike(await viaBee.latest('SIM-001'), { ts: 20, data: { power: 2 } })
  await viaBee.close()
  t.is(bee.closed, false, 'host bee still open after close()')
  await bee.close()
})

test('store - refuses to open without a store or directory', async (t) => {
  await t.exception(() => openTelemetryStore({}), /ERR_TELEMETRY_STORE_REQUIRED/)
})
