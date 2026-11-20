import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  rawFileUrl,
  blobUrl,
  toDocsLink,
  unconfirmedEntry,
  fetchExternalEntries,
  buildEntries,
  compileValidator,
  displayProvider,
  formatModels,
  renderMarkdown,
  familySection,
  otherFamiliesSection,
  FULL_SHA_RE
} = require('../backend/workers/scripts/generate-catalogue.js')

const VALID_REF = 'a47fa82020454f9bfa9963ccaaa319b7948e8aa2'

function validContract (overrides = {}) {
  return {
    metadata: {
      provider: 'demo',
      deviceFamily: 'miner',
      brand: 'Demo',
      modelsSupported: [],
      overview: 'test fixture',
      ...overrides.metadata
    },
    capabilities: {
      telemetry: [],
      commands: [],
      health: { supportedStates: [] },
      errors: {},
      ...overrides.capabilities
    }
  }
}

function writeManifest (entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-workers-'))
  const manifestPath = path.join(dir, 'external-workers.json')
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2))
  return manifestPath
}

function writeContractFile (rootDir, relPath, content) {
  const full = path.join(rootDir, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

function withFetch (impl, fn) {
  const original = global.fetch
  global.fetch = impl
  return fn().finally(() => { global.fetch = original })
}

const manifestEntry = (over = {}) => ({
  name: 'demo-worker',
  brand: 'Demo',
  provider: 'demo',
  family: 'miner',
  repoUrl: 'https://github.com/demo/demo-worker',
  ref: VALID_REF,
  contractPath: 'mdk-contract.json',
  ...over
})

// --- rawFileUrl / blobUrl / toDocsLink -------------------------------------------------

test('rawFileUrl builds a raw.githubusercontent.com URL from a plain github.com repo URL', () => {
  const url = rawFileUrl('https://github.com/demo/demo-worker', VALID_REF, 'mdk-contract.json')
  assert.equal(url, `https://raw.githubusercontent.com/demo/demo-worker/${VALID_REF}/mdk-contract.json`)
})

test('rawFileUrl rejects a repoUrl that is not a plain github.com URL', () => {
  assert.throws(() => rawFileUrl('https://gitlab.com/demo/demo-worker', VALID_REF, 'mdk-contract.json'))
})

test('blobUrl builds a human-viewable github.com blob URL', () => {
  const url = blobUrl('https://github.com/demo/demo-worker', VALID_REF, 'mdk-contract.json')
  assert.equal(url, `https://github.com/demo/demo-worker/blob/${VALID_REF}/mdk-contract.json`)
})

test('toDocsLink passes an absolute URL through unchanged', () => {
  assert.equal(toDocsLink('https://github.com/demo/demo-worker'), 'https://github.com/demo/demo-worker')
})

test('toDocsLink converts a repo-relative path to a page-relative one', () => {
  const link = toDocsLink('backend/workers/miners/avalon/README.md')
  assert.ok(link.startsWith('..'), 'should be relative, walking up from backend/workers/docs/')
  assert.ok(link.endsWith('miners/avalon/README.md'))
})

test('toDocsLink passes through a falsy value unchanged', () => {
  assert.equal(toDocsLink(null), null)
})

// --- FULL_SHA_RE -------------------------------------------------------------------------

test('FULL_SHA_RE accepts a full 40-character commit SHA', () => {
  assert.ok(FULL_SHA_RE.test(VALID_REF))
})

test('FULL_SHA_RE rejects a branch name', () => {
  assert.ok(!FULL_SHA_RE.test('main'))
})

test('FULL_SHA_RE rejects a tag name', () => {
  assert.ok(!FULL_SHA_RE.test('v1.0.0'))
})

test('FULL_SHA_RE rejects a short SHA', () => {
  assert.ok(!FULL_SHA_RE.test('a47fa82'))
})

// --- unconfirmedEntry ----------------------------------------------------------------------

test('unconfirmedEntry uses manifest fields and flags itself unconfirmed', () => {
  const e = unconfirmedEntry(manifestEntry())
  assert.equal(e.source, 'external')
  assert.equal(e.confirmed, false)
  assert.equal(e.conformant, false)
  assert.equal(e.brand, 'Demo')
  assert.equal(e.family, 'miner')
  assert.equal(e.usage, blobUrl('https://github.com/demo/demo-worker', VALID_REF, 'mdk-contract.json'))
})

test('unconfirmedEntry falls back to the package name when no brand is given', () => {
  const e = unconfirmedEntry(manifestEntry({ brand: undefined }))
  assert.equal(e.brand, 'demo-worker')
})

// --- formatModels ----------------------------------------------------------------------

test('formatModels joins a non-empty model list', () => {
  assert.equal(formatModels({ models: ['A', 'B'], source: 'external', confirmed: true }), 'A, B')
})

test('formatModels explains an empty list for a confirmed external contract', () => {
  assert.equal(
    formatModels({ models: [], source: 'external', confirmed: true }),
    'Not enumerated; see manufacturer documentation'
  )
})

test('formatModels does not claim "not enumerated" for an unconfirmed row', () => {
  assert.equal(formatModels({ models: [], source: 'external', confirmed: false }), '—')
})

test('formatModels uses a plain dash for an empty in-repo model list', () => {
  assert.equal(formatModels({ models: [], source: 'in-repo', confirmed: true }), '—')
})

// --- familySection anchors ---------------------------------------------------------------

test('familySection includes the heading prefix so two sources never collide on the same anchor', () => {
  const entries = [{
    family: 'miner', brand: 'A', provider: 'a', models: [], package: 'p', link: 'https://x', usage: null, conformant: true, confirmed: true
  }]
  const partner = familySection(entries, 'miner', 3, 'Partner-maintained')
  const mdk = familySection(entries, 'miner', 3, 'MDK-maintained')
  assert.ok(partner.startsWith('### Partner-maintained miners'))
  assert.ok(mdk.startsWith('### MDK-maintained miners'))
  assert.notEqual(partner.split('\n')[0], mdk.split('\n')[0])
})

test('displayProvider renders the pool and partner provider slugs as proper nouns', () => {
  assert.equal(displayProvider('spiderpool'), 'SpiderPool')
  assert.equal(displayProvider('emcd'), 'EMCD')
  assert.equal(displayProvider('luxor'), 'Luxor')
  assert.equal(displayProvider('ocean'), 'Ocean')
  assert.equal(displayProvider('foundry'), 'Foundry')
  assert.equal(displayProvider('proto'), 'Proto')
  assert.equal(displayProvider('somebody-new'), 'somebody-new', 'an unlisted slug renders unchanged')
})

// --- fetchExternalEntries ----------------------------------------------------------------

test('fetchExternalEntries throws when the manifest file does not exist', async () => {
  const validate = compileValidator()
  const missingPath = path.join(os.tmpdir(), 'definitely-does-not-exist-' + Date.now(), 'external-workers.json')
  await assert.rejects(() => fetchExternalEntries(validate, missingPath))
})

test('fetchExternalEntries throws on invalid manifest JSON rather than reporting a gap', async () => {
  // A malformed manifest has the same consequence as a missing one — every external entry
  // disappears at once — so it's treated as fatal broken configuration, same as a missing file.
  const validate = compileValidator()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-workers-'))
  const manifestPath = path.join(dir, 'external-workers.json')
  fs.writeFileSync(manifestPath, '{ not valid json')

  await assert.rejects(() => fetchExternalEntries(validate, manifestPath))
})

test('fetchExternalEntries throws when the manifest does not parse to an array', async () => {
  const validate = compileValidator()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-workers-'))
  const manifestPath = path.join(dir, 'external-workers.json')
  fs.writeFileSync(manifestPath, JSON.stringify({ not: 'an array' }))

  await assert.rejects(() => fetchExternalEntries(validate, manifestPath))
})

test('fetchExternalEntries rejects a non-SHA ref without attempting a fetch', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry({ ref: 'main' })])
  let fetchCalled = false

  const { entries, gaps } = await withFetch(async () => { fetchCalled = true }, () =>
    fetchExternalEntries(validate, manifestPath))

  assert.ok(!fetchCalled, 'must not fetch an unpinned ref')
  assert.equal(entries.length, 1)
  assert.equal(entries[0].confirmed, false)
  assert.equal(gaps.length, 1)
  assert.ok(gaps[0].errors[0].includes('not a full 40-character commit SHA'))
})

