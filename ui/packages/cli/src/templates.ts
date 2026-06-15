import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type TemplateMeta = {
  /** Stable template id, used as the directory name and CLI flag value. */
  id: string
  /** Short, human-friendly name (one to three words). */
  label: string
  /** One-line description shown in `--list-templates`. */
  description: string
}

export type ResolvedTemplate = {
  meta: TemplateMeta
  /** Absolute path to the template directory. */
  path: string
}

/**
 * Resolve the templates root, supporting both `dist/templates.js` (published
 * CLI) and `src/templates.ts` (tests/dev). The copy-templates build step
 * keeps `dist/templates/` populated; the source tree keeps `templates/` next
 * to `src/`.
 */
export const getTemplatesRoot = (): string => {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [join(here, 'templates'), join(here, '..', 'templates')]
  const found = candidates.find((p) => existsSync(p))
  if (!found) {
    throw new Error(`Could not locate the templates directory. Searched: ${candidates.join(', ')}`)
  }
  return found
}

const readMeta = (templateDir: string, id: string): TemplateMeta => {
  const metaPath = join(templateDir, '_meta.json')
  if (!existsSync(metaPath)) {
    throw new Error(`Template "${id}" is missing _meta.json at ${metaPath}`)
  }
  const raw = JSON.parse(readFileSync(metaPath, 'utf8')) as Partial<TemplateMeta>
  if (!raw.id || !raw.label || !raw.description) {
    throw new Error(`Template "${id}" has an invalid _meta.json (id/label/description required)`)
  }
  return { id: raw.id, label: raw.label, description: raw.description }
}

export const listTemplates = (): TemplateMeta[] => {
  const root = getTemplatesRoot()
  return readdirSync(root)
    .filter((entry) => statSync(join(root, entry)).isDirectory())
    .map((id) => readMeta(join(root, id), id))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export const findTemplate = (id: string): ResolvedTemplate => {
  const root = getTemplatesRoot()
  const templateDir = join(root, id)
  if (!existsSync(templateDir) || !statSync(templateDir).isDirectory()) {
    const available =
      listTemplates()
        .map((t) => t.id)
        .join(', ') || '(none)'
    throw new Error(`Template "${id}" not found. Available: ${available}`)
  }
  return { meta: readMeta(templateDir, id), path: templateDir }
}
