import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { ManagedPage } from './managed-pages.js'

/**
 * Sidebar nav-icon registry the CLI patches alongside `routes.ts`. Two markers
 * bound the managed regions: `mdk:nav-icons-end` (inside the devkit icon
 * import) and `mdk:nav-end` (inside the `NAV_ICONS` map). Both add/remove
 * operations no-op gracefully when the file or a marker is absent.
 */
export const NAV_CANDIDATES = ['src/constants/navigation.tsx', 'src/constants/navigation.ts']
const NAV_IMPORTS_END_MARKER = /^(\s*)\/\/ mdk:nav-icons-end/m
const NAV_END_MARKER = /^(\s*)\/\/ mdk:nav-end/m

const findNavFile = (cwd: string): string | undefined =>
  NAV_CANDIDATES.map((c) => resolve(cwd, c)).find(existsSync)

/**
 * Register a managed page's nav icon: add the devkit icon import (before
 * `mdk:nav-icons-end`) and the `NAV_ICONS` map entry (before `mdk:nav-end`).
 * Idempotent — skips whichever piece is already present.
 */
export const patchNavIcon = (
  cwd: string,
  page: ManagedPage,
  out: (line: string) => void,
): void => {
  const navFile = findNavFile(cwd)
  if (!navFile) return

  let content = readFileSync(navFile, 'utf8')
  let changed = false

  const importLineRe = new RegExp(`^\\s*${page.navIcon},?\\s*$`, 'm')
  if (NAV_IMPORTS_END_MARKER.test(content) && !importLineRe.test(content)) {
    content = content.replace(NAV_IMPORTS_END_MARKER, `$1${page.navIcon},\n$1// mdk:nav-icons-end`)
    changed = true
  }

  // Match the NAV_ICONS map entry specifically (`: <Icon`), not any usage — the
  // icon may also appear as the default fallback (`= <Icon />`).
  const mapEntryRe = new RegExp(`:\\s*<${page.navIcon}\\b`)
  if (NAV_END_MARKER.test(content) && !mapEntryRe.test(content)) {
    content = content.replace(NAV_END_MARKER, `$1${page.navEntry}\n$1// mdk:nav-end`)
    changed = true
  }

  if (changed) {
    writeFileSync(navFile, content, 'utf8')
    out(`✓ Registered nav icon for ${page.name} in ${navFile}`)
  }
}

/**
 * Remove a managed page's nav icon: drop both the icon import specifier line
 * and its `NAV_ICONS` map entry line. No-op when neither is present.
 */
export const unpatchNavIcon = (
  cwd: string,
  page: ManagedPage,
  out: (line: string) => void,
): void => {
  const navFile = findNavFile(cwd)
  if (!navFile) return

  const content = readFileSync(navFile, 'utf8')
  const importLineRe = new RegExp(`^\\s*${page.navIcon},?\\s*$`)
  // The `NAV_ICONS` map entry, e.g. `[ROUTE_PATHS.EXPLORER]: <ExplorerNavIcon />,`.
  // Anchored on `: <Icon` so it never matches other usages (e.g. the
  // `DEFAULT_NAV_ICON = <ExplorerNavIcon />` fallback).
  const mapEntryRe = new RegExp(`:\\s*<${page.navIcon}\\b`)
  const lines = content.split('\n')

  // Always drop the map entry.
  let next = lines.filter((line) => !mapEntryRe.test(line))
  // Only drop the icon import if it is no longer used anywhere else — the icon
  // may double as the default fallback (e.g. ExplorerNavIcon).
  const iconStillUsed = new RegExp(`<${page.navIcon}\\b`).test(next.join('\n'))
  if (!iconStillUsed) {
    next = next.filter((line) => !importLineRe.test(line))
  }

  if (next.length === lines.length) return

  writeFileSync(navFile, next.join('\n'), 'utf8')
  out(`✓ Removed nav icon for ${page.name} from ${navFile}`)
}
