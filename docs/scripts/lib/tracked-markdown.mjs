'use strict'

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

// Shared by every docs-QA checker that needs "every git-tracked .md file":
// tracked files only, so a local run matches what a clean CI checkout sees
// (a gitignored scratch file or stray node_modules markdown never appears).
// A tracked file deleted in the working tree is left out too: the commit that
// deletes it won't have it either, and reading it would throw ENOENT.
export function listTrackedMarkdown (cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd, encoding: 'utf8' })
  return out.split('\n').filter((file) => file && existsSync(path.join(cwd, file)))
}
