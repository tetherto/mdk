import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import rbac from '@tetherto/mdk-rbac'
import { METHODS, HELPERS, RESOURCE_VERBS, derive, compare, malformedRule, stripComments } from '../src/skills/mdk-app-rbac/scripts/derive-permissions.mjs'

const { KERNEL_ACTIONS, KERNEL_RESOURCES } = rbac
const SCRIPT = fileURLToPath(new URL('../src/skills/mdk-app-rbac/scripts/derive-permissions.mjs', import.meta.url))

// The one Kernel action a caller sends that has no @tetherto/mdk-client method, so no app code can call it.
const NO_CLIENT_METHOD = ['command.cancel']

function app (permissions = 'permissions: [{ resources: [workers], verbs: [list] }]') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-app-rbac-'))
  fs.mkdirSync(path.join(dir, 'plugin', 'controllers'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'plugin', 'controllers', 'tests'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'mdk-app.yaml'), `id: io.tether.demo\nversion: 0.1.0\ndisplayName: Demo\n# the access\n${permissions}\nconfig: {}\n`)
  fs.writeFileSync(path.join(dir, 'plugin', 'mdk-plugin.json'), '{"name":"demo","version":"0.1.0","routes":[]}')
  fs.writeFileSync(path.join(dir, 'plugin', 'controllers', 'summary.js'), [
    "const mdk = require('../lib/client')",
    'module.exports = async (req) => {',
    '  const { workers } = await mdk.listWorkers()',
    '  // await mdk.applyRbac(null) is a comment, not a call',
    '  /* mdk.terminateWorker(x)',
    '     mdk.deleteUser(y) */ const url = "http://h"; await mdk.getCapabilities(workers[0].deviceIds[0])',
    "  const t = await mdk.pullTelemetry(workers[0].deviceIds[0], 'metrics')",
    "  return req.mdk.withActor(req.token).sendCommand(workers[0].deviceIds[0], 'reboot', {})",
    '}'
  ].join('\n'))
  fs.writeFileSync(path.join(dir, 'plugin', 'controllers', 'tests', 'summary.test.js'), 'mdk.deleteUser("x")\n')
  fs.writeFileSync(path.join(dir, 'plugin', 'controllers', 'summary.spec.js'), 'mdk.terminateWorker("x")\n')
  return dir
}

const run = (args, cwd) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd })

describe('derive-permissions', () => {
  it('maps every client method to the action the Kernel evaluates it as', () => {
    for (const [method, spec] of Object.entries(METHODS)) {
      assert.deepEqual(KERNEL_ACTIONS[spec.action], { resource: spec.resource, verb: spec.verb, name: spec.name }, method)
    }
    for (const helper of Object.values(HELPERS)) assert.ok(METHODS[helper.via], helper.via)
    const covered = new Set(Object.values(METHODS).map((m) => m.action))
    const uncovered = Object.keys(KERNEL_ACTIONS).filter((a) => !covered.has(a)).sort()
    assert.deepEqual(uncovered, [...NO_CLIENT_METHOD].sort())
    assert.deepEqual(RESOURCE_VERBS, Object.fromEntries(Object.entries(KERNEL_RESOURCES).map(([r, v]) => [r, [...v]])))
  })

  it('strips block and line comments but keeps a URL, with line numbers intact', () => {
    const lines = stripComments('a()\n/* x.sendCommand(\n) */ b() // tail\nconst u = "http://h"; c()')
    assert.deepEqual(lines, ['a()', '', ' b() ', 'const u = "http://h"; c()'])
  })

  it('merges the calls into one rule per resource, notes the actor, and ignores comments and tests', () => {
    const dir = app()
    try {
      const r = run([dir, '--json'], dir)
      assert.equal(r.status, 0, r.stderr)
      const out = JSON.parse(r.stdout)
      assert.deepEqual(out.rules, [
        { resources: ['devices'], verbs: ['read', 'write'] },
        { resources: ['workers'], verbs: ['list'] }
      ])
      assert.equal(out.actor, true)
      assert.deepEqual(out.evidence.map((e) => e.method), ['listWorkers', 'getCapabilities', 'pullTelemetry', 'withActor', 'sendCommand'])
      assert.deepEqual(out.evidence[0].at, ['plugin/controllers/summary.js:3'])
      assert.deepEqual(out.evidence[1].at, ['plugin/controllers/summary.js:6'])
      assert.equal(out.directWorkerCalls.length, 0)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('--check fails on a manifest that allows less than the code needs, and passes on one that matches', () => {
    const dir = app()
    try {
      const short = run([dir, '--check', '--json'])
      assert.equal(short.status, 1)
      assert.deepEqual(JSON.parse(short.stdout).check, { missing: ['devices:read', 'devices:write'], unused: [] })
      const text = run(['.', '--check'], dir)
      assert.match(text.stdout, /does not allow devices:read, devices:write/)

      const wide = run([dir, '--write'])
      assert.equal(wide.status, 0, wide.stderr)
      const manifest = fs.readFileSync(path.join(dir, 'mdk-app.yaml'), 'utf8')
      assert.match(manifest, /# the access/)
      assert.match(manifest, /devices/)
      const ok = run([dir, '--check', '--json'])
      assert.equal(ok.status, 0)
      assert.deepEqual(JSON.parse(ok.stdout).check, { missing: [], unused: [] })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('--strict also fails on access no call needs, and a malformed rule is a usage error', () => {
    const dir = app('permissions: [{ resources: ["*"], verbs: ["*"] }]')
    try {
      assert.equal(run([dir, '--check']).status, 0)
      const strict = run([dir, '--check', '--strict', '--json'])
      assert.equal(strict.status, 1)
      assert.ok(JSON.parse(strict.stdout).check.unused.includes('policy:write'))
      fs.writeFileSync(path.join(dir, 'mdk-app.yaml'), 'id: io.tether.demo\nversion: 0.1.0\ndisplayName: Demo\npermissions: [{ resources: [devices], verbs: read }]\n')
      const bad = run([dir, '--check'])
      assert.equal(bad.status, 2)
      assert.match(bad.stderr, /permissions\[0\] must be/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('expands wildcards over the verbs each resource takes, and derives nothing from a plugin without Kernel calls', () => {
    assert.deepEqual(compare([{ resources: ['devices'], verbs: ['read'] }], [{ resources: ['*'], verbs: ['*'] }]).missing, [])
    assert.deepEqual(compare([{ resources: ['workers'], verbs: ['list'] }], [{ resources: ['workers'], verbs: ['*'] }]).unused, ['workers:read', 'workers:delete'])
    assert.equal(malformedRule([{ resources: ['x'], verbs: ['y'] }, { resources: 'x', verbs: ['y'] }]), 1)
    assert.deepEqual(derive([]), { rules: [], actor: false, direct: [] })
    assert.deepEqual(derive([{ method: 'sendWorkerCommand', file: 'f', line: 1 }]), {
      rules: [{ resources: ['workers'], verbs: ['list'] }],
      actor: false,
      direct: [{ method: 'sendWorkerCommand', file: 'f', line: 1 }]
    })
  })

  it('refuses a directory without a manifest or a route table', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-app-rbac-'))
    try {
      assert.equal(run([dir]).status, 2)
      fs.writeFileSync(path.join(dir, 'mdk-app.yaml'), 'permissions: []\n')
      const r = run([dir])
      assert.equal(r.status, 2)
      assert.match(r.stderr, /no mdk-plugin.json/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
