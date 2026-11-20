import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PAGE, checkExample, extractExample, keyMapKeys, stackKeys } from '../docs/scripts/check-mdk-yaml-example.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const minimal = [
  'apiVersion: mdk/v1',
  'kind: Stack',
  'metadata:',
  '  name: my-site',
  'spec:',
  '  kernel:',
  '    port: 3848',
  '  gateway:',
  '    port: 3847',
  ''
].join('\n')

const page = (...blocks) => ['# Page', '', ...blocks.map(b => '```yaml\n' + b + '```\n')].join('\n')

test('extractExample: returns the one yaml block on the page', () => {
  assert.equal(extractExample(page(minimal)), minimal)
})

test('extractExample: a page with no yaml block, or with a second copy, is refused', () => {
  assert.throws(() => extractExample('# Page\n\n```bash\nmdk run\n```\n'), /exactly one/)
  assert.throws(() => extractExample(page(minimal, minimal)), /exactly one/)
})

test('checkExample: the minimal example loads through the CLI parser', async () => {
  const r = await checkExample(minimal)
  assert.deepEqual(r.errors, [])
  assert.equal(r.ok, true)
})

test('checkExample: an example without apiVersion fails with the CLI loader message', async () => {
  const r = await checkExample(minimal.replace('apiVersion: mdk/v1\n', ''))
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('apiVersion')), r.errors.join('\n'))
})

test('checkExample: an apiVersion or kind other than the one mdk onboard writes fails', async () => {
  const r = await checkExample(minimal.replace('mdk/v1', 'mdk.example.io/v1'))
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('apiVersion')), r.errors.join('\n'))
})

test('checkExample: a spec key the CLI does not write fails, though the loader ignores it', async () => {
  const r = await checkExample(minimal.replace('  kernel:', '  kernal:'))
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('spec.kernal')), r.errors.join('\n'))
})

test('keyMapKeys: reads the spec keys named in the first column of the key map', () => {
  const md = '| Key | Taught by |\n| --- | --- |\n| `spec.kernel` | a |\n| `spec.gateway` | b |\n\nProse `spec.mcp`.\n'
  assert.deepEqual(keyMapKeys(md), ['kernel', 'gateway'])
})

test('the reference page carries one example that the CLI parser accepts', async () => {
  const md = readFileSync(path.join(ROOT, PAGE), 'utf8')
  const r = await checkExample(extractExample(md))
  assert.deepEqual(r.errors, [])
})

test('the reference page key map has one row per top-level spec key the CLI writes', async () => {
  const md = readFileSync(path.join(ROOT, PAGE), 'utf8')
  assert.deepEqual([...keyMapKeys(md)].sort(), [...(await stackKeys())].sort())
})
