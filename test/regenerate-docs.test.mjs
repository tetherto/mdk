import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { verdict, EXIT_STALE, TARGETS } from '../docs/scripts/regenerate-docs.mjs'
import { outputPaths } from '../docs/scripts/generate-api-reference.mjs'

// Two kinds of assertion live here. verdict() is pure and imported directly, which covers the
// exit-code precedence without a generator or a devkit build. The argument guard is spawned,
// because it belongs to main(); it runs before any generator, so those assertions cost nothing.
// Everything else past the guard fetches partner contracts over the network and runs a turbo
// build, so it stays out of this file.
const SCRIPT = fileURLToPath(new URL('../docs/scripts/regenerate-docs.mjs', import.meta.url))
// docs/scripts -> docs -> repo root. The script resolves its own root from import.meta.url, so this
// only sets the spawn's cwd, but a wrong one here would mislead the next person to copy this file.
const REPO_ROOT = path.dirname(path.dirname(path.dirname(SCRIPT)))

const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO_ROOT, encoding: 'utf8' })

test('an unrecognised argument exits 1 and regenerates nothing', () => {
  const res = run('--bogus')

  assert.equal(res.status, 1)
  assert.match(res.stderr, /unrecognised argument\(s\): --bogus/)
  assert.doesNotMatch(res.stdout, /regenerating generated pages/)
})

test('--allow-skip is recognised, so the guard cannot silently drop it', () => {
  const res = run('--allow-skip', '--bogus')

  assert.equal(res.status, 1)
  // Only --bogus is named: if --allow-skip stopped being recognised it would be listed here too.
  // Matched against that one line, not the whole of stderr, which also prints the usage string.
  const named = res.stderr.split('\n').find((l) => l.includes('unrecognised argument'))
  assert.equal(named, '[regenerate-docs] unrecognised argument(s): --bogus')
})

// The precedence is the contract: a failed generator outranks a target that could not run, which
// outranks a stale page. Each row names the outcome that must win, so reordering the branches in
// main() breaks a specific row rather than passing quietly.
const VERDICTS = [
  ['a clean run exits 0', {}, 0],
  ['a failed generator exits 1', { failed: 1 }, 1],
  ['a skipped target exits 1', { skipped: 1 }, 1],
  ['--allow-skip lets a skip exit 0', { skipped: 1, allowSkip: true }, 0],
  ['a stale page exits EXIT_STALE', { stale: 1 }, EXIT_STALE],
  // The row the extraction exists for: skipped-and-stale must not report staleness as the whole
  // verdict, because the skip means the run never covered every target.
  ['skipped and stale exits 1, not EXIT_STALE', { skipped: 1, stale: 1 }, 1],
  ['--allow-skip with stale pages exits EXIT_STALE', { skipped: 1, stale: 1, allowSkip: true }, EXIT_STALE],
  ['a failed generator outranks a stale page', { failed: 1, stale: 1 }, 1],
  ['a failed generator outranks --allow-skip', { failed: 1, skipped: 1, allowSkip: true }, 1]
]

for (const [name, input, expected] of VERDICTS) {
  test(`verdict: ${name}`, () => {
    assert.equal(verdict(input), expected)
  })
}

test('the api-reference target watches the generator\'s own output files', () => {
  const target = TARGETS.find((t) => t.key === 'api-reference')
  assert.deepEqual(target.paths, outputPaths())
})
