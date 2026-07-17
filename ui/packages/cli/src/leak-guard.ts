/**
 * Leak guard for generated docs data.
 *
 * The private monorepo's repo name (e.g. `mdk-prv`) must never reach the
 * public docs site. Before `docs:build` writes anything, every text file it
 * is about to emit is scanned for forbidden substrings; any hit aborts the
 * whole run so nothing leaks. Mirrors the docs-repo's own
 * `scripts/docs-sync/guard.mjs` so behaviour matches the existing port-sync.
 */

/** Default forbidden patterns. The private repo slug must never be published. */
export const DEFAULT_FORBIDDEN_PATTERNS = ['mdk-prv']

export type LeakHit = {
  /** Relative path of the offending file within the dataset. */
  file: string
  line: number
  col: number
  match: string
  excerpt: string
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Scan a single file's text. Returns one hit per match (case-insensitive). */
export const scanText = (file: string, text: string, patterns: string[]): LeakHit[] => {
  const hits: LeakHit[] = []
  if (!patterns.length) return hits
  const re = new RegExp(patterns.map(escapeRegExp).join('|'), 'gi')
  text.split('\n').forEach((line, idx) => {
    re.lastIndex = 0
    let m = re.exec(line)
    while (m !== null) {
      hits.push({
        file,
        line: idx + 1,
        col: m.index + 1,
        match: m[0],
        excerpt: line.trim().slice(0, 160),
      })
      if (m.index === re.lastIndex) re.lastIndex += 1 // guard against zero-width
      m = re.exec(line)
    }
  })
  return hits
}

/**
 * Scan an in-memory file map (relPath → contents). Returns all hits across
 * all files, so the caller can report every leak in one pass.
 */
export const scanFiles = (files: Map<string, string>, patterns: string[]): LeakHit[] => {
  const hits: LeakHit[] = []
  for (const [file, text] of files) hits.push(...scanText(file, text, patterns))
  return hits
}

export const formatHits = (hits: LeakHit[]): string =>
  hits.map((h) => `  ${h.file}:${h.line}:${h.col}  "${h.match}"  ${h.excerpt}`).join('\n')
