import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ManagedPage } from './managed-pages.js'
import { patchNavIcon, unpatchNavIcon } from './nav.js'

const PAGE: ManagedPage = {
  name: 'PoolManager',
  templateId: 'mdk-ui-shell',
  templatePagePath: 'src/pages/PoolManager.tsx',
  routeEntry: "{ path: '/pool-manager', label: 'Pool Manager', page: () => import('./pages/PoolManager') },",
  routePath: '/pool-manager',
  navIcon: 'PoolManagerNavIcon',
  navEntry: "'/pool-manager': <PoolManagerNavIcon />,",
}

const NAV_WITH_MARKERS = `import {
  DashboardNavIcon,
  // mdk:nav-icons-end
} from '@tetherto/mdk-react-devkit'

const NAV_ICONS = {
  // mdk:nav-end
}
`

const NAV_WITHOUT_MARKERS = `import {
  DashboardNavIcon,
} from '@tetherto/mdk-react-devkit'

const NAV_ICONS = {}
`

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mdk-nav-test-'))
})

afterEach(() => {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // best-effort
  }
})

const writes: string[] = []
const out = (line: string): void => { writes.push(line) }

beforeEach(() => writes.splice(0))

// ─── patchNavIcon ─────────────────────────────────────────────────────────────

describe('patchNavIcon', () => {
  it('no-ops when no nav file exists', () => {
    patchNavIcon(dir, PAGE, out)
    expect(writes).toHaveLength(0)
  })

  it('inserts import + entry when both markers are present', () => {
    mkdirSync(join(dir, 'src', 'constants'), { recursive: true })
    const navPath = join(dir, 'src', 'constants', 'navigation.tsx')
    writeFileSync(navPath, NAV_WITH_MARKERS, 'utf8')

    patchNavIcon(dir, PAGE, out)

    const result = readFileSync(navPath, 'utf8')
    expect(result).toMatch(/PoolManagerNavIcon,/)
    expect(result).toMatch(/<PoolManagerNavIcon \/>/)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatch(/Registered nav icon/)
  })

  it('is idempotent — skips when import + entry already present', () => {
    mkdirSync(join(dir, 'src', 'constants'), { recursive: true })
    const navPath = join(dir, 'src', 'constants', 'navigation.tsx')
    writeFileSync(navPath, NAV_WITH_MARKERS, 'utf8')

    patchNavIcon(dir, PAGE, out)
    const afterFirst = readFileSync(navPath, 'utf8')
    writes.splice(0)

    patchNavIcon(dir, PAGE, out)
    const afterSecond = readFileSync(navPath, 'utf8')

    expect(afterFirst).toEqual(afterSecond)
    expect(writes).toHaveLength(0)
  })

  it('no-ops when the nav file has no markers', () => {
    mkdirSync(join(dir, 'src', 'constants'), { recursive: true })
    const navPath = join(dir, 'src', 'constants', 'navigation.tsx')
    writeFileSync(navPath, NAV_WITHOUT_MARKERS, 'utf8')

    patchNavIcon(dir, PAGE, out)

    const result = readFileSync(navPath, 'utf8')
    expect(result).toEqual(NAV_WITHOUT_MARKERS)
    expect(writes).toHaveLength(0)
  })

  it('finds navigation.ts as a fallback when navigation.tsx is absent', () => {
    mkdirSync(join(dir, 'src', 'constants'), { recursive: true })
    const navPath = join(dir, 'src', 'constants', 'navigation.ts')
    writeFileSync(navPath, NAV_WITH_MARKERS, 'utf8')

    patchNavIcon(dir, PAGE, out)

    const result = readFileSync(navPath, 'utf8')
    expect(result).toMatch(/PoolManagerNavIcon,/)
    expect(writes).toHaveLength(1)
  })
})

// ─── unpatchNavIcon ───────────────────────────────────────────────────────────

describe('unpatchNavIcon', () => {
  it('no-ops when no nav file exists', () => {
    unpatchNavIcon(dir, PAGE, out)
    expect(writes).toHaveLength(0)
  })

  it('removes the import line and entry when present', () => {
    mkdirSync(join(dir, 'src', 'constants'), { recursive: true })
    const navPath = join(dir, 'src', 'constants', 'navigation.tsx')
    writeFileSync(navPath, NAV_WITH_MARKERS, 'utf8')

    // First add so there is something to remove.
    patchNavIcon(dir, PAGE, out)
    writes.splice(0)

    unpatchNavIcon(dir, PAGE, out)

    const result = readFileSync(navPath, 'utf8')
    expect(result).not.toMatch(/PoolManagerNavIcon/)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatch(/Removed nav icon/)
  })

  it('no-ops when the icon is not present (already clean)', () => {
    mkdirSync(join(dir, 'src', 'constants'), { recursive: true })
    const navPath = join(dir, 'src', 'constants', 'navigation.tsx')
    writeFileSync(navPath, NAV_WITH_MARKERS, 'utf8')

    unpatchNavIcon(dir, PAGE, out)

    expect(writes).toHaveLength(0)
    expect(readFileSync(navPath, 'utf8')).toEqual(NAV_WITH_MARKERS)
  })
})
