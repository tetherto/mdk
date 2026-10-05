/* eslint-disable no-console */
/**
 * Baseline monotonicity gate for `usage-proptable-baseline.json`.
 *
 * `check-usage-proptables.mjs` already trusts the committed baseline: a USAGE.md
 * prop table is "allowed debt" if its path is in the baseline. That makes the
 * baseline file itself the bypass — a pull request can legitimise a brand-new
 * prop table just by adding its path to the baseline, or hide one new violation
 * behind one removal (a swap) while the count stays flat.
 *
 * This script closes that hole by comparing the baseline's `violations` as SETS
 * between the PR base and head:
 *   - a path in head but not in base is an ADD  -> fail
 *   - a path in base but not in head is a REMOVE -> allowed (migration)
 *   - a swap (one add + one remove) fails, because it contains an add
 *   - missing or malformed baseline data on either side is an error
 *
 * It never compares array length or raw JSON text, so reordering or whitespace
 * churn is a no-op. The comparison is the testable part (`diffBaselines`); the
 * CLI only does file IO and reporting. The CI job feeds it the base copy via
 * `git show <base-sha>:<path>` and the head copy from the working tree.
 *
 * Usage:
 *   node check-usage-baseline-monotonic.mjs --base <base.json> --head <head.json>
 *
 * Exit codes: 0 = monotonic (only removals), 1 = one or more adds, 2 = the
 * base or head baseline could not be read or parsed.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const BASELINE_RELPATH = 'ui/packages/react-devkit/scripts/usage-proptable-baseline.json'

export class BaselineError extends Error {}

function parseViolations(label, raw) {
  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new BaselineError(`${label} baseline is not valid JSON: ${err.message}`)
  }
  const violations = data?.violations
  if (!Array.isArray(violations) || violations.some(p => typeof p !== 'string')) {
    throw new BaselineError(`${label} baseline is missing a valid "violations" string array`)
  }
  return new Set(violations)
}

/**
 * Pure set comparison of two baseline file contents.
 * @returns {{ added: string[], removed: string[] }} sorted path lists.
 */
export function diffBaselines(baseRaw, headRaw) {
  const base = parseViolations('base', baseRaw)
  const head = parseViolations('head', headRaw)
  const added = [...head].filter(p => !base.has(p)).sort()
  const removed = [...base].filter(p => !head.has(p)).sort()
  return { added, removed }
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') out.base = argv[++i]
    else if (argv[i] === '--head') out.head = argv[++i]
  }
  return out
}

function read(label, path) {
  try {
    return readFileSync(path, 'utf8')
  } catch (err) {
    throw new BaselineError(`${label} baseline could not be read at ${path}: ${err.message}`)
  }
}

function main() {
  const { base, head } = parseArgs(process.argv.slice(2))
  if (!base || !head) {
    console.error('usage: check-usage-baseline-monotonic.mjs --base <base.json> --head <head.json>')
    process.exit(2)
  }

  let added, removed
  try {
    ({ added, removed } = diffBaselines(read('base', base), read('head', head)))
  } catch (err) {
    if (err instanceof BaselineError) {
      console.log('### USAGE baseline monotonicity: error\n')
      console.log(`${err.message}`)
      process.exit(2)
    }
    throw err
  }

  const lines = ['### USAGE baseline monotonicity', '']
  if (added.length) {
    lines.push(`❌ ${added.length} new prop-table path(s) added to \`${BASELINE_RELPATH}\`:`, '')
    for (const p of added) lines.push(`- \`${p}\``)
    lines.push(
      '',
      'The baseline may only shrink. A new path here legitimises a new USAGE.md prop table or',
      'hides one new violation behind a removal. Remove the prop table from each file above',
      '(the docs site generates prop facts from the types), rather than baselining it.',
    )
  } else {
    lines.push(`✅ No prop-table paths added. Removed ${removed.length} path(s).`)
  }
  console.log(lines.join('\n'))
  process.exit(added.length ? 1 : 0)
}

// Run only as a CLI, not when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
