import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const WORKER_SCAN = fileURLToPath(new URL('../src/skills/mdk-worker-security/scripts/scan-worker.mjs', import.meta.url))
const APP_SCAN = fileURLToPath(new URL('../src/skills/mdk-app-security/scripts/scan-app.mjs', import.meta.url))

function write (root, files) {
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 2))
  }
}

function scan (script, argv) {
  const r = spawnSync(process.execPath, [script, ...argv, '--json'], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const has = (res, check, sev, re) => res.findings.some((f) => f.check === check && (!sev || f.sev === sev) && (!re || re.test(f.msg + ' ' + (f.where || ''))))

describe('scan-worker', () => {
  let dir
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-sec-'))
    write(path.join(dir, 'worker'), {
      'package.json': {
        name: 'demo-mdk-worker',
        version: '0.1.0',
        files: ['src/', 'lib/', 'mock/', 'mdk-contract.json'],
        scripts: { prepare: 'node fetch.js' },
        dependencies: { debug: '^4.0.0', evil: 'github:demo/evil#main' }
      },
      'mdk-contract.json': {
        metadata: { provider: 'demo', deviceFamily: 'miner' },
        capabilities: {
          telemetry: [
            { name: 'hashrate_rt', unit: 'TH/s', type: 'number', handler: 'src/telemetry/hashrate.js' },
            { name: 'snap', type: 'object', handler: 'src/telemetry/snap.js' }
          ],
          commands: [
            { name: 'setPowerPct', handler: 'src/commands/pct.js', params: [{ name: 'pct', type: 'number', min: 0 }] },
            { name: 'setupPools', handler: 'src/commands/pools.js', params: [{ name: 'pools', type: 'object' }] },
            { name: 'escape', handler: '../outside.js' }
          ]
        }
      },
      'src/telemetry/hashrate.js': "'use strict'\nconst { opts, logger } = require('@tetherto/mdk-worker/device')\nlogger('connecting with %s', opts.password)\nmodule.exports = async () => 1\n",
      'src/telemetry/snap.js': "'use strict'\nconst got = require('got')\nmodule.exports = async () => got('https://telemetry.demo-cloud.io/ingest')\n",
      'src/commands/pct.js': "'use strict'\nconst { exec } = require('child_process')\nmodule.exports = async (p) => exec('fw ' + p.pct)\n",
      'src/commands/pools.js': "'use strict'\nconst password = opts.password || 'admin'\nmodule.exports = async () => ({ ok: true })\n",
      'mock/server.js': "require('net').createServer(() => {}).listen(4028, '0.0.0.0')\n"
    })
    write(path.join(dir, 'site'), {
      'package.json': { name: 'site', dependencies: { 'demo-mdk-worker': 'git+https://github.com/demo/demo-mdk-worker.git#main' }, overrides: { debug: '4.4.1' } }
    })
  })
  after(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('flags supply-chain, contract, code and pin issues', () => {
    const res = scan(WORKER_SCAN, [path.join(dir, 'worker'), '--consumer', path.join(dir, 'site')])
    assert.ok(has(res, 'install-scripts', 'high', /prepare/))
    assert.ok(has(res, 'dep-source', 'high', /evil/))
    assert.ok(has(res, 'contract-handler', 'high', /outside/))
    assert.ok(has(res, 'command-param', 'medium', /no max/))
    assert.ok(has(res, 'command-param', 'medium', /setupPools\.pools/))
    assert.ok(has(res, 'telemetry-exposure', 'medium', /snap/))
    assert.ok(has(res, 'command-exec', 'high'))
    assert.ok(has(res, 'external-host', 'medium', /telemetry\.demo-cloud\.io/))
    assert.ok(has(res, 'undeclared-dep', 'medium', /"got"/))
    assert.ok(has(res, 'secrets', 'medium', /default device credential/))
    assert.ok(has(res, 'mock-bind', 'medium'))
    assert.ok(has(res, 'consumer-pin', 'high', /#main/))
    assert.ok(res.leads.some((l) => l.cls === 'secret-leak'))
    assert.ok(res.notes.some((n) => /overrides "debug"/.test(n)))
    assert.ok(!has(res, 'undeclared-dep', null, /mdk-worker/), '@tetherto/mdk-worker is host-provided')
  })

  it('refuses an existing --out path', () => {
    const out = path.join(dir, 'existing.md')
    fs.writeFileSync(out, 'keep')
    const r = spawnSync(process.execPath, [WORKER_SCAN, path.join(dir, 'worker'), '--out', out], { encoding: 'utf8' })
    assert.equal(r.status, 2)
    assert.equal(fs.readFileSync(out, 'utf8'), 'keep')
  })

  it('exits 2 without a package.json', () => {
    const r = spawnSync(process.execPath, [WORKER_SCAN, dir], { encoding: 'utf8' })
    assert.equal(r.status, 2)
  })
})

describe('scan-app', () => {
  let dir
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-app-sec-'))
    write(path.join(dir, 'app'), {
      'package.json': { name: '@demo/mdk-app-x', version: '1.0.0', dependencies: { '@tetherto/mdk-client': '0.13.0' } },
      'mdk-app.yaml': 'id: com.demo.x\nversion: 1.0.0\npermissions:\n  - resources: [devices]\n    verbs: [read, write]\n  - resources: [policy]\n    verbs: [read]\n',
      'mdk-plugin.json': {
        name: '@demo/mdk-app-x',
        version: '1.0.0',
        routes: [
          { id: 'x.reboot', handler: './controllers/reboot.js', auth: false, safety: 'read-only', http: { method: 'GET', path: '/api/x/reboot' } },
          { id: 'x.read', handler: './controllers/read.js', auth: true, safety: 'read-only', http: { method: 'GET', path: '/api/x/read', parameters: [{ in: 'query', name: 'limit', schema: { type: 'integer' } }] } },
          { id: 'x.bad', handler: '../../etc/passwd', http: { method: 'GET', path: '/api/x/bad' } }
        ]
      },
      'lib/client.js': "'use strict'\nmodule.exports = require('@tetherto/mdk-gateway/plugin').config.mdkClient\n",
      'lib/act.js': "'use strict'\nconst c = require('./client')\nmodule.exports = (id) => c.sendCommand(id, 'reboot')\n",
      'controllers/reboot.js': "'use strict'\nconst act = require('../lib/act')\nmodule.exports = async (req) => act(req.query.deviceId)\n",
      'controllers/read.js': "'use strict'\nconst c = require('../lib/client')\nmodule.exports = async (req) => { await fetch('https://collect.demo-analytics.com/x', { method: 'POST' }); return c.pullWorkerTelemetry(req.query.limit) }\n",
      'ui/index.html': '<script src="https://cdn.demo.io/x.js"></script>\n',
      'README.md': 'Install: mdk add app github:demo/mdk-app-x#main\n'
    })
  })
  after(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('maps routes to the Kernel calls their handlers reach', () => {
    const res = scan(APP_SCAN, [path.join(dir, 'app')])
    const reboot = res.routes.find((r) => r.id === 'x.reboot')
    assert.ok(reboot.methods.sendCommand, 'sendCommand reached through lib/act.js')
    assert.ok(reboot.inputs['query.deviceId'])
  })

  it('flags auth, safety, input, permission, egress and pin issues', () => {
    const res = scan(APP_SCAN, [path.join(dir, 'app')])
    assert.ok(has(res, 'route-auth', 'high', /sendCommand/))
    assert.ok(has(res, 'route-safety', 'high', /x\.reboot/))
    assert.ok(has(res, 'route-method', 'medium', /GET route changes state/))
    assert.ok(has(res, 'route-input', 'medium', /req\.query\.deviceId/))
    assert.ok(has(res, 'route-input', 'low', /query\.limit has no maximum/))
    assert.ok(has(res, 'route-direct', 'high', /pullWorkerTelemetry/))
    assert.ok(has(res, 'route-handler', 'high', /outside the plugin dir/))
    assert.ok(has(res, 'permissions', 'high', /policy/))
    assert.ok(has(res, 'external-host', 'medium', /collect\.demo-analytics\.com/))
    assert.ok(has(res, 'ui-cdn', 'medium', /without SRI/))
    assert.ok(has(res, 'docs-pin', 'low'))
    assert.ok(has(res, 'files-allowlist', 'medium'))
  })
})
