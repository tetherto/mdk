import type { LoadedAppUi, MdkAppRoute } from '@tetherto/mdk-react-adapter'
import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit'
import { createElement } from 'react'

/**
 * Where the shell mounts installed apps' pages: `/app/<name>/…`.
 *
 * Not to be confused with `MDK_APP_UI_BASE` (`/app-ui/<name>/`), where the
 * dashboard serves an app's built files. And not `/apps/<name>/…`, which is the
 * Gateway's: it forwards those paths to the app's own routes, and a shell served
 * by the Gateway must not route its own pages onto API paths (a reload would
 * land on JSON).
 */
export const APP_PAGES_BASE = '/app'

/** Router pattern every installed app's pages render under. */
export const APP_PAGES_ROUTE = 'app/:appName/*'

const isIndex = (path: string): boolean => path === '' || path === '/'

/** The shell path of one app page: `buildAppPagePath('sentinel', 'drift')` → `/app/sentinel/drift`. */
export const buildAppPagePath = (name: string, path = ''): string =>
  isIndex(path)
    ? `${APP_PAGES_BASE}/${name}`
    : `${APP_PAGES_BASE}/${name}/${path.replace(/^\//, '')}`

/** An app route as react-router takes it, relative to the app's mount. */
export const toRouterPath = (path: string): { index: true } | { path: string } =>
  isIndex(path) ? { index: true } : { path: path.replace(/^\//, '') }

// Deep links (`:param`, `*`) need a value only another page can give them.
const isNavigable = (route: MdkAppRoute): boolean => !route.hidden && !/[:*]/.test(route.path)

/** The shell's nav icon for a sidebar id. */
type NavIcon = (path: string) => SidebarMenuItem['icon']

interface AppPage {
  route: MdkAppRoute
  item: SidebarMenuItem
}

/**
 * Groups an app's pages by their `section`, in the order each section first
 * appears, with the icon the app gives it (else `icon`). Pages without a
 * section stay where they are, between the groups. A section's pages carry no
 * icon of their own: the section's stands for them.
 */
const groupBySection = ({ app, ui }: LoadedAppUi, pages: AppPage[], icon: NavIcon): SidebarMenuItem[] => {
  const sections = new Map<string, SidebarMenuItem[]>()
  return pages.flatMap<SidebarMenuItem>(({ route, item }) => {
    if (route.section === undefined) return [item]
    const page = { id: item.id, label: item.label }
    const items = sections.get(route.section)
    if (items) {
      items.push(page)
      return []
    }
    const group = [page]
    sections.set(route.section, group)
    // Not a page path: clicking a section opens its first page.
    const id = `${buildAppPagePath(app.name)}#${route.section}`
    const Icon = ui.sections?.find((section) => section.label === route.section)?.icon
    return [{ id, label: route.section, icon: Icon ? createElement(Icon) : icon(id), items: group }]
  })
}

/**
 * Sidebar entries for the installed apps: one entry for an app with one page,
 * a group named after the app for one with several, with a nested group per
 * route `section`. When only one app is installed and it has sections, its
 * sections are top-level entries instead: the app is the dashboard's subject,
 * and wrapping everything in its name would only add a level.
 */
export const appPageSidebarItems = (apps: LoadedAppUi[], icon: NavIcon): SidebarMenuItem[] =>
  apps.flatMap((loaded) => {
    const { app, ui } = loaded
    const pages: AppPage[] = ui.routes.filter(isNavigable).map((route) => {
      const id = buildAppPagePath(app.name, route.path)
      return {
        route,
        item: { id, label: route.label ?? (isIndex(route.path) ? app.displayName : route.path), icon: icon(id) },
      }
    })

    const [first] = pages
    if (!first) return []
    const grouped = groupBySection(loaded, pages, icon)
    if (apps.length === 1 && pages.some(({ route }) => route.section !== undefined)) return grouped
    if (pages.length === 1) return [{ ...first.item, label: first.route.label ?? app.displayName }]
    return [{ id: first.item.id, label: app.displayName, icon: first.item.icon, items: grouped }]
  })
