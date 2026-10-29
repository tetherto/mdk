import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit'

const allIds = (items: SidebarMenuItem[]): string[] =>
  items.flatMap((item) => [item.id, ...allIds(item.items ?? [])])

/**
 * How many query params a query-keyed id (`/pools?view=sites`) asks for, when
 * it is on `pathname` and `params` has every one of them; -1 when it doesn't match.
 */
const queryMatch = (id: string, pathname: string, params: URLSearchParams): number => {
  const at = id.indexOf('?')
  if (at === -1 || id.slice(0, at) !== pathname) return -1
  const wanted = [...new URLSearchParams(id.slice(at + 1))]
  return wanted.every(([key, value]) => params.getAll(key).includes(value)) ? wanted.length : -1
}

/**
 * The sidebar id of the page at `pathname` + `search`.
 *
 * Most ids are bare paths, and a page that keeps its own state in the query (a
 * period, `?granularity=week`) is still that page. An item whose id carries a
 * query (`/pools?view=sites`) is active while the URL has those params, in any
 * order and next to the page's own (`?view=sites&page=2`), so sub-items that
 * differ only by query light up one at a time. When several match, the one
 * asking for the most params wins.
 */
export const sidebarActiveId = (items: SidebarMenuItem[], pathname: string, search: string): string => {
  const params = new URLSearchParams(search)
  let best = { id: pathname, score: -1 }
  for (const id of allIds(items)) {
    const score = queryMatch(id, pathname, params)
    if (score > best.score) best = { id, score }
  }
  return best.id
}
