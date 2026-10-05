'use strict'

// Generates the supported-hardware catalogue from worker contracts.
//
// Source of truth: every backend/workers/**/mdk-contract.json (the handler-bearing
// contracts under each package's plugin/) PLUS the manufacturer-maintained contracts
// listed in backend/workers/external-workers.json, fetched live from each manufacturer's
// own repo at generation time (see fetchExternalEntries). Each contract is validated
// against the schema vendored with the runtime (backend/core/mdk-worker/mdk-contract.schema.json)
// with ajv. Validation is WARN-ONLY: gaps are reported (stderr + both outputs) for
// confirmation on the PR, but generation never fails and contracts are never edited.
// A contract that cannot be read or parsed (an external fetch failing on network/404/bad JSON,
// or an in-repo mdk-contract.json with a JSON syntax error) is reported the same way in both
// cases and kept as an unconfirmed row (family 'unknown', rendered under "Other" — see
// unconfirmedEntry and the in-repo catch block in buildEntries) rather than dropped from that
// run's catalogue. The one exception is the external manifest file itself: if it is missing,
// unparseable, or not a JSON array, the whole run aborts rather than being treated as "no
// external Workers" — a broken manifest would otherwise empty the entire manufacturer-
// maintained section on an exit-0 run (see the checks at the top of fetchExternalEntries).
//
// Outputs (regenerate with `npm run generate:catalogue`):
//   backend/workers/docs/catalogue.json          machine-readable
//   backend/workers/docs/supported-hardware.md    generated markdown, DO NOT EDIT
//
// This script has no "check mode" of its own — it always writes for real. Staleness detection
// (did someone forget to regenerate after changing a contract?) lives entirely outside this
// file, in docs/scripts/regenerate-docs.mjs (runs this for real, then diffs the result against
// git) and .github/workflows/docs-freshness.yml (the CI job that calls it with --check).
// Anything that would make output non-deterministic between two runs against the same inputs
// (e.g. relying on filesystem enumeration order instead of the .sort() calls already used below)
// would only surface as a failure in that separate workflow, not from anything in this file.
//
// Usage: node backend/workers/scripts/generate-catalogue.js

const fs = require('fs')
const path = require('path')
const Ajv = require('ajv/dist/2020')

const WORKERS_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(WORKERS_ROOT, '../..')
const SCHEMA_PATH = path.join(REPO_ROOT, 'backend', 'core', 'mdk-worker', 'mdk-contract.schema.json')
const DOCS_DIR = path.join(WORKERS_ROOT, 'docs')
const JSON_OUT = path.join(DOCS_DIR, 'catalogue.json')
const MD_OUT = path.join(DOCS_DIR, 'supported-hardware.md')
const EXTERNAL_MANIFEST_PATH = path.join(WORKERS_ROOT, 'external-workers.json')
// A manufacturer's host hanging must not stall the whole run (or, in CI, run out the clock on the
// job timeout) — one small JSON file over HTTPS should resolve in well under this, so a fetch still
// running at 10s is treated the same as any other unreachable host.
const EXTERNAL_FETCH_TIMEOUT_MS = 10_000
// A full commit SHA (git's short SHAs are ambiguous and can collide as a repo grows, so only the
// full 40-character form is accepted) — deliberately excludes tags and branches, which can move.
const FULL_SHA_RE = /^[0-9a-f]{40}$/i

// deviceFamily slug -> display label. Hardware families are physical field
// devices; minerpool is a protocol integration, grouped separately.
//
// This list is not kept in sync with the schema automatically: mdk-contract.schema.json's own
// deviceFamily doc-comment gives 'switchgear' as a valid example, but it isn't listed here. A
// contract using a deviceFamily absent from both arrays below still validates cleanly and still
// renders (via otherFamiliesSection, under "Other"), so it won't silently vanish — but it also
// won't get its own heading/label, and nothing here will tell you why until someone notices.
// Add a schema-example family here when a real contract actually needs it.
const FAMILY_LABELS = {
  miner: 'miners',
  container: 'containers',
  'power-meter': 'power meters',
  sensor: 'sensors',
  minerpool: 'mining pools'
}
const HARDWARE_FAMILIES = ['miner', 'container', 'power-meter', 'sensor']
const POOL_FAMILIES = ['minerpool']

