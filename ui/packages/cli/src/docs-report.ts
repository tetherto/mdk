import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { CoverageReport } from './docs-coverage.js'
import type { DocsDataset, DriftReport } from './docs-data.js'
import { TIERS } from './registry-loader.js'
import { componentPageRel, hookPageRel, type ScaffoldResult, storePageRel } from './docs-scaffold.js'

/**
 * The doc-writer report: a deterministic, self-contained summary of what each
 * `docs:build` run changed and where the (non-technical) doc writer should spend
 * effort. Rendered to a single styled HTML page (open by double-clicking) and a
 * Markdown twin (for PR diffs). Everything is sorted; the only volatile value is
 * the `generatedAt` provenance stamp pulled from the dataset meta.
 */

export type ReportInput = {
  dataset: DocsDataset
  drift: DriftReport
  coverage?: CoverageReport
  scaffold?: ScaffoldResult
  /** Absolute docs-repo path, for scanning lingering references to removed names. */
  docsRepo: string
}

type Entry = { name: string; page: string }
type ChangedEntry = { name: string; page: string; fields: string[] }
type RemovedEntry = { name: string; references: string[] }

/** Normalised, fully-sorted report model — pure, so it snapshots deterministically. */
export type ReportData = {
  meta: DocsDataset['meta']
  totals: {
    componentsNew: number
    componentsChanged: number
    componentsRemoved: number
    hooksNew: number
    hooksChanged: number
    hooksRemoved: number
    storesNew: number
    storesChanged: number
    storesRemoved: number
    pagesCreated: number
    pagesUpdated: number
    pagesRemoved: number
  }
  newComponents: Entry[]
  newHooks: Entry[]
  newStores: Entry[]
  changedComponents: ChangedEntry[]
  changedHooks: ChangedEntry[]
  changedStores: ChangedEntry[]
  removedComponents: RemovedEntry[]
  removedHooks: RemovedEntry[]
  removedStores: RemovedEntry[]
  /** Generated component pages whose reference block will be sparse. */
  thinPages: Array<{ name: string; page: string; reason: string }>
  /** Undocumented surface flagged by the coverage report. */
  undocumented: { components: string[]; hooks: string[] }
  /** Hand-written pages the scaffolder refused to overwrite (name collisions). */
  collisions: string[]
}

// ─── Reference scanning ───────────────────────────────────────────────────────

const listMdx = (root: string): string[] => {
  const out: string[] = []
  if (!existsSync(root)) return out
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e)
      if (statSync(full).isDirectory()) walk(full)
      else if (full.endsWith('.mdx')) out.push(full)
    }
  }
  walk(root)
  return out
}

/** Find non-generated pages that still reference any of `names` (e.g. `name="Foo"`). */
const scanReferences = (docsRepo: string, names: string[]): Map<string, string[]> => {
  const result = new Map<string, string[]>(names.map((n) => [n, []]))
  if (names.length === 0) return result
  const contentRoot = join(docsRepo, 'content', 'docs')
  for (const file of listMdx(contentRoot)) {
    const text = readFileSync(file, 'utf8')
    if (text.includes('mdk:generated')) continue // skip our own pages
    const rel = relative(docsRepo, file).split('\\').join('/')
    for (const name of names) {
      if (text.includes(`name="${name}"`) || text.includes(`name='${name}'`)) {
        result.get(name)!.push(rel)
      }
    }
  }
  for (const [, files] of result) files.sort()
  return result
}

// ─── Build the normalised model ───────────────────────────────────────────────

