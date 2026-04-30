#!/usr/bin/env node
/* eslint-disable no-console */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Post-build pipeline for @tetherto/mdk-foundation-ui.
 *
 * tsc emits .js/.d.ts but does not:
 *   1. Copy binary assets (.mp3, images, fonts, ...) referenced via
 *      `import x from './foo.mp3'`. Bundlers in consumer apps need
 *      the assets to live alongside the JS.
 *   2. Strip side-effect SCSS imports (`import './foo.scss'`). These
 *      come from per-component co-location in src/, but at publish time
 *      every component's styles are already aggregated into the single
 *      dist/styles.css produced by Vite. Leaving the .scss imports in
 *      dist/*.js makes Rollup-based consumers fail to resolve them
 *      (the .scss files are not shipped, and shouldn't be).
 *
 * This script runs after `tsc` and `vite build` have produced dist/.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')
const SRC = join(PKG_ROOT, 'src')
const DIST = join(PKG_ROOT, 'dist')

const ASSET_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
])

/** Recursively walk a directory and yield every file path. */
function walk(dir, results = []) {
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) walk(fullPath, results)
    else results.push(fullPath)
  }
  return results
}

if (!existsSync(DIST)) {
  console.error('[postbuild] dist/ does not exist. Run build:ts and build:scss first.')
  process.exit(1)
}

// 1. Copy binary assets from src/ into the mirrored location in dist/.
const assets = walk(SRC).filter((p) => ASSET_EXTENSIONS.has(extname(p).toLowerCase()))
for (const srcPath of assets) {
  const rel = relative(SRC, srcPath)
  const destPath = join(DIST, rel)
  mkdirSync(dirname(destPath), { recursive: true })
  cpSync(srcPath, destPath)
  console.log(`[postbuild] asset: ${rel}`)
}
console.log(`[postbuild] copied ${assets.length} asset(s).`)

// 2. Strip side-effect SCSS imports from dist/ JS and .d.ts files.
//    Matches both `import './foo.scss'` and `import "./foo.scss"`,
//    with optional trailing semicolon, on its own line.
const SCSS_IMPORT_RE = /^\s*import\s+['"][^'"]+\.scss['"];?\s*\n/gm

let strippedFiles = 0
let strippedLines = 0
for (const file of walk(DIST)) {
  const ext = extname(file)
  if (ext !== '.js' && ext !== '.ts') continue
  const before = readFileSync(file, 'utf8')
  const matches = before.match(SCSS_IMPORT_RE)
  if (!matches) continue
  const after = before.replace(SCSS_IMPORT_RE, '')
  writeFileSync(file, after)
  strippedFiles += 1
  strippedLines += matches.length
}
console.log(`[postbuild] stripped ${strippedLines} .scss import(s) across ${strippedFiles} file(s).`)