// Display-only proper-noun casing for the Markdown table — contracts declare `provider` as a
// lowercase slug (e.g. "microbt", per the schema's own example), which catalogue.json keeps
// faithfully. A provider not listed here renders as its raw slug, unchanged.
const PROVIDER_LABELS = {
  microbt: 'MicroBT',
  bitmain: 'Bitmain',
  canaan: 'Canaan',
  bitdeer: 'Bitdeer',
  satec: 'Satec',
  seneca: 'Seneca',
  abb: 'ABB', // stylized all-caps since the 1988 ASEA/Brown Boveri merger, not a generic capitalize-first-letter case
  schneider: 'Schneider' // short form of Schneider Electric SE
}

function displayProvider (provider) {
  return PROVIDER_LABELS[provider] || provider
}

function findContracts (dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) findContracts(full, acc)
    else if (entry.name === 'mdk-contract.json') acc.push(full)
  }
  return acc
}

function rel (p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/')
}

function linkFromDocs (repoRel) {
  return path.relative(DOCS_DIR, path.join(REPO_ROOT, repoRel)).split(path.sep).join('/')
}

// catalogue.json is a machine-readable contract in its own right: every path-like field in it is
// repo-root-relative (or, for a manufacturer-maintained entry, an absolute URL — there is no
// repo-relative equivalent for something outside this repo). Only the Markdown renderer below
// converts a repo-relative value to a path relative to the generated page; the JSON never does,
// so a consumer reading catalogue.json always gets one consistent kind of path.
function toDocsLink (value) {
  if (!value) return value
  return /^https?:\/\//.test(value) ? value : linkFromDocs(value)
}

// Unlike link/usage above, an entry's `contract` field is NOT normalized through toDocsLink and
// deliberately means something different depending on `source`: a repo-relative path (rel(file))
// for an in-repo entry, but the raw.githubusercontent.com fetch URL for an external one. A
// consumer of catalogue.json treating `contract` as "a path in this repo" would mishandle every
// manufacturer-maintained row.

function compileValidator () {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  const ajv = new Ajv({ allErrors: true, strict: false })
  return ajv.compile(schema)
}

