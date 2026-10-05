#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Rewrite tsconfig `paths` aliases (`@primitives`, `@domain/*`) in compiled
 * `dist/` output to relative specifiers.
 *
 * tsc type-checks against `paths` but emits the specifiers verbatim, so a
 * published `dist/` would still import `@primitives`, which no consumer can
 * resolve. Each aliased specifier in `.js` and `.d.ts` output is rewritten to
 * a relative path to the target's emitted file: a module resolves to
 * `<file>.js` and a directory to `<dir>/index.js`. Relative specifiers are
 * left alone.
 *
 * Replaces `tsc-alias`, whose chokidar@3 / globby dependency chain pulls in
 * `braces` (GHSA-vfj7-8cjw-p6xm, no patched release). Idempotent: once
 * rewritten, a file contains no aliased specifiers.
 *
 * Usage: node scripts/resolve-path-aliases.mjs [tsconfig.build.json]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const SOURCE_EXTENSIONS = ['.ts', '.tsx']

const loadConfig = (configPath) => {
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, dirname(configPath))
  const outDir = options.outDir
  const rootDir = options.rootDir
  if (!outDir || !rootDir) throw new Error(`${configPath} must set outDir and rootDir`)
  const pathsBase = options.pathsBasePath ?? dirname(configPath)
  const aliases = Object.entries(options.paths ?? {}).map(([pattern, [target]]) => ({
    wildcard: pattern.endsWith('/*'),
    prefix: pattern.replace(/\*$/, ''),
    target: resolve(pathsBase, target.replace(/\*$/, '')),
  }))
  return { outDir, rootDir, aliases }
}

// Resolve an aliased specifier to its source module path (without extension
// handling for the emitted file — that happens in toOutputSpecifier).
const resolveAlias = (specifier, aliases) => {
  for (const { wildcard, prefix, target } of aliases) {
    if (wildcard ? specifier.startsWith(prefix) : specifier === prefix) {
      return wildcard ? join(target, specifier.slice(prefix.length)) : target
    }
  }
  return null
}

const findSourceModule = (base) => {
  for (const ext of SOURCE_EXTENSIONS) {
    if (existsSync(base + ext)) return { file: base, isIndex: false }
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const ext of SOURCE_EXTENSIONS) {
      if (existsSync(join(base, `index${ext}`))) return { file: join(base, 'index'), isIndex: true }
    }
  }
  return null
}

const toOutputSpecifier = (fromOutFile, sourceModule, { outDir, rootDir }) => {
  const sourceDirOfOut = join(rootDir, relative(outDir, dirname(fromOutFile)))
  let rel = relative(sourceDirOfOut, sourceModule.file).split(sep).join('/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return `${rel}.js`
}

const findOutputFiles = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) findOutputFiles(full, acc)
    else if (entry.endsWith('.d.ts') || extname(entry) === '.js') acc.push(full)
  }
  return acc
}

const resolvePathAliases = (configPath) => {
  const config = loadConfig(configPath)
  const prefixes = config.aliases.map(({ prefix }) => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // Specifiers in `from '…'`, `import '…'`, `import('…')` and `require('…')`.
  const specifierPattern = new RegExp(
    `((?:\\bfrom|\\bimport|\\brequire)\\s*\\(?\\s*)(['"])((?:${prefixes.join('|')})[^'"]*)\\2`,
    'g',
  )

  const files = findOutputFiles(config.outDir)
  let rewritten = 0
  let touchedFiles = 0
  const unresolved = new Set()

  for (const file of files) {
    const code = readFileSync(file, 'utf8')
    const next = code.replace(specifierPattern, (match, lead, quote, specifier) => {
      const base = resolveAlias(specifier, config.aliases)
      const sourceModule = base && findSourceModule(base)
      if (!sourceModule) {
        unresolved.add(specifier)
        return match
      }
      rewritten += 1
      return `${lead}${quote}${toOutputSpecifier(file, sourceModule, config)}${quote}`
    })
    if (next !== code) {
      touchedFiles += 1
      writeFileSync(file, next, 'utf8')
    }
  }

  console.log(
    `🔗 Rewrote ${rewritten} path-alias imports in ${touchedFiles}/${files.length} files in ${relative(process.cwd(), config.outDir) || '.'}`,
  )
  if (unresolved.size > 0) {
    console.error(`Unresolved path aliases: ${[...unresolved].join(', ')}`)
    process.exitCode = 1
  }
}

resolvePathAliases(resolve(process.argv[2] ?? 'tsconfig.build.json'))
