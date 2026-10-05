/* eslint-disable no-console */
/**
 * Writes a generated `## Props` section into each agent-ready component's
 * USAGE.md, between BEGIN/END GENERATED markers, from `dist/registry.json`
 * (itself generated from the component's JSDoc/types — the SSOT). Run
 * `npm run build:registry` first; `npm run generate:usage-proptables` from
 * this package, or `npm run regenerate-docs` from the repo root, do both.
 *
 * The table shape mirrors the docs site's renderer
 * (mdk-docs scripts/process-ui-manifests.ts, generateComponentsSnippet):
 * `| Prop | Status | Type / Options | Default | Description |`, required
 * props first then alphabetical, newlines collapsed and pipes escaped.
 * Keep the two in step — readers see one table in-repo and one on the site,
 * and they must never disagree in shape.
 *
 * Everything between the markers is owned by this script: hand edits there
 * are reverted on the next run (docs-freshness flags them as a diff).
 * Hand-authored supplementary sections (`… Props detail`) live OUTSIDE the
 * markers and are never touched. The docs site strips the exact `## Props`
 * section and the marker lines when it ingests USAGE.md prose, so this block
 * never double-renders there.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = join(SCRIPT_DIR, '..')
const REGISTRY_PATH = join(PACKAGE_DIR, 'dist', 'registry.json')

const BEGIN_MARKER
  = '<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->'
const END_MARKER = '<!-- END GENERATED: props -->'
// Any BEGIN/END GENERATED line counts as a marker when locating an existing
// region, so an older marker text is replaced rather than duplicated. Exported
// so check-usage-proptables.mjs recognises exactly what this script writes.
export const BEGIN_RE = /^<!-- BEGIN GENERATED: props\b.*-->$/m
export const END_RE = /^<!-- END GENERATED: props\b.*-->$/m

// Mirrors mdk-docs escapePipes: collapse newlines (a multi-line value breaks
// the one-line-per-row table format), then escape backslashes, then pipes.
const escapePipes = text =>
  text.replace(/\s*\n\s*/g, ' ').replace(/\\/g, '\\\\').replace(/\|/g, '\\|')

const fullText = item => item.descriptionFull || item.description || ''

function renderTable(props) {
  const lines = [
    '| Prop | Status | Type / Options | Default | Description |',
    '|------|--------|----------------|---------|-------------|',
  ]
  // Required props first, then optional, each group alphabetical by name.
  const ordered = [...props].sort((a, b) =>
    a.required === b.required ? a.name.localeCompare(b.name) : a.required ? -1 : 1,
  )
  for (const prop of ordered) {
    const status = prop.required ? 'Required' : 'Optional'
    // A prose default with embedded backticks (e.g. "toggles `actionsStore` sidebar")
    // would terminate the wrapping code span (markdownlint MD038); swap them out.
    const def = prop.default ? `\`${escapePipes(prop.default).replace(/`/g, "'")}\`` : '-'
    const desc = escapePipes(fullText(prop)) || '-'
    lines.push(`| \`${prop.name}\` | ${status} | \`${escapePipes(prop.type)}\` | ${def} | ${desc} |`)
  }
  return lines.join('\n')
}

function renderBlock(components) {
  const parts = [BEGIN_MARKER, '## Props', '']
  if (components.length === 1) {
    parts.push(renderTable(components[0].props))
  } else {
    const named = [...components].sort((a, b) => a.name.localeCompare(b.name))
    for (const c of named) {
      parts.push(`### \`${c.name}\` props`, '', renderTable(c.props), '')
    }
    parts.pop() // drop the trailing blank line inside the block
  }
  parts.push(END_MARKER)
  return parts.join('\n')
}

/**
 * Offset of the first `## ` heading OUTSIDE any fenced code block, or -1.
 * A USAGE.md that quotes markdown inside ``` fences must not capture the
 * insertion anchor.
 */
function firstH2Offset(content) {
  let offset = 0
  let inFence = false
  for (const line of content.split(/(?<=\n)/)) {
    const trimmed = line.trim()
    if (/^(?:`{3,}|~{3,})/.test(trimmed)) inFence = !inFence
    else if (!inFence && line.startsWith('## ')) return offset
    offset += line.length
  }
  return -1
}

/** Replace the marked region, or insert the block before the first `## ` heading (EOF fallback). */
function upsertBlock(content, block, file) {
  const begin = content.match(BEGIN_RE)
  const end = content.match(END_RE)
  if (begin && !end) throw new Error(`${file}: BEGIN GENERATED marker without END marker`)
  if (!begin && end) throw new Error(`${file}: END GENERATED marker without BEGIN marker`)
  // Only one region per file: this function replaces the first, so a second
  // (e.g. hand-copied) region would survive every regeneration as "current".
  const begins = (content.match(new RegExp(BEGIN_RE.source, 'gm')) ?? []).length
  if (begins > 1) throw new Error(`${file}: ${begins} generated regions — only one is allowed per USAGE.md`)
  if (begin && end) {
    const from = begin.index
    const to = end.index + end[0].length
    if (to <= from) throw new Error(`${file}: END GENERATED marker precedes BEGIN marker`)
    return content.slice(0, from) + block + content.slice(to)
  }
  const anchor = firstH2Offset(content)
  if (anchor !== -1) {
    return `${content.slice(0, anchor)}${block}\n\n${content.slice(anchor)}`
  }
  return `${content.replace(/\n*$/, '')}\n\n${block}\n`
}

function main() {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(
      `✗ ${relative(PACKAGE_DIR, REGISTRY_PATH)} not found. Run \`npm run build:registry\` first `
      + '(through turbo on a fresh checkout, so sibling packages are built).',
    )
    process.exit(1)
  }
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))

  const byUsageDoc = new Map()
  for (const c of registry.components) {
    if (c.tier !== 'agent-ready' || !c.usageDoc || !c.props?.length) continue
    if (!byUsageDoc.has(c.usageDoc)) byUsageDoc.set(c.usageDoc, [])
    byUsageDoc.get(c.usageDoc).push(c)
  }

  let written = 0
  let unchanged = 0
  const missing = []
  for (const [usageDoc, components] of [...byUsageDoc.entries()].sort()) {
    const path = join(PACKAGE_DIR, usageDoc)
    if (!existsSync(path)) {
      missing.push(usageDoc)
      continue
    }
    const content = readFileSync(path, 'utf8')
    const next = upsertBlock(content, renderBlock(components), usageDoc)
    if (next === content) {
      unchanged += 1
    } else {
      writeFileSync(path, next, 'utf8')
      written += 1
    }
  }

  for (const m of missing) console.error(`✗ registry names a USAGE.md that does not exist: ${m}`)
  console.log(
    `✓ Props tables for ${[...byUsageDoc.values()].flat().length} components across `
    + `${byUsageDoc.size} USAGE.md files — ${written} written, ${unchanged} already current.`,
  )
  if (missing.length) process.exit(1)
}

// Only run when invoked directly, so the checker can import the marker regexes
// without generating anything as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
