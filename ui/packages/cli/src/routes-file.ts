import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Shared helpers for locating and patching the generated shell's routes
 * manifest. Centralised so `add-page`, `add-feature`, and `remove-page` agree
 * on the candidate filenames and the insertion marker instead of each
 * re-deriving them.
 */

/** Candidate paths for the project's routes manifest, in priority order. */
export const ROUTES_CANDIDATES = ['src/routes.ts', 'src/routes.tsx']

/** Marker the CLI inserts new route entries above. The capture group is the indent. */
export const ROUTES_END_MARKER = /^(\s*)\/\/ mdk:routes-end/m

/** Resolve the first existing routes manifest under `cwd`, or `undefined`. */
export const findRoutesFile = (cwd: string): string | undefined =>
  ROUTES_CANDIDATES.map((candidate) => resolve(cwd, candidate)).find(existsSync)
