#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const SRC = join(ROOT, 'templates')
const DEST = join(ROOT, 'dist', 'templates')

if (!existsSync(SRC)) {
  console.warn('No templates/ directory found — skipping copy.')
  process.exit(0)
}

mkdirSync(dirname(DEST), { recursive: true })
cpSync(SRC, DEST, { recursive: true })
console.warn(`✓ Copied templates → ${DEST}`)
