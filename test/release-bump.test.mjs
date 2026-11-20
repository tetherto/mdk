import test from 'node:test'
import assert from 'node:assert/strict'

import { bumpReadme, pinRepoLinks } from '../scripts/release/bump.mjs'
import { SCAFFOLD_APP_VERSION, applyAppBump, applyBump, assertSemver, findBadPins } from '../scripts/release/lib.mjs'

const manifest = () => ({
  name: '@tetherto/mdk-gateway',
  version: '0.12.1',
  dependencies: { '@tetherto/mdk-rbac': '^0.12.1', '@tetherto/svc-facs-httpd': '^2.0.0', fastify: '^5.0.0' },
  devDependencies: { '@tetherto/mdk-core': '^0.12.1' },
  peerDependencies: { '@tetherto/mdk-client': 'file:../client' },
})

test('applyBump moves the version and every internal pin, in all dependency fields', () => {
  const json = manifest()
  applyBump(json, '0.12.2')
  assert.equal(json.version, '0.12.2')
  assert.equal(json.dependencies['@tetherto/mdk-rbac'], '^0.12.2')
  assert.equal(json.devDependencies['@tetherto/mdk-core'], '^0.12.2', 'devDependencies are pins too')
})

test('applyBump leaves external, file: and non-@tetherto/mdk- ranges alone', () => {
  const json = manifest()
  applyBump(json, '0.12.2')
  assert.equal(json.dependencies['@tetherto/svc-facs-httpd'], '^2.0.0')
  assert.equal(json.dependencies.fastify, '^5.0.0')
  assert.equal(json.peerDependencies['@tetherto/mdk-client'], 'file:../client')
})

test('applyBump brings a lagging package and a stale pin up to the target', () => {
  const json = { name: 'x', version: '0.11.0', dependencies: { '@tetherto/mdk-rbac': '^0.11.0' } }
  const changes = applyBump(json, '0.12.2')
  assert.equal(json.version, '0.12.2')
  assert.equal(json.dependencies['@tetherto/mdk-rbac'], '^0.12.2')
  assert.equal(changes.length, 2)
})

test('applyBump is idempotent', () => {
  const json = manifest()
  applyBump(json, '0.12.2')
  assert.deepEqual(applyBump(json, '0.12.2'), [])
})

test('applyBump does not invent a version for a manifest without one', () => {
  const json = { name: 'x', private: true }
  applyBump(json, '0.12.2')
  assert.equal('version' in json, false)
})

test('findBadPins reports every internal pin that is not exactly ^<version>, devDependencies included', () => {
  const bad = findBadPins(manifest(), '0.12.2')
  assert.deepEqual(
    bad.map((b) => `${b.field}:${b.name}:${b.spec}`).sort(),
    ['dependencies:@tetherto/mdk-rbac:^0.12.1', 'devDependencies:@tetherto/mdk-core:^0.12.1'],
  )
})

test('findBadPins accepts * only in a private package', () => {
  const pub = { dependencies: { '@tetherto/mdk-rbac': '*' } }
  assert.equal(findBadPins(pub, '0.12.2').length, 1)
  assert.equal(findBadPins({ ...pub, private: true }, '0.12.2').length, 0)
})

test('findBadPins is clean after applyBump', () => {
  const json = manifest()
  applyBump(json, '0.12.2')
  assert.deepEqual(findBadPins(json, '0.12.2'), [])
})

test('applyAppBump moves a release-line app to the target', () => {
  assert.equal(applyAppBump('name: site\nversion: 0.12.1\n', '0.12.2'), 'name: site\nversion: 0.12.2\n')
})

test('applyAppBump brings a lagging app up too, like a lagging package.json', () => {
  assert.equal(applyAppBump('name: site\nversion: 0.11.0\n', '0.12.2'), 'name: site\nversion: 0.12.2\n')
})

