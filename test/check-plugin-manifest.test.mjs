import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkRouteTables, shippedRouteTables } from '../docs/scripts/check-plugin-manifest.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'docs/scripts/check-plugin-manifest.mjs')

function withTables (tables, run) {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-plugin-manifest-'))
  try {
    const files = Object.entries(tables).map(([name, body]) => {
      const file = path.join(dir, name)
      writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body))
      return file
    })
    run(files)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const good = { name: 'app', version: '0.1.0', routes: [{ id: 'a', handler: 'h.js', http: { method: 'GET', path: '/a' } }] }

test('shippedRouteTables: lists tracked route tables by the exported filename', () => {
  const files = shippedRouteTables()
  assert.ok(files.length > 0)
  for (const f of files) assert.ok(f.endsWith('/mdk-plugin.json'), f)
  assert.ok(files.some(f => f.includes('packages/cli/templates/app/')), 'includes the scaffold template')
})

test('checkRouteTables: a conforming legacy table passes with warnings only', () => {
  withTables({ 'ok.json': good }, (files) => {
    const [r] = checkRouteTables(files)
    assert.equal(r.ok, true)
    assert.deepEqual(r.errors, [])
  })
})

test('checkRouteTables: a missing stamp is no finding; a stamped table is held to the strict tier', () => {
  const loose = { ...good, routes: [{ ...good.routes[0], safety: 'maybe' }] }
  withTables({ 'legacy.json': loose, 'stamped.json': { ...loose, routeTableVersion: '1' } }, (files) => {
    const [legacy, stamped] = checkRouteTables(files)
    assert.equal(legacy.ok, true)
    assert.ok(legacy.warnings.some(w => w.includes('/routes/0/safety')), 'strict finding warns')
    assert.ok(legacy.warnings.every(w => !/routeTableVersion/.test(w)), legacy.warnings.join('\n'))
    assert.equal(stamped.ok, false, 'the same finding fails a stamped table')
  })
})

test('checkRouteTables: a schema violation fails, unparseable JSON fails', () => {
  withTables({ 'bad.json': { ...good, routes: [{ id: 'a', handler: 'h.js', auth: 'yes' }] }, 'broken.json': '{' }, (files) => {
    const [bad, broken] = checkRouteTables(files)
    assert.equal(bad.ok, false)
    assert.match(bad.errors[0], /ERR_PLUGIN_MANIFEST_TYPE: \/routes\/0\/auth expected boolean/)
    assert.equal(broken.ok, false)
    assert.match(broken.errors[0], /not valid JSON/)
  })
})

// CI runs the script over every tracked table; this covers only its exit code.
test('CLI: exits 1 when a named table fails', () => {
  withTables({ 'bad.json': { ...good, routes: 'none' } }, (files) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...files], { cwd: ROOT, encoding: 'utf8' })
    assert.equal(r.status, 1, r.stdout + r.stderr)
  })
})