test('fetchExternalEntries keeps an unconfirmed row on a non-OK HTTP response', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])

  const { entries, gaps } = await withFetch(
    async () => ({ ok: false, status: 404 }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  assert.equal(entries.length, 1)
  assert.equal(entries[0].confirmed, false)
  assert.equal(entries[0].brand, 'Demo', 'still labeled from the manifest, not dropped')
  assert.equal(gaps.length, 1)
  assert.ok(gaps[0].errors[0].includes('HTTP 404'))
})

test('fetchExternalEntries keeps an unconfirmed row when the fetch itself throws (network error)', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])

  const { entries, gaps } = await withFetch(
    async () => { throw new Error('getaddrinfo ENOTFOUND') },
    () => fetchExternalEntries(validate, manifestPath)
  )

  assert.equal(entries.length, 1)
  assert.equal(entries[0].confirmed, false)
  assert.ok(gaps[0].errors[0].includes('Check your network connection'))
})

test('fetchExternalEntries flags a schema-non-conformant but fetched contract as non-conformant, not unconfirmed', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])
  const badContract = { metadata: { provider: 'demo' } } // missing required fields

  const { entries, gaps } = await withFetch(
    async () => ({ ok: true, json: async () => badContract }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  assert.equal(entries.length, 1)
  assert.equal(entries[0].confirmed, true, 'the fetch succeeded — only validation failed')
  assert.equal(entries[0].conformant, false)
  assert.ok(gaps.length >= 1)
})

