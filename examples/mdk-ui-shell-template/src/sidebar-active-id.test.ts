import { describe, expect, it } from 'vitest'

import { sidebarActiveId } from './sidebar-active-id'

const items = [
  { id: '/home', label: 'Home' },
  {
    id: '/app/reporting',
    label: 'Reporting',
    items: [
      { id: '/app/reporting/hashrate', label: 'Hashrate' },
      { id: '/pools?view=sites', label: 'Sites' },
      { id: '/pools?view=sites&tab=map', label: 'Sites map' },
    ],
  },
]

describe('sidebarActiveId', () => {
  it('is the path when there is no query', () => {
    expect(sidebarActiveId(items, '/home', '')).toBe('/home')
  })

  it("ignores a page's own query state", () => {
    expect(sidebarActiveId(items, '/app/reporting/hashrate', '?granularity=week&view=unit')).toBe(
      '/app/reporting/hashrate',
    )
  })

  it('keeps the query when an item, nested or not, is keyed by it', () => {
    expect(sidebarActiveId(items, '/pools', '?view=sites')).toBe('/pools?view=sites')
  })

  it("matches a query-keyed item next to the page's own params, in any order", () => {
    expect(sidebarActiveId(items, '/pools', '?page=2&view=sites')).toBe('/pools?view=sites')
  })

  it('prefers the item asking for the most params', () => {
    expect(sidebarActiveId(items, '/pools', '?view=sites&page=2&tab=map')).toBe('/pools?view=sites&tab=map')
  })

  it('does not match an item on another path with the same query', () => {
    expect(sidebarActiveId(items, '/other', '?view=sites')).toBe('/other')
  })

  it('falls back to the path for a query no item is keyed by', () => {
    expect(sidebarActiveId(items, '/pools', '?view=other')).toBe('/pools')
  })
})
