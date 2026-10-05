#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * SCSS lint: parse every package/app stylesheet with postcss-scss (a syntax
 * error fails the run) and ban relative `@use` paths into src/core from
 * foundation SCSS (react-devkit `src/domain/**`). Those stylesheets must use
 * `@use '@primitives/styles/...' as *;` instead.
 *
 * Replaces stylelint, which ran no rule except this one. Its micromatch →
 * braces dependency chain carries GHSA-vfj7-8cjw-p6xm, which has no patched
 * release.
 *
 * Usage: node scripts/lint-scss.mjs
 */
import { globSync, readFileSync } from 'node:fs'
import process from 'node:process'
import postcssScss from 'postcss-scss'

const FILE_GLOBS = ['packages/*/src/**/*.scss', 'apps/*/src/**/*.scss']
const NO_RELATIVE_CORE_USE_GLOB = 'packages/react-devkit/src/domain/**/*.scss'
const RELATIVE_CORE_PATH = /^(?:\.\.\/)+core(?:\/|$)/

const domainFiles = new Set(globSync(NO_RELATIVE_CORE_USE_GLOB))
const files = [...new Set(FILE_GLOBS.flatMap((pattern) => globSync(pattern)))].sort()
const problems = []

for (const file of files) {
  let root
  try {
    root = postcssScss.parse(readFileSync(file, 'utf8'), { from: file })
  } catch (error) {
    const { line = 1, column = 1 } = error
    problems.push({ file, line, column, message: error.reason ?? error.message })
    continue
  }
  if (!domainFiles.has(file)) continue

  root.walkAtRules('use', (atRule) => {
    const path = atRule.params.match(/^['"]([^'"]+)['"]/)?.[1] ?? ''
    if (RELATIVE_CORE_PATH.test(path)) {
      const { line, column } = atRule.source.start
      // Point at the path itself, as stylelint's `word` option did.
      const offset = atRule.toString().indexOf(path)
      problems.push({
        file,
        line,
        column: column + Math.max(offset, 0),
        message: `Use '@primitives/styles/...' instead of relative path "${path}"`,
      })
    }
  })
}

for (const { file, line, column, message } of problems) {
  console.error(`${file}:${line}:${column}  ✖  ${message}`)
}
if (problems.length > 0) {
  console.error(`\n✖ ${problems.length} problem(s) in ${files.length} SCSS files`)
  process.exitCode = 1
} else {
  console.log(`✔ ${files.length} SCSS files linted, 0 problems`)
}