function buildEntries (validate, root = WORKERS_ROOT) {
  const entries = []
  const gaps = []

  for (const file of findContracts(root).sort()) {
    // Computed up front (file path only, no dependency on the contract parsing) so an
    // unparseable contract can still be placed and linked below, the same as a successfully
    // parsed one.
    // Handler-bearing contracts live under <package>/plugin/; the catalogue
    // links the package itself. This unwinds exactly one 'plugin' segment — it assumes every
    // contract sits at <package>/mdk-contract.json or <package>/plugin/mdk-contract.json, not
    // any deeper nesting (e.g. <package>/plugin/v2/mdk-contract.json). A contract nested one
    // level further would silently compute the wrong pkgDir, producing a link/usage pointing at
    // a nonexistent or wrong README/USAGE.md with no error.
    let pkgDir = path.dirname(file)
    if (path.basename(pkgDir) === 'plugin') pkgDir = path.dirname(pkgDir)
    // Sample contracts must conform too, but hypothetical devices do not
    // belong in the supported-hardware catalogue. This is a bare directory-name convention, not
    // a schema-level flag: it works today because the one sample contract sits directly under
    // samples/, but renaming that directory, adding a second samples-like directory, or moving a
    // sample contract under a real family directory would silently misfire in either direction
    // (a real device wrongly excluded, or a hypothetical one wrongly published) with no error.
    const isSample = path.relative(root, file).split(path.sep)[0] === 'samples'

    let contract
    try {
      contract = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (err) {
      gaps.push({ source: 'in-repo', contract: rel(file), errors: ['Invalid JSON: ' + err.message] })
      // Kept as a row (family 'unknown', so it renders under "Other") rather than dropped
      // outright, matching how an unreachable external contract is handled: a maintainer
      // scanning the rendered page should see that something is broken here, not silence.
      if (!isSample) {
        entries.push({
          source: 'in-repo',
          family: 'unknown',
          brand: path.basename(pkgDir),
          provider: '',
          models: [],
          package: rel(pkgDir),
          contract: rel(file),
          link: rel(pkgDir) + '/README.md',
          usage: null,
          usageLabel: 'USAGE.md',
          conformant: false,
          confirmed: false
        })
      }
      continue
    }

    const ok = validate(contract)
    const meta = contract.metadata || {}
    const usagePath = path.join(pkgDir, 'USAGE.md')

    if (!isSample) {
      entries.push({
        source: 'in-repo',
        family: meta.deviceFamily || 'unknown',
        brand: meta.brand || meta.provider || '(unknown)',
        provider: meta.provider || '',
        models: Array.isArray(meta.modelsSupported) ? meta.modelsSupported : [],
        package: rel(pkgDir),
        contract: rel(file),
        link: rel(pkgDir) + '/README.md',
        usage: fs.existsSync(usagePath) ? rel(usagePath) : null,
        usageLabel: 'USAGE.md',
        conformant: ok,
        confirmed: true
      })
    }

    if (!ok) {
      gaps.push({
        source: 'in-repo',
        contract: rel(file),
        errors: (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`)
      })
    }
  }

  entries.sort((a, b) => a.family.localeCompare(b.family) || a.brand.localeCompare(b.brand))
  return { entries, gaps }
}

// Parses "https://github.com/<owner>/<repo>" into a raw.githubusercontent.com base URL
// for fetching one file at a given ref, without cloning or installing the repo.
function rawFileUrl (repoUrl, ref, filePath) {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/.exec(repoUrl)
  if (!m) throw new Error(`repoUrl is not a plain https://github.com/<owner>/<repo> URL: ${repoUrl}`)
  const [, owner, repoName] = m
  return `https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/${filePath}`
}

// The human-viewable GitHub page for the same file rawFileUrl() fetches — this is what belongs
// in the "Docs" column, since raw.githubusercontent.com content isn't meant for a person to open.
function blobUrl (repoUrl, ref, filePath) {
  return `${repoUrl.replace(/\/$/, '')}/blob/${ref}/${filePath}`
}

// A manifest entry we could not confirm this run (bad manifest URL, network error, HTTP
// error, or unparseable JSON) still gets a row — using only what the manifest itself
// declares — rather than silently disappearing from the table. An offline maintainer
// regenerating locally should see "not confirmed" in the output they're about to commit,
// not a manufacturer-shaped hole they have to notice on their own.
function unconfirmedEntry (manifestEntry) {
  // Still point at where the contract is supposed to live, even though the fetch that would
  // confirm it failed — a maintainer chasing the "not confirmed" flag can click straight through
  // to check whether the manifest's repoUrl/ref/contractPath are actually still correct.
  const bestEffortDocsUrl = manifestEntry.repoUrl && manifestEntry.ref && manifestEntry.contractPath
    ? blobUrl(manifestEntry.repoUrl, manifestEntry.ref, manifestEntry.contractPath)
    : null
  return {
    source: 'external',
    family: manifestEntry.family || 'unknown',
    brand: manifestEntry.brand || manifestEntry.name,
    provider: manifestEntry.provider || '',
    models: [],
    package: manifestEntry.name,
    contract: null,
    link: manifestEntry.repoUrl,
    usage: bestEffortDocsUrl,
    usageLabel: manifestEntry.contractPath ? `${manifestEntry.contractPath} (unverified)` : undefined,
    conformant: false,
    confirmed: false
  }
}

// Fetches and validates each manufacturer-maintained contract listed in
// external-workers.json. Nothing here is installed or executed — only the one
// contract file is read, over plain HTTPS, so a manufacturer's own dependency
// tree (and whatever it uses for crypto) never becomes part of this repo.
// Each entry is isolated: one manufacturer's unreachable repo, missing file, bad
// JSON, or schema violation is reported as a gap and does not stop the others or
// abort generation, matching the warn-only contract of the in-repo scan above.
async function fetchExternalEntries (validate, manifestPath = EXTERNAL_MANIFEST_PATH) {
  const entries = []
  const gaps = []
  const manifestLink = rel(manifestPath)

  // A missing manifest is a broken generator input, not "there happen to be no external
  // Workers" — silently returning an empty result here would make a deleted or misnamed
  // manifest look like a legitimate catalogue with no manufacturer-maintained Workers,
  // quietly dropping every external entry with nothing to flag it. This is the one case in
  // this function that is NOT warn-only: it aborts the whole run, same as any other broken
  // generator input.
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`External Worker manifest not found at ${manifestLink}. If it was intentionally removed, ` +
      'also remove the manufacturer-maintained section of the catalogue generator; a missing manifest is treated ' +
      'as broken configuration, not "no external Workers."')
  }

  let manifest
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch (err) {
    // Malformed manifest JSON has the same consequence as a missing manifest — every external
    // entry disappears at once — so it gets the same fatal treatment rather than a warn-only gap
    // that lets a single typo silently empty the manufacturer-maintained section on an exit-0 run.
    throw new Error(`External Worker manifest at ${manifestLink} is not valid JSON: ${err.message}. Fix the ` +
      'syntax; a manifest that cannot be parsed is treated as broken configuration, not "no external Workers."')
  }

  // A non-array manifest (e.g. an object) would otherwise throw an opaque "not iterable" from the
  // loop below; fail with the same explicit, fatal message as the other broken-manifest cases.
  if (!Array.isArray(manifest)) {
    throw new Error(`External Worker manifest at ${manifestLink} must be a JSON array of entries, but parsed ` +
      `as ${manifest === null ? 'null' : typeof manifest}. See the existing entries for the expected shape.`)
  }

  // Entries are fetched one at a time (this loop awaits each iteration), not in parallel. The
  // per-fetch EXTERNAL_FETCH_TIMEOUT_MS above bounds one manufacturer's hang, not the whole
  // run: with N manifest entries all hanging, total wall-clock time is N * that timeout, not a
  // fixed ceiling. Fine while the manifest is small; worth revisiting (e.g. Promise.all) if it
  // grows enough to meaningfully add to CI time or approach the job's own timeout.
  for (const manifestEntry of manifest) {
    // Only `ref` is format-checked below. Every other field (`name`, `repoUrl`, `contractPath`,
    // `brand`, `provider`, `family`) is used with bare `||` fallbacks and no shape validation —
    // a manifest entry missing `repoUrl` or `name` doesn't fail fast here, it produces a
    // gap/label like "undefined (undefined)" or a `package: undefined` in catalogue.json rather
    // than a clear "this manifest entry is malformed" error.
    const label = `${manifestEntry.name} (${manifestEntry.repoUrl})`

    // A tag or branch defeats the whole point of pinning: the maintainer docs recommend a SHA,
    // but nothing enforced that until now — accepting anything here let a mutable ref pass
    // review silently and make identical repository inputs generate different output over time.
    if (!FULL_SHA_RE.test(manifestEntry.ref || '')) {
      gaps.push({
        source: 'external',
        contract: label,
        errors: [`ref "${manifestEntry.ref}" is not a full 40-character commit SHA. A tag or branch can move; ` +
          `pin the exact commit in ${manifestLink}`]
      })
      entries.push(unconfirmedEntry(manifestEntry))
      continue
    }

    let url
    try {
      url = rawFileUrl(manifestEntry.repoUrl, manifestEntry.ref, manifestEntry.contractPath)
    } catch (err) {
      gaps.push({ source: 'external', contract: label, errors: [`${err.message}. Fix the entry in ${manifestLink}`] })
      entries.push(unconfirmedEntry(manifestEntry))
      continue
    }

    let contract
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS) })
      if (!res.ok) {
        gaps.push({
          source: 'external',
          contract: label,
          errors: [`Fetching ${url} returned HTTP ${res.status}. Verify repoUrl/ref/contractPath in ${manifestLink} are still correct for this manufacturer`]
        })
        entries.push(unconfirmedEntry(manifestEntry))
        continue
      }
      contract = await res.json()
    } catch (err) {
      const timedOut = err.name === 'TimeoutError'
      const reason = timedOut
        ? `timed out after ${EXTERNAL_FETCH_TIMEOUT_MS / 1000}s`
        : `could not be reached or parsed (${err.message})`
      gaps.push({
        source: 'external',
        contract: label,
        errors: [`Fetching ${url} ${reason}. Check your network connection, or verify the entry in ${manifestLink}`]
      })
      entries.push(unconfirmedEntry(manifestEntry))
      continue
    }

    const ok = validate(contract)
    const meta = contract.metadata || {}
    // Deliberately grouped by field kind, not by source: any brand-shaped value (from either
    // the fetched contract or the manifest) wins over any provider-shaped value (from either),
    // not "everything from the contract, then everything from the manifest." Reordering the
    // middle two terms so it reads that way instead is a real behavior change, not a refactor —
    // it changes what renders for a contract that fetches fine but omits `metadata.brand`.
    entries.push({
      source: 'external',
      family: meta.deviceFamily || manifestEntry.family || 'unknown',
      brand: meta.brand || manifestEntry.brand || meta.provider || manifestEntry.provider || '(unknown)',
      provider: meta.provider || manifestEntry.provider || '',
      models: Array.isArray(meta.modelsSupported) ? meta.modelsSupported : [],
      package: manifestEntry.name,
      contract: url,
      link: manifestEntry.repoUrl,
      usage: blobUrl(manifestEntry.repoUrl, manifestEntry.ref, manifestEntry.contractPath),
      usageLabel: manifestEntry.contractPath,
      conformant: ok,
      confirmed: true
    })

    if (!ok) {
      gaps.push({
        source: 'external',
        contract: label,
        errors: (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`)
      })
    }
  }

  entries.sort((a, b) => a.family.localeCompare(b.family) || a.brand.localeCompare(b.brand))
  return { entries, gaps }
}

function writeJson (entries, gaps) {
  const data = {
    note: 'GENERATED by backend/workers/scripts/generate-catalogue.js from backend/workers/**/mdk-contract.json ' +
      'and backend/workers/external-workers.json. Do not edit by hand. This is the machine-readable twin of ' +
      rel(MD_OUT) + ". Read that instead if you're a person, not a script.",
    schema: rel(SCHEMA_PATH),
    workers: entries,
    conformanceGaps: gaps
  }
  fs.writeFileSync(JSON_OUT, JSON.stringify(data, null, 2) + '\n')
}

// headingPrefix disambiguates the two sources' family headings (e.g. "Manufacturer-maintained
// Miners" vs "MDK-maintained Miners") so GitHub's anchor auto-slugging never collides — two
// headings with identical text get "#miners" and "#miners-1", where every inbound link that
// names "#miners" silently lands on the first source's (possibly incomplete) table instead of
// erroring, which is exactly the kind of drift that goes unnoticed until a reader hits it.
// "—" reads as "explicitly zero models" — ambiguous, and outright wrong for a manufacturer's
// contract that just doesn't enumerate any (this repo doesn't control that contract's
// completeness, unlike an in-repo one, where an empty list is our own gap to flag as such).
function formatModels (e) {
  if (e.models.length) return e.models.join(', ')
  // Only for a contract we actually fetched — an unconfirmed row is already flagged as such
  // via the brand column, so this column doesn't need a second, differently-worded caveat.
  // Deliberately `!== false` rather than `=== true`: every entry constructor today sets
  // `confirmed` explicitly, but this treats an entry shape that omits the field entirely as
  // confirmed by default rather than erroring, which would silently mislabel a future entry
  // type that forgets to set it.
  if (e.source === 'external' && e.confirmed !== false) return 'Not enumerated; see manufacturer documentation'
  return '—'
}

function renderTable (rows, headingLevel, headingText) {
  if (!rows.length) return ''
  let out = `${'#'.repeat(headingLevel)} ${headingText}\n\n`
  out += '| Brand | Provider | Models | Worker package | Docs |\n'
  out += '|-------|----------|--------|----------------|------|\n'
  for (const e of rows) {
    const models = formatModels(e)
    const pkg = `[\`${e.package}\`](${toDocsLink(e.link)})`
    const docs = e.usage ? `[${e.usageLabel || 'USAGE.md'}](${toDocsLink(e.usage)})` : '—'
    // "not confirmed" (the fetch itself failed) takes priority over "non-conformant"
    // (the fetch succeeded but the contract failed schema validation) — they're
    // different problems and only one can be true for a given entry.
    let flag = ''
    if (e.confirmed === false) flag = ' (not confirmed this run, see [Contract conformance](#contract-conformance))'
    else if (!e.conformant) flag = ' (non-conformant, see [Contract conformance](#contract-conformance))'
    out += `| ${e.brand}${flag} | ${displayProvider(e.provider)} | ${models} | ${pkg} | ${docs} |\n`
  }
  return out + '\n'
}

function familySection (entries, family, headingLevel, headingPrefix) {
  const rows = entries.filter((e) => e.family === family)
  const label = FAMILY_LABELS[family] || family
  return renderTable(rows, headingLevel, `${headingPrefix} ${label}`)
}

// HARDWARE_FAMILIES/POOL_FAMILIES double as an allowlist for what gets its own heading below.
// Without this catch-all, an entry whose family is 'unknown' (metadata missing or unreadable)
// or a future family the schema grows to support before someone updates those two arrays would
// still land in catalogue.json and conformanceGaps, but silently never appear on the rendered
// page at all — directly contradicting "the catalogue is still generated from everything else
// that succeeded" a few lines below. Rendering it under "Other" instead keeps that promise true.
function otherFamiliesSection (subset, headingLevel, headingPrefix) {
  const known = new Set([...HARDWARE_FAMILIES, ...POOL_FAMILIES])
  const rows = subset.filter((e) => !known.has(e.family))
  return renderTable(rows, headingLevel, `${headingPrefix} Other`)
}

function sourceSection (entries, source, heading, headingPrefix, intro, note) {
  const subset = entries.filter((e) => e.source === source)
  if (!subset.length) return ''

  let out = `## ${heading}\n\n${intro}\n\n`
  if (note) out += `> ${note}\n\n`
  for (const family of HARDWARE_FAMILIES) out += familySection(subset, family, 3, headingPrefix)
  for (const family of POOL_FAMILIES) out += familySection(subset, family, 3, headingPrefix)
  out += otherFamiliesSection(subset, 3, headingPrefix)
  return out
}

function writeMarkdown (entries, gaps) {
  let md = '<!-- GENERATED FILE — DO NOT EDIT. For machine readable version see catalogue.json. Generated by backend/workers/scripts/generate-catalogue.js: run `npm run generate:catalogue` from the repo root. '
  md += 'Source: backend/workers/**/mdk-contract.json and backend/workers/external-workers.json, validated against backend/core/mdk-worker/mdk-contract.schema.json. -->\n\n'
  md += '# Supported hardware\n\n'
  md += 'A Worker contract may be an official manufacturer\'s Worker, or an MDK Worker maintained in-repo.\n\n'

  md += sourceSection(
    entries, 'external', 'Manufacturer-maintained Workers', 'Manufacturer-maintained',
    'Built and maintained by the device manufacturer, fetched and schema-validated from their own repository ' +
      'at generation time. MDK does not independently test these against specific firmware or models beyond ' +
      'the contract shape. See the linked repository for what it actually supports.',
    'A row flagged "not confirmed this run" means the fetch itself failed (see ' +
      '[Contract conformance](#contract-conformance)); the row is kept rather than dropped.'
  )
  md += sourceSection(
    entries, 'in-repo', 'MDK-maintained Workers', 'MDK-maintained',
    'Built and maintained in this repository, with a bundled mock and unit and integration tests.'
  )

  md += '## Contract conformance\n\n'
  if (!gaps.length) {
    md += 'All worker contracts validate cleanly against the vendored schema.\n'
  } else {
    md += 'These contracts do not yet conform to '
    md += '[`mdk-contract.schema.json`](' + linkFromDocs(rel(SCHEMA_PATH)) + '), or could not be fetched/read at all. '
    md += 'Reported for confirmation on the PR; the catalogue is still generated from everything else that succeeded.\n\n'
    for (const g of gaps) {
      md += `- \`${g.contract}\`${g.source === 'external' ? ' (manufacturer-maintained)' : ''}\n`
      for (const e of g.errors) md += `  - ${e}\n`
    }
  }
  fs.writeFileSync(MD_OUT, md)
}

async function main () {
  const validate = compileValidator()
  const inRepo = buildEntries(validate)
  const external = await fetchExternalEntries(validate)

  // Each half is already sorted internally (by family, then brand) but this concatenation is
  // grouped by source, not a single global sort — and, worth noticing before assuming it's a
  // typo, `entries` and `gaps` concatenate in opposite source order from each other (external
  // first here, in-repo first below). `entries` leading with external matches the generated
  // page's manufacturer-first section order; nothing currently depends on `gaps`' order, so its
  // order is just whatever build order happened to produce, not a matching deliberate choice.
  // A consumer of catalogue.json assuming `workers` is one globally-sorted list will be
  // surprised; sourceSection() re-filters by source for the Markdown output regardless.
  const entries = [...external.entries, ...inRepo.entries]
  const gaps = [...inRepo.gaps, ...external.gaps]

  writeJson(entries, gaps)
  writeMarkdown(entries, gaps)

  if (gaps.length) {
    console.warn(`\n[generate-catalogue] ${gaps.length} contract(s) did not conform or could not be read (warn-only; confirm/fix on PR):`)
    for (const g of gaps) {
      console.warn(`  - ${g.contract}${g.source === 'external' ? ' (manufacturer-maintained)' : ''}`)
      for (const e of g.errors) console.warn(`      ${e}`)
    }
  } else {
    console.log('[generate-catalogue] all contracts conform to the schema.')
  }
  console.log(`[generate-catalogue] wrote ${rel(JSON_OUT)} and ${rel(MD_OUT)} (${entries.length} workers, ${external.entries.length} manufacturer-maintained).`)
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[generate-catalogue] failed to run:', err)
    process.exitCode = 1
  })
}

module.exports = {
  rawFileUrl,
  blobUrl,
  toDocsLink,
  unconfirmedEntry,
  fetchExternalEntries,
  buildEntries,
  compileValidator,
  formatModels,
  familySection,
  otherFamiliesSection,
  EXTERNAL_MANIFEST_PATH,
  FULL_SHA_RE
}
