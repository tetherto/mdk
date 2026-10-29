/**
 * @vitest-environment-options {"settings":{"disableCSSFileLoading":true}}
 */
// The loader adds <link rel="stylesheet">s; happy-dom would otherwise fetch them.
import type { InstalledApp } from '@tetherto/mdk-ui-foundation'
import { memo } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkAppUiModule, defineMdkApp, loadAppUi, loadAppUis } from '../load-app-ui'

const Page = () => null

const app = (name: string, overrides: Partial<InstalledApp> = {}): InstalledApp => ({
  name,
  id: `io.tether.${name}`,
  version: '0.1.0',
  displayName: name,
  apiBase: `/apps/${name}`,
  ui: { entry: `/app-ui/${name}/index.js`, styles: [] },
  ...overrides,
})

const moduleFor = (a: InstalledApp, ui: Record<string, unknown> = {}) => ({
  default: { id: a.id, displayName: a.displayName, routes: [], panels: [], ...ui },
})

afterEach(() => {
  document.head.querySelectorAll('link[data-mdk-app]').forEach((link) => link.remove())
})

describe('checkAppUiModule', () => {
  const sentinel = app('sentinel')

  it('accepts what `mdk create app` scaffolds — no routes, no panels', () => {
    expect(checkAppUiModule(sentinel, moduleFor(sentinel))).toEqual({
      id: 'io.tether.sentinel',
      displayName: 'sentinel',
      routes: [],
      panels: [],
      sections: [],
    })
  })

  it('accepts function, memo and forwardRef-style components', () => {
    const ui = checkAppUiModule(
      sentinel,
      moduleFor(sentinel, {
        routes: [{ path: '', component: Page }],
        panels: [{ id: 'p', slot: 'home', component: memo(Page) }],
      }),
    )
    expect(ui.routes).toHaveLength(1)
    expect(ui.panels).toHaveLength(1)
  })

  it("keeps a route's sidebar section and the section's icon", () => {
    const ui = checkAppUiModule(
      sentinel,
      moduleFor(sentinel, {
        routes: [{ path: 'drift', section: 'Operations', component: Page }],
        sections: [{ label: 'Operations', icon: Page }],
      }),
    )
    expect(ui.routes[0]?.section).toBe('Operations')
    expect(ui.sections).toEqual([{ label: 'Operations', icon: Page }])
  })

  it.each([
    ['no default export', {}, /must default-export/],
    [
      "another app's id",
      { default: { id: 'io.evil.x', displayName: 'x', routes: [], panels: [] } },
      /declares id "io\.evil\.x", but the installed app is "io\.tether\.sentinel"/,
    ],
    ['no displayName', moduleFor(sentinel, { displayName: '' }), /displayName/],
    ['routes not a list', moduleFor(sentinel, { routes: {} }), /`routes` as an array/],
    [
      'a route without a path',
      moduleFor(sentinel, { routes: [{ component: Page }] }),
      /routes\[0\] needs a string `path`/,
    ],
    [
      'a route without a component',
      moduleFor(sentinel, { routes: [{ path: 'x', component: 'div' }] }),
      /routes\[0\] \("x"\) needs a React `component`/,
    ],
    [
      'a route with an empty section',
      moduleFor(sentinel, { routes: [{ path: 'x', section: '', component: Page }] }),
      /routes\[0\] \("x"\) has a `section` that is not a non-empty string/,
    ],
    ['sections not a list', moduleFor(sentinel, { sections: {} }), /`sections` as an array/],
    [
      'a section without a label',
      moduleFor(sentinel, { sections: [{ icon: Page }] }),
      /sections\[0\] needs a string `label`/,
    ],
    [
      'two sections with one label',
      moduleFor(sentinel, { sections: [{ label: 'Ops' }, { label: 'Ops' }] }),
      /two sections labelled "Ops"/,
    ],
    [
      'a section icon that is not a component',
      moduleFor(sentinel, { sections: [{ label: 'Ops', icon: 'svg' }] }),
      /section "Ops" has an `icon` that is not a React component/,
    ],
    ['panels not a list', moduleFor(sentinel, { panels: null }), /`panels` as an array/],
    [
      'a panel without an id',
      moduleFor(sentinel, { panels: [{ slot: 'home', component: Page }] }),
      /panels\[0\] needs a string `id`/,
    ],
    [
      'two panels with one id',
      moduleFor(sentinel, {
        panels: [
          { id: 'a', slot: 'home', component: Page },
          { id: 'a', slot: 'home', component: Page },
        ],
      }),
      /two panels with id "a"/,
    ],
    [
      'a panel without a slot',
      moduleFor(sentinel, { panels: [{ id: 'a', component: Page }] }),
      /panel "a" needs a string `slot`/,
    ],
    [
      'a panel without a component',
      moduleFor(sentinel, { panels: [{ id: 'a', slot: 'home' }] }),
      /panel "a" needs a React `component`/,
    ],
  ])('rejects %s, naming the app', (_label, mod, error) => {
    expect(() => checkAppUiModule(sentinel, mod)).toThrow(error)
    expect(() => checkAppUiModule(sentinel, mod)).toThrow(/App "sentinel" \(io\.tether\.sentinel\)/)
  })
})