test('fetchExternalEntries prefers contract brand, then manifest brand, then contract provider, then manifest provider', async () => {
  const validate = compileValidator()

  // Contract supplies brand directly.
  let manifestPath = writeManifest([manifestEntry()])
  let result = await withFetch(
    async () => ({ ok: true, json: async () => validContract({ metadata: { brand: 'Contract Brand' } }) }),
    () => fetchExternalEntries(validate, manifestPath)
  )
  assert.equal(result.entries[0].brand, 'Contract Brand')

  // Contract omits brand -> falls back to manifest's brand, not straight to provider.
  manifestPath = writeManifest([manifestEntry({ brand: 'Manifest Brand' })])
  result = await withFetch(
    async () => ({ ok: true, json: async () => validContract({ metadata: { brand: undefined, provider: 'demo-inc' } }) }),
    () => fetchExternalEntries(validate, manifestPath)
  )
  assert.equal(result.entries[0].brand, 'Manifest Brand')

  // Neither contract nor manifest brand present -> falls back to contract provider.
  manifestPath = writeManifest([manifestEntry({ brand: undefined })])
  result = await withFetch(
    async () => ({ ok: true, json: async () => validContract({ metadata: { brand: undefined, provider: 'contract-provider' } }) }),
    () => fetchExternalEntries(validate, manifestPath)
  )
  assert.equal(result.entries[0].brand, 'contract-provider')
})

test('fetchExternalEntries produces a real entry with an empty model list rendered as "not enumerated"', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])

  const { entries } = await withFetch(
    async () => ({ ok: true, json: async () => validContract() }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  assert.equal(entries[0].models.length, 0)
  assert.equal(formatModels(entries[0]), 'Not enumerated; see manufacturer documentation')
})

test('fetchExternalEntries isolates one bad entry from another good one in the same manifest', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([
    manifestEntry({ name: 'broken-worker', ref: 'not-a-sha' }),
    manifestEntry({ name: 'good-worker' })
  ])

  const { entries, gaps } = await withFetch(
    async () => ({ ok: true, json: async () => validContract() }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  assert.equal(entries.length, 2)
  assert.equal(gaps.length, 1, 'only the broken entry produced a gap')
  const broken = entries.find((e) => e.package === 'broken-worker')
  const good = entries.find((e) => e.package === 'good-worker')
  assert.equal(broken.confirmed, false)
  assert.equal(good.confirmed, true)
})

test('fetchExternalEntries applies a per-fetch timeout via AbortSignal', async () => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])
  let sawSignal = false

  await withFetch(
    async (url, opts) => {
      sawSignal = !!(opts && opts.signal)
      return { ok: true, json: async () => validContract() }
    },
    () => fetchExternalEntries(validate, manifestPath)
  )

  assert.ok(sawSignal, 'fetch must be called with an abort signal so a hung host cannot stall generation')
})

// --- buildEntries: an unparseable in-repo contract must not vanish --------------------------

test('buildEntries keeps an unparseable in-repo contract as an unconfirmed row instead of dropping it', () => {
  const validate = compileValidator()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workers-root-'))
  writeContractFile(root, 'miners/broken/plugin/mdk-contract.json', '{ not valid json')

  const { entries, gaps } = buildEntries(validate, root)

  assert.equal(entries.length, 1, 'a broken contract still gets a row, matching how a broken external fetch is handled')
  assert.equal(entries[0].confirmed, false)
  assert.equal(entries[0].family, 'unknown')
  assert.equal(entries[0].brand, 'broken', 'falls back to the package directory name when metadata could not be read')
  assert.equal(gaps.length, 1)
  assert.ok(gaps[0].errors[0].includes('Invalid JSON'))
})

test('buildEntries does not add a placeholder row for an unparseable sample contract', () => {
  const validate = compileValidator()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workers-root-'))
  writeContractFile(root, 'samples/broken/plugin/mdk-contract.json', '{ not valid json')

  const { entries, gaps } = buildEntries(validate, root)

  assert.equal(entries.length, 0, 'samples never enter the catalogue, broken or not')
  assert.equal(gaps.length, 1, 'the gap is still reported even though no row is added')
})

