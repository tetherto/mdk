#!/usr/bin/env node
// Lockfile coverage. Every tracked package.json must belong to exactly one lockfile: either it is a
// lockfile root (a package-lock.json sits beside it), or the nearest lockfile above it lists it in
// its `packages` map (a workspace member or a file: dependency). A package that neither covers is
// never installed by anything, and CI's install steps only ever run at a lockfile root.
//
// Usage: npm run check:lockfiles
//
// Prints one line per uncovered package and exits 1 if there are any.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT, lockDirs, trackedFiles } from './release/lib.mjs'

// Manifests that are not installable packages. Keep this list short and give every entry a reason.
const IGNORED = [
  // Scaffold templates copied out by `mdk create`; they are installed in the generated project.
  'packages/cli/templates/',
]

export function findUncovered(cwd = REPO_ROOT) {
  const manifests = trackedFiles('*package.json', cwd)
    .filter((file) => path.basename(file) === 'package.json')
    .filter((file) => !IGNORED.some((prefix) => file.startsWith(prefix)))
  const manifestDirs = new Set(manifests.map((file) => path.dirname(file)))
  const locks = new Map()
  const lockFor = (dir) => {
    if (!locks.has(dir)) locks.set(dir, JSON.parse(fs.readFileSync(path.join(cwd, dir, 'package-lock.json'), 'utf8')))
    return locks.get(dir)
  }

  const problems = []
  // A lockfile with no package.json beside it locks nothing; npm leaves one behind when it is run in
  // a directory that is not a package. It is not a root, so it cannot cover anything below it.
  const roots = new Set()
  for (const dir of lockDirs(cwd)) {
    if (manifestDirs.has(dir)) roots.add(dir)
    else problems.push(`${path.join(dir, 'package-lock.json')} has no package.json beside it, so it locks nothing. Delete it.`)
  }

  for (const file of manifests) {
    const dir = path.dirname(file)
    if (roots.has(dir)) continue

    let root = path.dirname(dir)
    while (!roots.has(root) && root !== '.') root = path.dirname(root)
    if (!roots.has(root)) {
      problems.push(`${dir} has a package.json but no package-lock.json, and no lockfile above it`)
      continue
    }
    if (!lockFor(root).packages?.[path.relative(root, dir)]) {
      problems.push(`${dir} has a package.json but no package-lock.json, and ${path.join(root, 'package-lock.json')} does not cover it. ` +
        'Add it to that lockfile\'s workspaces or file: dependencies, or give it its own lockfile.')
    }
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = findUncovered()
  for (const p of problems) console.error(`::error::${p}`)
  console.log(problems.length ? `check:lockfiles FAILED (${problems.length} problem(s))` : 'check:lockfiles OK')
  process.exit(problems.length ? 1 : 0)
}
