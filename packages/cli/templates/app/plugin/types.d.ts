// The app's types, shared by both halves: the controllers check their requests
// and return values against them (JSDoc + `// @ts-check`), and the UI imports
// the response shapes with `import type`. Types only: the app runtime loads `.js`/`.cjs` and never
// reads this file, and the UI build erases the import.

/**
 * What every controller receives: `async (req) => result`. The Gateway strips
 * the caller's credential headers (authorization, proxy-authorization, cookie)
 * before forwarding, so they never reach app code.
 */
export type AppRequest = {
  params: Record<string, string>
  query: Record<string, string | string[] | undefined>
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

/** What `GET /api/<name>/summary` returns (`controllers/summary.js`). */
export type Summary = {
  ok: boolean
  kernelConnected: boolean
  workerCount: number
  deviceCount: number
  workers: Array<{ workerId: string; devices: number }>
}
