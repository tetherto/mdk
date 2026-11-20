'use strict'

import { execFileSync } from 'node:child_process'

// Shared by every docs-QA checker that needs "every git-tracked .md file":
// tracked files only, so a local run matches what a clean CI checkout sees
// (a gitignored scratch file or stray node_modules markdown never appears).
export function listTrackedMarkdown (cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd, encoding: 'utf8' })
  return out.split('\n').filter(Boolean)
}

// Every git-tracked path, for checks that must resolve a target that is not
// Markdown (a LICENSE, a .json, a directory). Same tracked-only rule as above.
export function listTrackedFiles (cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files'], { cwd, encoding: 'utf8' })
  return out.split('\n').filter(Boolean)
}