export const buildReportData = (input: ReportInput): ReportData => {
  const { dataset, drift, coverage, scaffold } = input

  const version = dataset.meta.versionLabel
  const componentByName = new Map(dataset.components.map((c) => [c.name, c]))
  const hookByName = new Map(dataset.hooks.map((h) => [h.name, h]))

  const compPage = (name: string): string => {
    const c = componentByName.get(name)
    return c ? componentPageRel(c, version) : `(${name} — page unknown)`
  }
  const hookPage = (name: string): string => {
    const h = hookByName.get(name)
    return h ? hookPageRel(h, version) : `(${name} — page unknown)`
  }

  const removedComponentRefs = scanReferences(input.docsRepo, drift.components.removed)
  const removedHookRefs = scanReferences(input.docsRepo, drift.hooks.removed)

  // Only `agent-ready` components are contractually required to ship a USAGE.md
  // + examples (see AGENT_READY.md). `advanced` (and any other) tiers are
  // reference-only by design — the registry generator deliberately omits their
  // doc pointers — so flagging them as "sparse" is a false positive a doc
  // writer can never action. Restrict the sparse check to the tier that must
  // carry docs; a genuinely under-documented agent-ready page still surfaces.
  const thinPages = dataset.components
    .filter((c) => c.tier === TIERS.agentReady)
    .filter((c) => !c.usageFile || !(c.exampleFiles && c.exampleFiles.length))
    .map((c) => {
      const missing = [
        c.usageFile ? null : 'no USAGE.md',
        c.exampleFiles && c.exampleFiles.length ? null : 'no examples',
      ].filter(Boolean)
      return { name: c.name, page: componentPageRel(c, version), reason: missing.join(', ') }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    meta: dataset.meta,
    totals: {
      componentsNew: drift.components.added.length,
      componentsChanged: drift.components.changed.length,
      componentsRemoved: drift.components.removed.length,
      hooksNew: drift.hooks.added.length,
      hooksChanged: drift.hooks.changed.length,
      hooksRemoved: drift.hooks.removed.length,
      storesNew: drift.stores.added.length,
      storesChanged: drift.stores.changed.length,
      storesRemoved: drift.stores.removed.length,
      pagesCreated: scaffold?.created.length ?? 0,
      pagesUpdated: scaffold?.updated.length ?? 0,
      pagesRemoved: scaffold?.deleted.length ?? 0,
    },
    newComponents: drift.components.added.map((n) => ({ name: n, page: compPage(n) })),
    newHooks: drift.hooks.added.map((n) => ({ name: n, page: hookPage(n) })),
    newStores: drift.stores.added.map((n) => ({ name: n, page: storePageRel(n, version) })),
    changedComponents: drift.components.changed.map((c) => ({ name: c.name, page: compPage(c.name), fields: c.fields })),
    changedHooks: drift.hooks.changed.map((c) => ({ name: c.name, page: hookPage(c.name), fields: c.fields })),
    changedStores: drift.stores.changed.map((c) => ({ name: c.name, page: storePageRel(c.name, version), fields: c.fields })),
    removedComponents: drift.components.removed.map((n) => ({ name: n, references: removedComponentRefs.get(n) ?? [] })),
    removedHooks: drift.hooks.removed.map((n) => ({ name: n, references: removedHookRefs.get(n) ?? [] })),
    removedStores: drift.stores.removed.map((n) => ({ name: n, references: [] })),
    thinPages,
    undocumented: {
      components: coverage?.newComponents ?? [],
      hooks: coverage?.newHooks ?? [],
    },
    collisions: scaffold?.skipped ?? [],
  }
}

// ─── Rendering ─────────────────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Build the prioritised "where to focus" checklist. */
const focusItems = (d: ReportData): string[] => {
  const items: string[] = []
  const total = d.newComponents.length + d.newHooks.length + d.newStores.length
  if (total) items.push(`Write intro prose on ${total} new page(s) — the reference block is auto-rendered; add the "why/when".`)
  const changed = d.changedComponents.length + d.changedHooks.length + d.changedStores.length
  if (changed) items.push(`Skim ${changed} changed page(s) to confirm the surrounding prose still matches.`)
  const removed = d.removedComponents.filter((r) => r.references.length).length
  if (removed) items.push(`Fix ${removed} page(s) that still link to a removed component/hook.`)
  if (d.collisions.length) items.push(`Resolve ${d.collisions.length} name collision(s) — a hand-written page shares a generated name.`)
  if (d.thinPages.length) items.push(`Ask a developer to add USAGE.md / examples for ${d.thinPages.length} sparse page(s).`)
  if (!items.length) items.push('Nothing — the docs are in sync. 🎉')
  return items
}

const STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; background: #f6f7f9; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 13px; margin: 0 0 24px; }
  .sub code { background: #e9ebef; padding: 1px 5px; border-radius: 4px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 0 0 28px; }
  .card { background: #fff; border: 1px solid #e3e6ea; border-radius: 10px; padding: 14px 16px; }
  .card .n { font-size: 26px; font-weight: 700; }
  .card .l { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: .03em; }
  section { background: #fff; border: 1px solid #e3e6ea; border-radius: 10px; padding: 18px 20px; margin: 0 0 16px; }
  section h2 { margin: 0 0 12px; font-size: 17px; display: flex; align-items: center; gap: 8px; }
  .hint { color: #555; font-size: 13px; margin: -6px 0 12px; }
  ul.items { list-style: none; padding: 0; margin: 0; }
  ul.items li { padding: 7px 0; border-top: 1px solid #f0f1f3; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
  ul.items li:first-child { border-top: 0; }
  .name { font-weight: 600; }
  .path { color: #777; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .fields { font-size: 12px; color: #8a5a00; }
  .focus { background: #fffdf5; border-color: #f0e4bf; }
  .focus ol { margin: 0; padding-left: 20px; } .focus li { padding: 4px 0; }
  .empty { color: #888; font-style: italic; }
  .tag { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
  .tag.new { background: #e4f5e9; color: #1d7a3e; }
  .tag.chg { background: #fdf2dc; color: #8a5a00; }
  .tag.rm { background: #fbe3e3; color: #b1283a; }
  @media (prefers-color-scheme: dark) {
    body { color: #e6e6e6; background: #16181c; }
    .card, section { background: #1f2228; border-color: #2c3038; }
    .sub, .card .l, .hint, .path { color: #9aa0aa; }
    .sub code { background: #2c3038; }
    .focus { background: #221f15; border-color: #43391c; }
  }
`

const entryList = (entries: Entry[]): string =>
  entries.length
    ? `<ul class="items">${entries
        .map((e) => `<li><span class="name">${esc(e.name)}</span> <span class="path">${esc(e.page)}</span></li>`)
        .join('')}</ul>`
    : '<p class="empty">None.</p>'

const changedList = (entries: ChangedEntry[]): string =>
  entries.length
    ? `<ul class="items">${entries
        .map(
          (e) =>
            `<li><span class="name">${esc(e.name)}</span> <span class="path">${esc(e.page)}</span> <span class="fields">changed: ${esc(e.fields.join(', '))}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="empty">None.</p>'

const removedList = (entries: RemovedEntry[]): string =>
  entries.length
    ? `<ul class="items">${entries
        .map((e) => {
          const refs = e.references.length
            ? ` <span class="fields">still referenced in: ${esc(e.references.join(', '))}</span>`
            : ' <span class="path">no lingering references found</span>'
          return `<li><span class="name">${esc(e.name)}</span>${refs}</li>`
        })
        .join('')}</ul>`
    : '<p class="empty">None.</p>'

export const renderHtml = (d: ReportData): string => {
  const g = d.meta.generatedFrom
  const card = (n: number, l: string): string => `<div class="card"><div class="n">${n}</div><div class="l">${l}</div></div>`
  const total = (a: number, b: number, c: number): number => a + b + c

  const body = `
  <div class="wrap">
    <h1>MDK docs sync report</h1>
    <p class="sub">
      version <code>${esc(d.meta.versionLabel)}</code> ·
      from <code>${esc(g.package)}@${esc(g.packageVersion)}</code> ·
      registry <code>${esc(g.registrySchema)}</code> ·
      commit <code>${esc(g.gitSha ?? 'n/a')}</code> ·
      generated ${esc(g.generatedAt)}
    </p>

    <div class="cards">
      ${card(total(d.totals.componentsNew, d.totals.hooksNew, d.totals.storesNew), 'New')}
      ${card(total(d.totals.componentsChanged, d.totals.hooksChanged, d.totals.storesChanged), 'Changed')}
      ${card(total(d.totals.componentsRemoved, d.totals.hooksRemoved, d.totals.storesRemoved), 'Removed')}
      ${card(d.totals.pagesCreated, 'Pages created')}
      ${card(d.totals.pagesRemoved, 'Pages deleted')}
    </div>

    <section class="focus">
      <h2>👉 Where to focus</h2>
      <ol>${focusItems(d).map((i) => `<li>${esc(i)}</li>`).join('')}</ol>
    </section>

    <section>
      <h2><span class="tag new">NEW</span> Pages created — add intro prose</h2>
      <p class="hint">The reference block (props, usage, examples) renders automatically. Write the "why / when to use" around it.</p>
      <h3>Components</h3>${entryList(d.newComponents)}
      <h3>Hooks</h3>${entryList(d.newHooks)}
      <h3>Stores</h3>${entryList(d.newStores)}
    </section>

    <section>
      <h2><span class="tag chg">CHANGED</span> Pages refreshed automatically</h2>
      <p class="hint">Data updated in place — skim to confirm the surrounding prose is still accurate.</p>
      <h3>Components</h3>${changedList(d.changedComponents)}
      <h3>Hooks</h3>${changedList(d.changedHooks)}
      <h3>Stores</h3>${changedList(d.changedStores)}
    </section>

    <section>
      <h2><span class="tag rm">REMOVED</span> Pages deleted — fix dangling links</h2>
      <h3>Components</h3>${removedList(d.removedComponents)}
      <h3>Hooks</h3>${removedList(d.removedHooks)}
      <h3>Stores</h3>${removedList(d.removedStores)}
    </section>

    <section>
      <h2>⚠ Needs attention</h2>
      <h3>Sparse pages (missing USAGE.md or examples)</h3>
      ${
        d.thinPages.length
          ? `<ul class="items">${d.thinPages
              .map((t) => `<li><span class="name">${esc(t.name)}</span> <span class="fields">${esc(t.reason)}</span> <span class="path">${esc(t.page)}</span></li>`)
              .join('')}</ul>`
          : '<p class="empty">None — every page has usage + examples.</p>'
      }
      <h3>Name collisions (hand-written page blocks a generated one)</h3>
      ${
        d.collisions.length
          ? `<ul class="items">${d.collisions.map((c) => `<li><span class="path">${esc(c)}</span></li>`).join('')}</ul>`
          : '<p class="empty">None.</p>'
      }
    </section>
  </div>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MDK docs sync report — ${esc(d.meta.versionLabel)}</title>
<style>${STYLE}</style>
</head>
<body>${body}</body>
</html>
`
}

// ─── Markdown twin ─────────────────────────────────────────────────────────────

export const renderMarkdown = (d: ReportData): string => {
  const g = d.meta.generatedFrom
  const lines: string[] = []
  lines.push('# MDK docs sync report', '')
  lines.push(
    `version \`${d.meta.versionLabel}\` · from \`${g.package}@${g.packageVersion}\` · ` +
      `registry \`${g.registrySchema}\` · commit \`${g.gitSha ?? 'n/a'}\` · generated ${g.generatedAt}`,
    '',
  )
  const t = d.totals
  lines.push(
    `**${t.componentsNew + t.hooksNew + t.storesNew} new · ` +
      `${t.componentsChanged + t.hooksChanged + t.storesChanged} changed · ` +
      `${t.componentsRemoved + t.hooksRemoved + t.storesRemoved} removed** ` +
      `(${t.pagesCreated} pages created, ${t.pagesRemoved} deleted)`,
    '',
  )

  lines.push('## 👉 Where to focus', '')
  focusItems(d).forEach((i, n) => lines.push(`${n + 1}. ${i}`))
  lines.push('')

  const block = (title: string, entries: Entry[]): void => {
    lines.push(`### ${title}`)
    if (!entries.length) lines.push('_None._')
    else entries.forEach((e) => lines.push(`- **${e.name}** — \`${e.page}\``))
    lines.push('')
  }
  const changedBlock = (title: string, entries: ChangedEntry[]): void => {
    lines.push(`### ${title}`)
    if (!entries.length) lines.push('_None._')
    else entries.forEach((e) => lines.push(`- **${e.name}** (\`${e.fields.join(', ')}\`) — \`${e.page}\``))
    lines.push('')
  }
  const removedBlock = (title: string, entries: RemovedEntry[]): void => {
    lines.push(`### ${title}`)
    if (!entries.length) lines.push('_None._')
    else entries.forEach((e) => lines.push(`- **${e.name}**${e.references.length ? ` — still referenced in: ${e.references.join(', ')}` : ''}`))
    lines.push('')
  }

  lines.push('## NEW — pages created (add intro prose)', '')
  block('Components', d.newComponents)
  block('Hooks', d.newHooks)
  block('Stores', d.newStores)

  lines.push('## CHANGED — refreshed automatically (skim prose)', '')
  changedBlock('Components', d.changedComponents)
  changedBlock('Hooks', d.changedHooks)
  changedBlock('Stores', d.changedStores)

  lines.push('## REMOVED — pages deleted (fix dangling links)', '')
  removedBlock('Components', d.removedComponents)
  removedBlock('Hooks', d.removedHooks)
  removedBlock('Stores', d.removedStores)

  lines.push('## ⚠ Needs attention', '')
  lines.push('### Sparse pages (missing USAGE.md or examples)')
  if (!d.thinPages.length) lines.push('_None._')
  else d.thinPages.forEach((p) => lines.push(`- **${p.name}** (${p.reason}) — \`${p.page}\``))
  lines.push('', '### Name collisions')
  if (!d.collisions.length) lines.push('_None._')
  else d.collisions.forEach((c) => lines.push(`- \`${c}\``))
  lines.push('')

  return lines.join('\n')
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export type WrittenReport = { htmlPath: string; mdPath: string; data: ReportData }

/** Build the report and write the HTML + Markdown twin to `src/data/sync-report/`. */
export const writeSyncReport = (input: ReportInput, out?: (line: string) => void): WrittenReport => {
  const data = buildReportData(input)
  const dir = join(input.docsRepo, 'src', 'data', 'sync-report')
  mkdirSync(dir, { recursive: true })
  const htmlPath = join(dir, 'index.html')
  const mdPath = join(dir, 'report.md')
  writeFileSync(htmlPath, renderHtml(data), 'utf8')
  writeFileSync(mdPath, renderMarkdown(data), 'utf8')
  if (out) {
    const t = data.totals
    out('')
    out(
      `✓ Doc-writer report: ${relative(input.docsRepo, htmlPath)} — ` +
        `${t.componentsNew + t.hooksNew + t.storesNew} new, ` +
        `${t.componentsChanged + t.hooksChanged + t.storesChanged} changed, ` +
        `${t.componentsRemoved + t.hooksRemoved + t.storesRemoved} removed.`,
    )
  }
  return { htmlPath, mdPath, data }
}
