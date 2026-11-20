import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { findUncovered } from '../scripts/check-lockfile-coverage.mjs'

// A scratch git repo: the check reads tracked files only, so every fixture file is committed to the index.
function repo(files) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'lockfile-coverage-'))
  for (const [file, json] of Object.entries(files)) {
    fs.mkdirSync(path.join(cwd, path.dirname(file)), { recursive: true })
    fs.writeFileSync(path.join(cwd, file), JSON.stringify(json))
  }
  execFileSync('git', ['init', '-q'], { cwd })
  execFileSync('git', ['add', '.'], { cwd })
  return cwd
}

const lock = (...members) => ({ lockfileVersion: 3, packages: Object.fromEntries(['', ...members].map((m) => [m, {}])) })

test('a workspace member listed in the root lockfile is covered', () => {
  const cwd = repo({
    'package.json': {},
    'package-lock.json': lock('backend/core/kernel'),
    'backend/core/kernel/package.json': {},
  })
  assert.deepEqual(findUncovered(cwd), [])
})

test('a package.json no lockfile lists is reported, naming the directory and the lockfile', () => {
  const cwd = repo({
    'package.json': {},
    'package-lock.json': lock(),
    'backend/orphan/package.json': {},
  })
  const problems = findUncovered(cwd)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^backend\/orphan has a package\.json but no package-lock\.json, and package-lock\.json does not cover it/)
})

test('a nested lockfile root covers its own members, not the root lockfile', () => {
  const cwd = repo({
    'package.json': {},
    'package-lock.json': lock(),
    'ui/package.json': {},
    'ui/package-lock.json': lock('packages/foundation'),
    'ui/packages/foundation/package.json': {},
  })
  assert.deepEqual(findUncovered(cwd), [])
})

test('a lockfile root that loses its lockfile is reported against the lockfile above it', () => {
  const cwd = repo({
    'package.json': {},
    'package-lock.json': lock(),
    'ui/package.json': {},
  })
  assert.match(findUncovered(cwd)[0], /^ui has a package\.json but no package-lock\.json/)
})

test('a lockfile with no package.json beside it is reported and does not shadow the root', () => {
  const cwd = repo({
    'package.json': {},
    'package-lock.json': lock('packages/cli'),
    'packages/package-lock.json': lock(),
    'packages/cli/package.json': {},
  })
  assert.deepEqual(findUncovered(cwd), [
    'packages/package-lock.json has no package.json beside it, so it locks nothing. Delete it.',
  ])
})

test('scaffold templates are not installable packages and are skipped', () => {
  const cwd = repo({
    'package.json': {},
    'package-lock.json': lock(),
    'packages/cli/templates/app/package.json': {},
  })
  assert.deepEqual(findUncovered(cwd), [])
})