test('applyAppBump leaves scaffold and fixture manifests, and manifests already at the target, alone', () => {
  assert.equal(SCAFFOLD_APP_VERSION, '0.1.0')
  assert.equal(applyAppBump('name: fixture\nversion: 0.1.0\n', '0.12.2'), null)
  assert.equal(applyAppBump('name: site\nversion: 0.12.2\n', '0.12.2'), null)
  assert.equal(applyAppBump('name: no-version\n', '0.12.2'), null)
})

test('bumpReadme moves the badge and the inline release link', () => {
  const text = '[x](https://github.com/tetherto/mdk/releases/tag/v0.12.1)\nCurrent release [v0.12.1](https://github.com/tetherto/mdk/releases/tag/v0.12.1).\n'
  const out = bumpReadme(text, '0.12.1', '0.12.2')
  assert.equal(out.includes('0.12.1'), false)
  assert.equal(out.match(/v0\.12\.2/g).length, 3)
})

test('assertSemver rejects anything that is not X.Y.Z[-tag]', () => {
  assert.doesNotThrow(() => assertSemver('0.12.2'))
  assert.doesNotThrow(() => assertSemver('1.0.0-rc.1'))
  for (const bad of [undefined, '', 'v0.12.2', '0.12', '^0.12.2']) assert.throws(() => assertSemver(bad))
})

test('pinRepoLinks moves main and an earlier tag to the release tag, for blob, tree and raw links', () => {
  const text = [
    '[a](https://github.com/tetherto/mdk/blob/main/backend/README.md#setup)',
    '[b]: https://github.com/tetherto/mdk/tree/main/examples/site',
    '<!-- docs@tether.io: c → https://github.com/tetherto/mdk/blob/v0.13.1/docs/c.md -->',
    '"$schema": "https://raw.githubusercontent.com/tetherto/mdk/main/backend/core/mdk-worker/mdk-contract.schema.json"',
    '[root](https://github.com/tetherto/mdk/tree/main)',
  ].join('\n')
  const out = pinRepoLinks(text, '0.14.0')
  assert.equal(out.match(/\/v0\.14\.0(?=[/)])/g).length, 5)
  assert.equal(/\/main\b|v0\.13\.1/.test(out), false)
  assert.equal(pinRepoLinks(out, '0.14.0'), out, 'idempotent')
})

test('pinRepoLinks leaves other repositories, release pages and slash refs alone', () => {
  const text = [
    'https://github.com/tetherto/mdk-docs/blob/main/README.md',
    'https://github.com/tetherto/mdk-prv/blob/main/README.md',
    'https://github.com/demo/demo-worker/tree/main',
    'https://github.com/tetherto/mdk/releases/tag/v0.13.1',
    'https://github.com/tetherto/mdk/blob/release/0.14.0/backend/README.md',
    'https://github.com/tetherto/mdk/blob/mainline/x.md',
  ].join('\n')
  assert.equal(pinRepoLinks(text, '0.14.0'), text)
})

test('pinRepoLinks moves a ref that ends a sentence, a bracket or a query, and a hyphenated pre-release', () => {
  const at = (tail) => `https://github.com/tetherto/mdk/tree/main${tail}`
  for (const tail of ['.', ', then', ']', '?plain=1', '`']) {
    assert.equal(pinRepoLinks(at(tail), '0.14.0'), at(tail).replace('/main', '/v0.14.0'), tail)
  }
  assert.equal(
    pinRepoLinks('https://github.com/tetherto/mdk/blob/v1.0.0-rc-1/x.md', '1.0.0'),
    'https://github.com/tetherto/mdk/blob/v1.0.0/x.md'
  )
  assert.equal(pinRepoLinks(`${at('').replace('main', 'v1.0.0-rc.1')}. Next`, '1.0.0'), `${at('').replace('main', 'v1.0.0')}. Next`)
})

test('pinRepoLinks pins a pre-release tag too', () => {
  assert.equal(
    pinRepoLinks('https://github.com/tetherto/mdk/blob/v1.0.0-rc.1/x.md', '1.0.0'),
    'https://github.com/tetherto/mdk/blob/v1.0.0/x.md',
  )
})
