'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { openTelemetryStore, rollup, createArchive } = require('../../lib/telemetry')

const TELEMETRY = [{ name: 'hashrate_rt', type: 'number' }, { name: 'status', type: 'string' }]
const MIN = 60000
const DAY = 86400000
const NOW = 100 * MIN
const RETENTION = { rawMs: 10 * MIN, rollupIntervalMs: 5 * MIN, keepMs: 60 * MIN }

function tmpDir (t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }), { order: 1 })
  return dir
}

async function openStore (t) {
  const store = await openTelemetryStore({ storeDir: tmpDir(t, 'mdk-worker-archive-store-') })
  t.teardown(() => store.close())
  return store
}

function point (ts, hashrate) {
  return { ts, data: { hashrate_rt: hashrate, status: 'mining' } }
}

test('archive - append writes UTC day files, read returns a range once in ts order, days lists the files', async (t) => {
  const archive = createArchive(tmpDir(t, 'mdk-worker-archive-'))
  t.alike(await archive.days('rack/1'), [], 'a device with nothing archived has no files')
  t.alike(await archive.read('rack/1', 0, DAY), [])

  await archive.append('rack/1', [point(DAY - MIN, 1), point(DAY + MIN, 3), point(DAY, 2)])
  await archive.append('rack/1', [point(DAY, 2)], 'the same point again, as after a restore and a later rollup')

  const days = await archive.days('rack/1')
  t.alike(days.map((d) => d.day), ['1970-01-01', '1970-01-02'], 'one file per UTC day of the point')
  t.ok(days.every((d) => d.bytes > 0))
  t.ok(fs.existsSync(path.join(archive.dir, encodeURIComponent('rack/1'), '1970-01-02.ndjson')), 'the device id is path-safe')

  t.alike(await archive.read('rack/1', 0, 2 * DAY), [point(DAY - MIN, 1), point(DAY, 2), point(DAY + MIN, 3)], 'once each, in order')
  t.alike(await archive.read('rack/1', DAY, DAY), [point(DAY, 2)], 'the range is inclusive')
  t.alike(await archive.read('rack/1', DAY + 2 * MIN, 3 * DAY), [])
  t.alike(await archive.read('other', 0, 2 * DAY), [], 'devices are separate')
})

test('archive - a torn last line and foreign files are skipped', async (t) => {
  const archive = createArchive(tmpDir(t, 'mdk-worker-archive-'))
  await archive.append('a', [point(DAY, 2)])
  const dir = path.join(archive.dir, 'a')
  fs.appendFileSync(path.join(dir, '1970-01-02.ndjson'), '{"ts": 86460000, "data": {"hashrate_rt"')
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a day file')
  t.alike((await archive.days('a')).map((d) => d.day), ['1970-01-02'])
  t.alike(await archive.read('a', 0, 2 * DAY), [point(DAY, 2)], 'the torn line left by a crash mid-append is ignored')
})

test('rollup - a bucket\'s raw points are archived before they are deleted; nothing is archived without an archive', async (t) => {
  const store = await openStore(t)
  const archive = createArchive(tmpDir(t, 'mdk-worker-archive-'))
  const appends = []
  const append = archive.append
  archive.append = (deviceId, points) => { appends.push(points.length); return append(deviceId, points) }
  for (let m = 70; m < 100; m++) await store.put('a', m * MIN, { hashrate_rt: m, status: 'mining' })

  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW, archive)
  t.alike(appends, [20], 'one append per device for the whole backlog, not one per bucket')

  const archived = await archive.read('a', 0, NOW)
  t.alike(archived.map((p) => p.ts / MIN), [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89], 'the four closed buckets, raw')
  t.alike(archived[0].data, { hashrate_rt: 70, status: 'mining' })
  const rolled = (await store.range('a', 0, NOW)).filter((p) => p.n)
  t.is(rolled.length, 4, 'and the store holds the rolled points')

  const silent = await openStore(t)
  for (let m = 70; m < 100; m++) await silent.put('b', m * MIN, { hashrate_rt: m, status: 'mining' })
  await rollup(silent, ['b'], TELEMETRY, RETENTION, new Map(), NOW)
  t.alike(await archive.days('b'), [], 'no archive, no files')
})

test('rollup - points a restore put back are left raw by a later pass, even one that scans from 0', async (t) => {
  const store = await openStore(t)
  const archive = createArchive(tmpDir(t, 'mdk-worker-archive-'))
  for (let m = 70; m < 80; m++) await store.put('a', m * MIN, { hashrate_rt: m, status: 'mining' })
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW, archive)
  t.is((await store.range('a', 0, NOW)).length, 2, 'two rolled points')

  await store.del('a', 70 * MIN, 80 * MIN - 1)
  for (const p of await archive.read('a', 70 * MIN, 79 * MIN)) await store.put('a', p.ts, p.data, { restored: true })
  const [{ bytes }] = await archive.days('a')

  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW, archive)
  const points = await store.range('a', 0, NOW)
  t.alike(points.map((p) => p.ts / MIN), [70, 71, 72, 73, 74, 75, 76, 77, 78, 79], 'the restored range is still raw')
  t.ok(points.every((p) => !p.n && p.restored))
  t.is((await archive.days('a'))[0].bytes, bytes, 'and was not archived again')

  await rollup(store, ['a'], TELEMETRY, { ...RETENTION, keepMs: 20 * MIN }, new Map(), NOW, archive)
  t.alike(await store.range('a', 0, NOW), [], 'keepMs still expires it')
})

test('archive - a device id of dots stays inside the archive dir', async (t) => {
  const root = tmpDir(t, 'mdk-worker-archive-root-')
  const dir = path.join(root, 'archive')
  const archive = createArchive(dir)
  for (const id of ['..', '.', '...', '.hidden', '10.0.0.1']) await archive.append(id, [point(NOW, 1)])

  t.alike(fs.readdirSync(root), ['archive'], 'nothing written beside the archive dir')
  t.alike(fs.readdirSync(dir).sort(), ['%2E', '%2E%2E', '%2E%2E%2E', '%2Ehidden', '10.0.0.1'], 'leading dots encoded, inner dots kept')
  for (const id of ['..', '.', '.hidden', '10.0.0.1']) {
    t.is((await archive.days(id)).length, 1, `days(${id})`)
    t.alike(await archive.read(id, 0, NOW), [point(NOW, 1)], `read(${id})`)
  }
})
