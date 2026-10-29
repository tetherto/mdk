// Holds the mdk-ui-component skill to the UI packages it teaches: every import in
// its code blocks is a real export, devkit imports use the package root, every
// prop on a devkit component is in the registry, every component, helper and
// constant it names in prose exists, and every relative link resolves. A rename in the packages fails here
// instead of in an agent's build.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(PKG_DIR, '..', '..')
const SKILL_DIR = path.join(PKG_DIR, 'src', 'skills', 'mdk-ui-component')
const DEVKIT_SRC = path.join(REPO_ROOT, 'ui', 'packages', 'react-devkit', 'src')
const ADAPTER_SRC = path.join(REPO_ROOT, 'ui', 'packages', 'react-adapter', 'src')
const FOUNDATION_SRC = path.join(REPO_ROOT, 'ui', 'packages', 'ui-foundation', 'src')
const SHELL_SRC = path.join(REPO_ROOT, 'examples', 'mdk-ui-shell-template', 'src')

const DEVKIT = '@tetherto/mdk-react-devkit'
const API_SURFACES = {
  '@tetherto/mdk-react-adapter': 'react-adapter.json',
  '@tetherto/mdk-ui-foundation': 'ui-foundation.json'
}
// Identifiers the skill names that belong to React, the router or React Query, not to MDK.
const NOT_MDK = new Set([
  'ComponentType',
  'Link',
  'useState',
  'useNavigate',
  'useParams',
  'useSearchParams',
  'queryKey',
  'placeholderData'
])

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const docs = walk(SKILL_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((file) => ({ file, rel: path.relative(SKILL_DIR, file), text: fs.readFileSync(file, 'utf8') }))

const registry = readJson(path.join(SKILL_DIR, 'references', 'ui-registry.json'))
const registryComponents = new Map(registry.components.map((c) => [c.name, c]))
const registryNames = new Set([...registry.components, ...registry.hooks, ...registry.types].map((e) => e.name))

const surfaces = Object.fromEntries(
  Object.entries(API_SURFACES).map(([pkg, file]) => [
    pkg,
    readJson(path.join(REPO_ROOT, 'ui', 'api-surface', file)).entrypoints
  ])
)

const sourceText = (dir) =>
  walk(dir)
    .filter((f) => /\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n')
const devkitSource = sourceText(DEVKIT_SRC)
const shellSource = sourceText(SHELL_SRC)
const mdkSource = [devkitSource, sourceText(ADAPTER_SRC), sourceText(FOUNDATION_SRC)].join('\n')

const exportedFrom = (source, name) =>
  new RegExp(`export\\s+(?:declare\\s+)?(?:const|function|type|interface|class|enum)\\s+${name}\\b`).test(source) ||
  new RegExp(`export\\s+(?:type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}`).test(source)

/** A field of a type or object in the source, such as a prop (`headerAction`) or an option (`categoryTicksPadding`). */
const fieldIn = (source, name) => new RegExp(`\\b${name}\\??:`).test(source)

/** Declared at all, exported or not, such as the shell's `NAV_ICONS` that the skill has developers edit. */
const declaredIn = (source, name) =>
  new RegExp(`(?:const|function|type|interface|class|enum)\\s+${name}\\b`).test(source)

const isDevkitExport = (name) => registryNames.has(name) || exportedFrom(devkitSource, name)

const isSurfaceExport = (pkg, entry, name) => (surfaces[pkg][entry] ?? []).some((e) => e.name === name)

const isMdkExport = (name) =>
  isDevkitExport(name) ||
  Object.keys(surfaces).some((pkg) => Object.keys(surfaces[pkg]).some((entry) => isSurfaceExport(pkg, entry, name)))

const codeBlocks = docs.flatMap(({ rel, text }) =>
  [...text.matchAll(/```(?:ts|tsx)\n([\s\S]*?)```/g)].map((m) => ({ rel, code: m[1] }))
)

const importsOf = (code) =>
  [...code.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)].map((m) => ({
    from: m[2],
    names: m[1]
      .split(',')
      .map((n) => n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0])
      .filter(Boolean)
  }))

/** Attribute names written directly on each `<Name ...>` tag, skipping anything inside `{...}`. */
function propsOf (code, name) {
  const found = []
  const open = new RegExp(`<${name}(?=[\\s/>])`, 'g')
  for (const m of code.matchAll(open)) {
    let depth = 0
    let attrs = ''
    for (let i = m.index + m[0].length; i < code.length; i++) {
      const ch = code[i]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) break
      if (depth === 0 && ch !== '}') attrs += ch
    }
    found.push(...[...attrs.matchAll(/(?:^|\s)([A-Za-z][\w-]*)(?==)/g)].map((a) => a[1]))
  }
  return found
}

