#!/usr/bin/env node
// Regenerates the generated `## Props` sections in the devkit's USAGE.md files.
//
// Source of truth: the component JSDoc/types, via ui/packages/react-devkit/dist/registry.json.
// The actual generator lives with the devkit (scripts/generate-usage-proptables.mjs); this wrapper
// exists so `npm run regenerate-docs` and a repo-root `npm run generate:usage-proptables` get the
// same registry build and prerequisite handling as sync-ui-registry.mjs (EXIT_PREREQUISITE on a
// docs-only checkout, turbo so sibling dist/ types exist).

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ensureDevkitRegistry } from './sync-ui-registry.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEVKIT = path.resolve(HERE, '../../ui/packages/react-devkit')

ensureDevkitRegistry()

const gen = spawnSync('node', ['scripts/generate-usage-proptables.mjs'], {
  cwd: DEVKIT,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})
if (gen.error) {
  console.error(`[generate-usage-proptables] could not run the generator: ${gen.error.message}`)
  process.exit(1)
}
process.exit(gen.status ?? 1)