describe('defineMdkApp', () => {
  it('returns the module unchanged', () => {
    const ui = { id: 'io.tether.x', displayName: 'X', routes: [], panels: [] }
    expect(defineMdkApp(ui)).toBe(ui)
  })
})

describe('loadAppUi', () => {
  it("imports the entry and adds its stylesheets from the dashboard's own origin", async () => {
    const sentinel = app('sentinel', {
      ui: { entry: '/app-ui/sentinel/index.js', styles: ['/app-ui/sentinel/style.css'] },
    })
    const importModule = vi.fn(async () => moduleFor(sentinel))
    await loadAppUi(sentinel, { importModule })

    expect(importModule).toHaveBeenCalledWith('/app-ui/sentinel/index.js')
    const links = document.head.querySelectorAll<HTMLLinkElement>('link[data-mdk-app="sentinel"]')
    expect(Array.from(links, (l) => l.getAttribute('href'))).toEqual(['/app-ui/sentinel/style.css'])
  })

  it('adds each stylesheet once, however often the app loads', async () => {
    const sentinel = app('sentinel', { ui: { entry: '/e.js', styles: ['/a.css', '/b.css'] } })
    const importModule = async () => moduleFor(sentinel)
    await loadAppUi(sentinel, { importModule })
    await loadAppUi(sentinel, { importModule })
    expect(document.head.querySelectorAll('link[data-mdk-app]')).toHaveLength(2)
  })

  it('does not add styles for a module that fails the contract', async () => {
    const sentinel = app('sentinel', { ui: { entry: '/e.js', styles: ['/a.css'] } })
    await expect(loadAppUi(sentinel, { importModule: async () => ({}) })).rejects.toThrow(
      /default-export/,
    )
    expect(document.head.querySelectorAll('link[data-mdk-app]')).toHaveLength(0)
  })

  it('names the app and entry when the import fails', async () => {
    const sentinel = app('sentinel')
    const importModule = async () => {
      throw new TypeError('Failed to resolve module specifier "react"')
    }
    await expect(loadAppUi(sentinel, { importModule })).rejects.toThrow(
      'App "sentinel" (io.tether.sentinel): could not load /app-ui/sentinel/index.js: Failed to resolve module specifier "react"',
    )
  })

  it('refuses an app that ships no UI', async () => {
    await expect(loadAppUi(app('bare', { ui: null }))).rejects.toThrow(/ships no UI/)
  })
})

describe('loadAppUis', () => {
  it('loads apps independently: a broken one is reported, the rest still load', async () => {
    const good = app('good')
    const broken = app('broken')
    const other = app('other')
    const modules: Record<string, unknown> = {
      '/app-ui/good/index.js': moduleFor(good),
      '/app-ui/other/index.js': moduleFor(other),
    }
    const importModule = async (url: string) => {
      if (!(url in modules)) throw new Error('404')
      return modules[url]
    }

    const { loaded, failures } = await loadAppUis(
      [good, broken, app('bare', { ui: null }), other],
      { importModule },
    )

    expect(loaded.map((l) => l.app.name)).toEqual(['good', 'other'])
    expect(failures).toHaveLength(1)
    expect(failures[0]!.app.name).toBe('broken')
    expect(failures[0]!.error.message).toMatch(/could not load .*: 404/)
  })
})
