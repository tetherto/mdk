#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')

const DIST_DIR = 'dist'

// App scaffolding templates (mdk-ui create) and the docs rendering-component
// templates (mdk-ui docs:build) both ship verbatim under dist/ so the CLI can
// install them into a consuming project.
const TEMPLATE_DIRS = ['templates', 'templates-docs']

const COPIES = TEMPLATE_DIRS.map((name) => ({
  src: join(ROOT, name),
  dest: join(ROOT, DIST_DIR, name),
}))

for (const { src, dest } of COPIES) {
  if (!existsSync(src)) {
    console.warn(`No ${src} directory found — skipping copy.`)
    continue
  }
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.warn(`✓ Copied ${src} → ${dest}`)
}
