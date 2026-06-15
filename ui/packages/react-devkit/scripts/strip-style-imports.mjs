#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Strip side-effect `.scss` and `.css` imports from compiled JS in `dist/`.
 *
 * Source files use `import "./foo.scss"` so a consuming Vite/webpack build
 * can pull each component's styles transparently. When we publish a pre-built
 * package, the bundled `dist/styles.css` already contains every component's
 * styles, so those side-effect imports are both redundant and unresolvable
 * (we ship JS only, not the SCSS sources).
 *
 * This script walks `dist/` and removes those import lines from `.js` files,
 * leaving everything else untouched.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const STYLE_IMPORT = /^\s*import\s+['"][^'"]+\.(?:scss|css)['"];?\s*$\n?/gm

const findJsFiles = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) findJsFiles(full, acc)
    else if (extname(entry) === '.js') acc.push(full)
  }
  return acc
}

const stripStyleImports = (dir) => {
  const files = findJsFiles(dir)
  let stripped = 0
  let touchedFiles = 0

  for (const file of files) {
    const code = readFileSync(file, 'utf8')
    const next = code.replace(STYLE_IMPORT, '')
    if (next !== code) {
      const matches = code.match(STYLE_IMPORT)
      stripped += matches ? matches.length : 0
      touchedFiles += 1
      writeFileSync(file, next, 'utf8')
    }
  }

  console.log(
    `🎨 Stripped ${stripped} style imports from ${touchedFiles}/${files.length} files in ${dir}`,
  )
}

const distDir = process.argv[2] ?? 'dist'
stripStyleImports(distDir)
