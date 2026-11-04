import type { InstalledAppsResponse } from '@tetherto/mdk-ui-foundation'
import type { Plugin, ResolvedConfig } from 'vite'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'

import { MDK_APP_UI_BASE, MDK_APP_UI_MANIFEST } from '@tetherto/mdk-ui-foundation/app-ui-paths'

import { APPS_ENV, type DashboardApp, readApps } from './read-apps'

/**
 * Serves the installed apps' UIs from this dashboard, and lists them — so the
 * browser finds every app without asking the Gateway.
 *
 * `mdk run dashboard` reads the apps from the stack's `mdk.yaml` and hands them
 * over in `MDK_DASHBOARD_APPS` (a JSON array of `{ name, id, version,
 * displayName, apiBase, dir }`). For each app with a built `ui/index.js` this
 * plugin:
 *
 * - serves `<dir>/ui/` at `/app-ui/<name>/` (dev server), or copies it there
 *   (production build);
 * - lists every app at `/app-ui.json`, which `useInstalledAppUis` reads on load.
 *
 * Without the variable (plain `npm run dev`) the list is empty. Installing an
 * app means restarting the dashboard, or rebuilding it for production.
 */

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const uiDirOf = (app: DashboardApp): string => join(app.dir, 'ui')
const hasUi = (app: DashboardApp): boolean => existsSync(join(uiDirOf(app), 'index.js'))

/** Top-level stylesheets the app's UI build emitted, in a stable order. */
const uiStyles = (app: DashboardApp): string[] =>
  readdirSync(uiDirOf(app), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.css'))
    .map(entry => entry.name)
    .sort()

/** Every file under `dir`, as paths relative to it. */
const listFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(full).map(file => `${entry.name}/${file}`)
    return entry.isFile() ? [entry.name] : []
  })

export function mdkInstalledApps(): Plugin {
  const apps = readApps(process.env[APPS_ENV])
  let config: ResolvedConfig

  // `base` is '/' or '/sub/'; the paths start with '/'.
  const basePrefix = (): string => config.base.replace(/\/$/, '')
  const url = (path: string): string => `${basePrefix()}${path}`
  /** A request's path, without query string or `base`. */
  const requestPath = (reqUrl = ''): string => {
    const path = reqUrl.split('?')[0] ?? ''
    const prefix = basePrefix()
    return prefix && path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path
  }
  const appUiPath = (name: string, file = ''): string => `${MDK_APP_UI_BASE}/${name}/${file}`

  const manifest = (): InstalledAppsResponse => ({
    apps: apps.map(app => ({
      name: app.name,
      id: app.id,
      version: app.version,
      displayName: app.displayName,
      apiBase: app.apiBase,
      ui: hasUi(app)
        ? {
            entry: url(appUiPath(app.name, 'index.js')),
            styles: uiStyles(app).map(file => url(appUiPath(app.name, file))),
          }
        : null,
    })),
  })

  return {
    name: 'mdk-installed-apps',

    configResolved(resolved) {
      config = resolved
      if (apps.length) {
        config.logger.info(`[mdk-installed-apps] ${apps.map(a => a.name).join(', ')}`)
      }
    },

    configureServer(server) {
      // Ahead of Vite's own middlewares: app files are served as built, never
      // transformed, and never fall through to the SPA's index.html.
      server.middlewares.use((req, res, next) => {
        const path = requestPath(req.url)

        if (path === MDK_APP_UI_MANIFEST) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(manifest()))
          return
        }
        if (!path.startsWith(`${MDK_APP_UI_BASE}/`)) return next()

        const [name, ...rest] = path.slice(MDK_APP_UI_BASE.length + 1).split('/')
        const app = apps.find(a => a.name === name)
        const uiDir = app && resolve(uiDirOf(app))
        let file: string | undefined
        try {
          file = uiDir && resolve(uiDir, decodeURIComponent(rest.join('/')))
        }
        catch {
          // A malformed escape (`%E0`) names no file: 404, not a failed request.
          file = undefined
        }
        // Only files inside that app's ui/ directory, nothing above it.
        if (!uiDir || !file || !(file + sep).startsWith(uiDir + sep) || file === uiDir
          || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        res.setHeader('Content-Type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        res.end(readFileSync(file))
      })
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: MDK_APP_UI_MANIFEST.slice(1),
        source: JSON.stringify(manifest(), null, 2),
      })
      for (const app of apps.filter(hasUi)) {
        const uiDir = uiDirOf(app)
        for (const file of listFiles(uiDir)) {
          this.emitFile({
            type: 'asset',
            fileName: relative('/', appUiPath(app.name, file)),
            source: readFileSync(join(uiDir, file)),
          })
        }
      }
    },
  }
}
