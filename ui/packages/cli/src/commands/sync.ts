import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const PAGES_MARKER = {
  start: '<!-- mdk:pages:start -->',
  end: '<!-- mdk:pages:end -->',
}
const HOOKS_MARKER = {
  start: '<!-- mdk:hooks:start -->',
  end: '<!-- mdk:hooks:end -->',
}

const MDK_IMPORT_RE =
  /from\s+["']@tetherto\/mdk-(?:react-devkit|react-adapter|ui-foundation)(?:\/[^"']+)?["']/

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.turbo', '.next', 'coverage'])

export type SyncOptions = {
  cwd: string
  silent?: boolean
  out?: (line: string) => void
}

type Discovery = {
  pages: string[]
  hooks: string[]
}

const walk = (dir: string, acc: string[]): void => {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) {
      walk(full, acc)
    } else if (SCAN_EXTENSIONS.has(`.${entry.split('.').pop()}`)) {
      acc.push(full)
    }
  }
}

const discover = (cwd: string): Discovery => {
  const srcDir = join(cwd, 'src')
  if (!existsSync(srcDir)) return { pages: [], hooks: [] }

  const files: string[] = []
  walk(srcDir, files)

  const pages: string[] = []
  const hooks: string[] = []

  for (const file of files) {
    const code = readFileSync(file, 'utf8')
    if (!MDK_IMPORT_RE.test(code)) continue
    const rel = relative(cwd, file)
    if (rel.includes(`${'pages'}/`) || rel.endsWith('.page.tsx') || rel.endsWith('.page.ts')) {
      pages.push(rel)
    } else if (/(?:^|\/)hooks\//.test(rel) || /\/use-[\w-]+\.tsx?$/.test(rel)) {
      hooks.push(rel)
    }
  }

  return { pages: pages.sort(), hooks: hooks.sort() }
}

const replaceSection = (
  text: string,
  marker: { start: string; end: string },
  body: string,
): string => {
  const startIdx = text.indexOf(marker.start)
  const endIdx = text.indexOf(marker.end)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return text
  }
  const before = text.slice(0, startIdx + marker.start.length)
  const after = text.slice(endIdx)
  return `${before}\n${body}\n${after}`
}

const renderList = (items: string[], emptyMessage: string): string => {
  if (items.length === 0) return `_${emptyMessage}_`
  return items.map((i) => `- \`${i}\``).join('\n')
}

export const runSync = (opts: SyncOptions): { pages: string[]; hooks: string[] } => {
  const out =
    opts.out ??
    ((s: string) => {
      if (!opts.silent) {
        // eslint-disable-next-line no-console
        console.log(s)
      }
    })

  const contextPath = join(opts.cwd, '.mdk', 'context.md')
  if (!existsSync(contextPath)) {
    throw new Error(`.mdk/context.md not found at ${contextPath}. Run \`mdk-ui init\` first.`)
  }

  const { pages, hooks } = discover(opts.cwd)

  let text = readFileSync(contextPath, 'utf8')
  text = replaceSection(text, PAGES_MARKER, renderList(pages, 'None yet.'))
  text = replaceSection(text, HOOKS_MARKER, renderList(hooks, 'None yet.'))

  writeFileSync(contextPath, text, 'utf8')
  out(`✓ Synced ${contextPath} (${pages.length} pages, ${hooks.length} hooks)`)

  return { pages, hooks }
}
