import type { DocsComponentRecord, DocsHookRecord } from './docs-data.js'

/**
 * Coverage report: which generated components/hooks the docs-repo's curated
 * catalog still needs a human to act on. Pure — the caller reads the curated
 * JSON files off disk and passes the parsed name lists in.
 *
 * Scope note: the devkit registry covers `core`/`foundation` components. The
 * curated catalog also lists `adapter` hooks (a different package surface), so
 * hook coverage only flags *new* generated hooks missing from the catalog and
 * never reports curated hooks as "removed".
 */

export type CuratedCatalog = {
  /** Component names present in the curated `components.json`. */
  componentNames: Set<string>
  /** Hook names present in the curated `hooks.json`. */
  hookNames: Set<string>
  /** Names to ignore (dont-document-* + document-when-fixed), components + hooks. */
  skip: Set<string>
}

export type CoverageReport = {
  /** Public components in the registry with no curated catalog entry. */
  newComponents: string[]
  /** Curated components no longer present in the registry (page rot). */
  removedComponents: string[]
  /** Public devkit hooks in the registry with no curated catalog entry. */
  newHooks: string[]
  /** True when nothing needs attention. */
  clean: boolean
}

export const computeCoverage = (
  components: DocsComponentRecord[],
  hooks: DocsHookRecord[],
  curated: CuratedCatalog,
): CoverageReport => {
  const generatedComponentNames = new Set(components.map((c) => c.name))

  const newComponents = components
    .map((c) => c.name)
    .filter((n) => !curated.componentNames.has(n) && !curated.skip.has(n))
    .sort()

  const removedComponents = [...curated.componentNames]
    .filter((n) => !generatedComponentNames.has(n) && !curated.skip.has(n))
    .sort()

  const newHooks = hooks
    .map((h) => h.name)
    .filter((n) => !curated.hookNames.has(n) && !curated.skip.has(n))
    .sort()

  // The hook "removed" direction is intentionally omitted — the curated catalog
  // also lists adapter hooks the registry never contains (see the scope note above).

  const clean =
    newComponents.length === 0 && removedComponents.length === 0 && newHooks.length === 0
  return { newComponents, removedComponents, newHooks, clean }
}

/** Human-readable one-screen summary for the terminal. */
export const formatCoverage = (report: CoverageReport): string => {
  if (report.clean) return 'Coverage: ✓ curated catalog matches the generated surface.'
  const lines: string[] = ['Coverage report:']
  if (report.newComponents.length) {
    lines.push(
      `  ${report.newComponents.length} new component(s) need a curated catalog entry:`,
      ...report.newComponents.map((n) => `    + ${n}`),
    )
  }
  if (report.removedComponents.length) {
    lines.push(
      `  ${report.removedComponents.length} catalog component(s) no longer in the registry (page rot):`,
      ...report.removedComponents.map((n) => `    - ${n}`),
    )
  }
  if (report.newHooks.length) {
    lines.push(
      `  ${report.newHooks.length} new hook(s) not in the catalog:`,
      ...report.newHooks.map((n) => `    + ${n}`),
    )
  }
  return lines.join('\n')
}
