/* eslint-disable no-console */
/**
 * Enforces the USAGE.md contract: a component's `USAGE.md` is summary + notes +
 * examples only. Prop tables are generated from the TypeScript types (the
 * registry SSOT), so a hand-authored prop table in USAGE.md is drift waiting to
 * happen — it is thrown away at docs-build and can silently diverge from the types.
 *
 * Pre-existing prop tables live in `usage-proptable-baseline.json` and are
 * reported as `debt` (warnings). A prop table in a USAGE.md NOT in the baseline
 * fails the check. The baseline only shrinks as components are migrated and
 * stripped; PRs that grow it must fail CI.
 *
 * Flags:
 *   --update-baseline  Rewrite the baseline to match current violations.
 *   --no-baseline      Treat every prop table as an error.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BEGIN_RE, END_RE } from './generate-usage-proptables.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = join(SCRIPT_DIR, '..')
const SRC_DIR = join(PACKAGE_DIR, 'src')
const BASELINE_PATH = join(SCRIPT_DIR, 'usage-proptable-baseline.json')

const args = new Set(process.argv.slice(2))
const updateBaseline = args.has('--update-baseline')
const ignoreBaseline = args.has('--no-baseline')

function findUsageFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findUsageFiles(full))
    else if (entry.name === 'USAGE.md') out.push(full)
  }
  return out
}

// Column-name shapes that mark a markdown table as a prop/config table: a
// name-ish first-ish column paired with a type column. Catches `Prop | Type`,
// `Name | Type`, `Property | Type | Default`, etc. — not just a literal `Prop` header.
const NAME_COL = /^(?:props?|propert(?:y|ies)|names?|attributes?|options?|fields?)$/i
const TYPE_COL = /^type(?:\s*\/\s*options)?$/i

// Generated props tables (written by generate-usage-proptables.mjs from the
// registry SSOT) live between BEGIN/END GENERATED markers and are exempt: they
// cannot drift by hand without docs-freshness flagging the diff. Everything
// outside the markers is checked as before. A lone BEGIN or END marker is a
// hard error — a silent skip would exempt the rest of the file. So is more
// than one region: the generator only ever writes and maintains one, so a
// second (e.g. a hand-copied duplicate) would otherwise be exempted forever.
function stripGeneratedRegions(content, file) {
  const begins = (content.match(new RegExp(BEGIN_RE.source, 'gm')) ?? []).length
  const ends = (content.match(new RegExp(END_RE.source, 'gm')) ?? []).length
  if (begins !== ends) {
    console.error(`✗ [usage-prop-table] ${file}: unbalanced BEGIN/END GENERATED markers (${begins} BEGIN, ${ends} END)`)
    process.exit(1)
  }
  if (begins > 1) {
    console.error(`✗ [usage-prop-table] ${file}: ${begins} generated regions — only one is allowed per USAGE.md. Remove the extra region(s); \`npm run generate:usage-proptables\` maintains the one that remains.`)
    process.exit(1)
  }
  return content.replace(
    new RegExp(`${BEGIN_RE.source}[\\s\\S]*?${END_RE.source}`, 'gm'),
    '',
  )
}

// A USAGE.md "has a prop table" if it declares a Props heading (`## Props`,
// `## `X` props`, `#### `X` props`) or contains a markdown table whose header row
// has both a name-ish column and a type column. Split checks (not one
// `\s+.*\b…\b` regex) avoid super-linear backtracking.
function hasPropTable(content) {
  return content.split('\n').some((line) => {
    const trimmed = line.trim()
    if (/^#{1,6}\s/.test(trimmed) && /props$/i.test(trimmed)) return true
    if (!trimmed.startsWith('|')) return false
    const cells = trimmed.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    return cells.some((c) => NAME_COL.test(c)) && cells.some((c) => TYPE_COL.test(c))
  })
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return new Set()
  return new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).violations ?? [])
}

const violations = findUsageFiles(SRC_DIR)
  .filter((f) => {
    const rel = relative(PACKAGE_DIR, f).split('\\').join('/')
    return hasPropTable(stripGeneratedRegions(readFileSync(f, 'utf8'), rel))
  })
  .map(f => relative(PACKAGE_DIR, f).split('\\').join('/'))
  .sort()

if (updateBaseline) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      description: 'USAGE.md files that still carry a prop-style table or Props heading. These are intentional: either the component is not emitted to the registry (USAGE is its only reference), or the table is supplementary content the generated props reference does not capture (object-prop shapes, allowed values, ref methods, passthrough props) and is fronted by a source-of-truth note. Prop facts the registry already covers must NOT reappear here. Only `--update-baseline` writes this file; PRs that grow it MUST fail CI.',
      violations,
    }, null, 2)}\n`,
    'utf8',
  )
  console.log(`✓ Baseline updated: ${violations.length} USAGE.md files with prop tables.`)
  process.exit(0)
}

const baseline = ignoreBaseline ? new Set() : loadBaseline()
const newViolations = violations.filter(v => !baseline.has(v))
const debt = violations.filter(v => baseline.has(v))

for (const v of newViolations) {
  console.log(`✗ [usage-prop-table] ${v}`)
  console.log('    fix: remove the prop table — the docs site generates it from your types. Put defaults/descriptions in each prop\'s JSDoc (`@default`, summary).')
}
console.log(`\nSummary — USAGE.md with prop tables: ${violations.length} | new: ${newViolations.length} | debt (baselined): ${debt.length}`)
if (newViolations.length) process.exit(1)
