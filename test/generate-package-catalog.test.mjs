import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { buildCatalog } from '../docs/scripts/generate-package-catalog.mjs'

function fixture (files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'package-catalog-'))
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), typeof content === 'string' ? content : JSON.stringify(content))
  }
  return root
}

test('an integration takes its section, name, purpose, and models from its contract', () => {
  const root = fixture({
    'backend/workers/miners/x/package.json': { name: '@t/x', description: 'Miner X' },
    'backend/workers/miners/x/plugin/mdk-contract.json': {
      metadata: { deviceFamily: 'miner', brand: 'Xminer', modelsSupported: ['A1', 'A2'], overview: 'Controls Xminer miners over HTTP. Mind the fans.' }
    },
    'backend/workers/miners/x/README.md': '# X'
  })

  const { entries, errors } = buildCatalog(root, ['backend/workers/miners/x/package.json'])

  assert.deepEqual(errors, [])
  assert.deepEqual(entries, [{
    group: 'Extensions',
    section: 'Miners',
    name: '@t/x',
    label: 'Xminer',
    purpose: 'Controls Xminer miners over HTTP.',
    availability: 'publishable',
    docs: 'backend/workers/miners/x/README.md',
    models: ['A1', 'A2']
  }])
})

test('unlistable packages are reported, and samples and demos are skipped', () => {
  const root = fixture({
    'backend/core/a/package.json': { name: '@t/a', private: true },
    'backend/core/b/package.json': { name: '@t/a', description: 'same name' },
    'backend/workers/miners/c/package.json': { name: '@t/c', description: 'c' },
    'backend/workers/miners/c/mdk-contract.json': '{ not json',
    'backend/workers/samples/s/package.json': { name: '@t/s' },
    'backend/plugins/demo/package.json': { name: '@t/demo' }
  })
  const manifests = ['backend/core/a', 'backend/core/b', 'backend/workers/miners/c', 'backend/workers/samples/s', 'backend/plugins/demo']
    .map((dir) => `${dir}/package.json`)

  const { entries, errors } = buildCatalog(root, manifests)

  assert.equal(errors.length, 3)
  assert.equal(errors[0], 'backend/core/a/package.json: missing description')
  assert.equal(errors[1], 'backend/core/b/package.json: duplicate package name @t/a')
  assert.match(errors[2], /^backend\/workers\/miners\/c\/package\.json: mdk-contract\.json: /)
  assert.deepEqual(entries.map((e) => e.name), ['@t/a', '@t/a', '@t/c'])
})
