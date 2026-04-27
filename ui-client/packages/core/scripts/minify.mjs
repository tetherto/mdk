#!/usr/bin/env node
/* eslint-disable no-console */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { minify } from 'terser'

/**
 * Recursively find all .js files in a directory
 */
function findJSFiles(dir, files = []) {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      findJSFiles(fullPath, files)
    } else if (extname(entry) === '.js') {
      files.push(fullPath)
    }
  }

  return files
}

async function minifyFiles(dir) {
  const files = findJSFiles(dir)
  console.log(`🔥 Minifying ${files.length} JS files with Terser...`)

  let totalOriginal = 0
  let totalMinified = 0

  for (const file of files) {
    const code = readFileSync(file, 'utf8')
    const originalSize = code.length
    totalOriginal += originalSize

    try {
      const result = await minify(code, {
        module: true,
        compress: {
          dead_code: true,
          drop_console: false,
          drop_debugger: true,
          pure_funcs: [],
          passes: 2,
        },
        mangle: {
          toplevel: false,
          reserved: [],
        },
        format: {
          comments: false,
          ecma: 2020,
        },
      })

      if (result.code) {
        writeFileSync(file, result.code, 'utf8')
        const newSize = result.code.length
        totalMinified += newSize
        const saved = originalSize - newSize
        const pct = ((saved / originalSize) * 100).toFixed(1)
        console.log(`  ✓ ${file.replace(`${dir}/`, '')} (-${(saved / 1024).toFixed(1)}KB, ${pct}%)`)
      }
    } catch (error) {
      console.error(`  ✗ ${file} failed:`, error.message)
    }
  }

  const totalSaved = totalOriginal - totalMinified
  const totalPct = ((totalSaved / totalOriginal) * 100).toFixed(1)
  console.log(
    `\n✅ Total: ${(totalOriginal / 1024).toFixed(1)}KB → ${(totalMinified / 1024).toFixed(1)}KB`,
  )
  console.log(`💾 Saved: ${(totalSaved / 1024).toFixed(1)}KB (${totalPct}%)`)
}

const distDir = process.argv[2] || 'dist'
await minifyFiles(distDir)