test('buildEntries still parses a valid in-repo contract correctly given an explicit root', () => {
  const validate = compileValidator()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workers-root-'))
  writeContractFile(root, 'miners/demo/plugin/mdk-contract.json', JSON.stringify(validContract()))

  const { entries, gaps } = buildEntries(validate, root)

  assert.equal(entries.length, 1)
  assert.equal(entries[0].confirmed, true)
  assert.equal(entries[0].conformant, true)
  assert.equal(gaps.length, 0)
})

// --- otherFamiliesSection: an entry outside the known family lists must not vanish ----------

test('otherFamiliesSection renders an entry whose family is not in the known family lists', () => {
  const entry = {
    family: 'unknown',
    brand: 'Mystery',
    provider: 'demo',
    models: [],
    package: 'p',
    link: 'https://x',
    usage: null,
    conformant: false,
    confirmed: false
  }
  const out = otherFamiliesSection([entry], 3, 'MDK-maintained')
  assert.ok(out.startsWith('### MDK-maintained Other'))
  assert.ok(out.includes('Mystery'))
})

test('otherFamiliesSection renders nothing when every entry has a known family', () => {
  const entry = {
    family: 'miner',
    brand: 'Known',
    provider: 'demo',
    models: [],
    package: 'p',
    link: 'https://x',
    usage: null,
    conformant: true,
    confirmed: true
  }
  const out = otherFamiliesSection([entry], 3, 'MDK-maintained')
  assert.equal(out, '')
})

// --- renderMarkdown --------------------------------------------------------------------

const LEGEND = 'A row flagged "v1 strictness gaps"'
const CLEAN = 'All worker contracts validate cleanly'

function entry (over = {}) {
  return {
    source: 'in-repo',
    family: 'miner',
    brand: 'Demo',
    provider: 'demo',
    models: [],
    package: 'backend/workers/miners/demo',
    contract: 'backend/workers/miners/demo/plugin/mdk-contract.json',
    link: 'backend/workers/miners/demo/README.md',
    usage: null,
    conformant: true,
    strictConformant: true,
    confirmed: true,
    ...over
  }
}

test('renderMarkdown keeps the clean sentence and no legend when nothing is flagged', () => {
  const md = renderMarkdown([entry()], [])
  assert.ok(md.includes(CLEAN))
  assert.ok(!md.includes(LEGEND))
  assert.ok(!md.includes('(v1 strictness gaps)'))
})

test('renderMarkdown explains a strictness-gap row and no longer claims every contract is clean', () => {
  const md = renderMarkdown([entry({ strictConformant: false }), entry({ brand: 'Other' })], [])
  assert.ok(md.includes('| Demo (v1 strictness gaps) |'))
  assert.ok(md.includes(LEGEND))
  assert.ok(md.includes('[Contract validation](../../core/mdk-worker/README.md#contract-validation)'), 'the legend links the rules it summarises')
  assert.ok(md.indexOf(LEGEND) < md.indexOf('## MDK-maintained Workers'), 'the legend sits above both source sections')
  assert.ok(!md.includes(CLEAN))
  assert.ok(md.includes('No worker contract fails [`mdk-contract.schema.json`](../../core/mdk-worker/mdk-contract.schema.json). 1 contract has v1 strictness gaps'))
})

test('renderMarkdown counts strictness gaps beside a non-conformant list as other contracts', () => {
  const md = renderMarkdown(
    [entry({ strictConformant: false }), entry({ brand: 'B', strictConformant: false }), entry({ brand: 'C', conformant: false, strictConformant: false })],
    [{ source: 'in-repo', contract: 'c.json', errors: ['ERR_CONTRACT_TYPE: x'] }]
  )
  assert.ok(md.includes('These contracts do not yet conform'))
  assert.ok(md.includes('2 other contracts have v1 strictness gaps'))
})

test('renderMarkdown does not count unconfirmed or non-conformant rows as strictness gaps', () => {
  const md = renderMarkdown(
    [entry({ confirmed: false, conformant: false, strictConformant: false }), entry({ brand: 'C', conformant: false, strictConformant: false })],
    [{ source: 'in-repo', contract: 'c.json', errors: ['ERR_CONTRACT_TYPE: x'] }]
  )
  assert.ok(!md.includes(LEGEND))
  assert.ok(!md.includes('strictness gaps, reported'))
  assert.ok(!md.includes('(v1 strictness gaps)'))
})

test('renderMarkdown flags a real legacy contract that compileValidator reports warnings for', () => {
  const validate = compileValidator()
  const ok = validate(validContract())
  assert.ok(ok)
  assert.ok(validate.warnings.length > 0)
  const md = renderMarkdown([entry({ conformant: ok, strictConformant: ok && validate.warnings.length === 0 })], [])
  assert.ok(md.includes(LEGEND))
  assert.ok(md.includes('| Demo (v1 strictness gaps) |'))
})
