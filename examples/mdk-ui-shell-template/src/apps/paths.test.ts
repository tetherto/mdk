import type { LoadedAppUi, MdkAppRoute, MdkAppSection } from '@tetherto/mdk-react-adapter'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { appPageSidebarItems } from './paths'

const Page = () => null
const OpsIcon = () => null

// The shell's nav icon lookup, as a string so the tests can see which id it was asked for.
const navIcon = (path: string) => `nav:${path}`

const loaded = (name: string, routes: Partial<MdkAppRoute>[], sections?: MdkAppSection[]): LoadedAppUi =>
  ({
    app: { name, displayName: `${name} app` },
    ui: { routes: routes.map((route) => ({ path: '', component: Page, ...route })), panels: [], sections },
  }) as unknown as LoadedAppUi

describe('appPageSidebarItems', () => {
  it('lists an app with one page as a single entry', () => {
    expect(appPageSidebarItems([loaded('one', [{ path: '', label: 'Overview' }])], navIcon)).toEqual([
      { id: '/app/one', label: 'Overview', icon: 'nav:/app/one' },
    ])
  })

  it('groups an app with several pages under its name, skipping hidden and deep-link routes', () => {
    const app = loaded('ops', [{ path: '' }, { path: 'drift' }, { path: 'drift/:id' }, { path: 'log', hidden: true }])
    expect(appPageSidebarItems([app], navIcon)).toEqual([
      {
        id: '/app/ops',
        label: 'ops app',
        icon: 'nav:/app/ops',
        items: [
          { id: '/app/ops', label: 'ops app', icon: 'nav:/app/ops' },
          { id: '/app/ops/drift', label: 'drift', icon: 'nav:/app/ops/drift' },
        ],
      },
    ])
  })

  it('nests sections in first-appearance order, with unsectioned pages left in place', () => {
    const app = loaded('rt', [
      { path: 'a', section: 'Financials' },
      { path: 'b' },
      { path: 'c', section: 'Operations' },
      { path: 'd', section: 'Financials' },
    ])
    const [group] = appPageSidebarItems([app, loaded('other', [{ path: '' }])], navIcon)
    expect(group?.items).toEqual([
      {
        id: '/app/rt#Financials',
        label: 'Financials',
        icon: 'nav:/app/rt#Financials',
        items: [
          { id: '/app/rt/a', label: 'a' },
          { id: '/app/rt/d', label: 'd' },
        ],
      },
      { id: '/app/rt/b', label: 'b', icon: 'nav:/app/rt/b' },
      {
        id: '/app/rt#Operations',
        label: 'Operations',
        icon: 'nav:/app/rt#Operations',
        items: [{ id: '/app/rt/c', label: 'c' }],
      },
    ])
  })

  it("lists a lone app's sections at the top level", () => {
    const app = loaded('rt', [
      { path: 'a', section: 'Operations' },
      { path: 'b', section: 'Financials' },
    ])
    expect(appPageSidebarItems([app], navIcon).map((item) => item.label)).toEqual(['Operations', 'Financials'])
  })

  it('keeps each app in its own group when more than one is installed', () => {
    const items = appPageSidebarItems(
      [loaded('rt', [{ path: 'a', section: 'Operations' }, { path: 'b' }]), loaded('other', [{ path: '' }])],
      navIcon,
    )
    expect(items.map((item) => item.label)).toEqual(['rt app', 'other app'])
  })

  it("uses the app's icon for a section, else the shell's", () => {
    const app = loaded(
      'rt',
      [
        { path: 'a', section: 'Operations' },
        { path: 'b', section: 'Financials' },
      ],
      [{ label: 'Operations', icon: OpsIcon }],
    )
    const [operations, financials] = appPageSidebarItems([app], navIcon)
    expect((operations?.icon as ReactElement).type).toBe(OpsIcon)
    expect(financials?.icon).toBe('nav:/app/rt#Financials')
  })

  it('lists nothing for an app with no navigable pages', () => {
    expect(appPageSidebarItems([loaded('none', [{ path: ':id' }])], navIcon)).toEqual([])
  })
})