/** Identifiers the skill's own examples define, such as ThingPanel or ThingView. */
const definedInExamples = new Set(
  codeBlocks.flatMap(({ code }) =>
    [...code.matchAll(/(?:const|type|function|interface)\s+([A-Za-z_]\w*)/g)].map((m) => m[1])
  )
)

const LOOKS_EXPORTED = /^(?:[A-Z][a-z]\w*|[a-z]+[A-Z]\w*|[A-Z][A-Z0-9]*_[A-Z0-9_]+)$/
const CONSTANT = /^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/

/**
 * Names in a doc's prose that read as exports: a backticked identifier such as `PeriodControl` or `downloadCsv`, or a
 * backticked call such as `scaleToUnit(value, POWER_W_SCALES)`, which names the function and any constant it is given.
 */
const namedInProse = (text) => {
  const prose = text.replace(/```[\s\S]*?```/g, '')
  return [...prose.matchAll(/`([A-Za-z_]\w*)(?:\(([^`]*)\))?`/g)]
    .flatMap(([, name, args = '']) => {
      const constants = [...args.replace(/'[^']*'/g, '').matchAll(/[A-Za-z_]\w*/g)]
        .map((m) => m[0])
        .filter((a) => CONSTANT.test(a))
      return [name, ...constants]
    })
    .filter((name) => LOOKS_EXPORTED.test(name))
}

describe('mdk-ui-component skill', () => {
  it('carries the suite frontmatter', () => {
    const skill = docs.find((d) => d.rel === 'SKILL.md').text
    assert.match(skill, /^---\nname: mdk-ui-component\n/)
    assert.match(skill, /\n {2}suite: mdk-developer-skill\n/)
    assert.match(skill, /\n {2}mdk_version: "\{\{MDK_VERSION\}\}"\n/)
    assert.match(skill, /\nargument-hint: "/)
  })

  it('imports only what the MDK packages export', () => {
    const missing = []
    for (const { rel, code } of codeBlocks) {
      for (const { from, names } of importsOf(code)) {
        const [pkg, entry] = from.startsWith('@tetherto/')
          ? [from.split('/').slice(0, 2).join('/'), from.split('/').slice(2).join('/')]
          : [from, '']
        for (const name of names) {
          if (pkg === DEVKIT && !isDevkitExport(name)) missing.push(`${rel}: ${name} from ${from}`)
          if (pkg in surfaces && !isSurfaceExport(pkg, entry ? `./${entry}` : '.', name)) {
            missing.push(`${rel}: ${name} from ${from}`)
          }
        }
      }
    }
    assert.deepEqual(missing, [])
  })

  it('imports the devkit from its root and React Query only through the adapter', () => {
    const wrong = codeBlocks.flatMap(({ rel, code }) =>
      importsOf(code)
        .filter(({ from }) => from.startsWith(`${DEVKIT}/`) || from.startsWith('@tanstack/'))
        .map(({ from }) => `${rel}: ${from}`)
    )
    assert.deepEqual(wrong, [])
  })

  it('passes devkit components only the props the registry lists', () => {
    const unknown = []
    for (const { rel, code } of codeBlocks) {
      const imports = importsOf(code)
      const importedElsewhere = new Set(imports.filter(({ from }) => from !== DEVKIT).flatMap(({ names }) => names))
      // A snippet with no import line, such as a lone `<ExportButton ... />`, is checked by tag name.
      const devkitNames = new Set([
        ...imports.filter(({ from }) => from === DEVKIT).flatMap(({ names }) => names),
        ...[...code.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]).filter((n) => !importedElsewhere.has(n))
      ])
      for (const name of devkitNames) {
        const entry = registryComponents.get(name)
        if (!entry) continue
        const known = new Set(entry.props.map((p) => p.name))
        for (const prop of propsOf(code, name)) {
          if (prop !== 'key' && !known.has(prop)) unknown.push(`${rel}: <${name} ${prop}>`)
        }
      }
    }
    assert.deepEqual(unknown, [])
  })

  it('names only components and exports that exist', () => {
    const unknown = []
    for (const { rel, text } of docs) {
      for (const name of namedInProse(text)) {
        if (NOT_MDK.has(name) || definedInExamples.has(name) || isMdkExport(name)) continue
        if (fieldIn(mdkSource, name) || declaredIn(shellSource, name) || fieldIn(shellSource, name)) continue
        unknown.push(`${rel}: ${name}`)
      }
    }
    assert.deepEqual([...new Set(unknown)], [])
  })

  it('links only to files that exist', () => {
    const broken = []
    for (const { file, rel, text } of docs) {
      for (const [, target] of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
        if (/^[a-z]+:/.test(target)) continue
        if (!fs.existsSync(path.resolve(path.dirname(file), target))) broken.push(`${rel}: ${target}`)
      }
    }
    assert.deepEqual(broken, [])
  })
})
