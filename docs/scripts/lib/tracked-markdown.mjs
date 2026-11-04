'use strict'

import { execFileSync } from 'node:child_process'

// Shared by every docs-QA checker that needs "every git-tracked .md file":
// tracked files only, so a local run matches what a clean CI checkout sees
// (a gitignored scratch file or stray node_modules markdown never appears).
export function listTrackedMarkdown (cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd, encoding: 'utf8' })
  return out.split('\n').filter(Boolean)
}
