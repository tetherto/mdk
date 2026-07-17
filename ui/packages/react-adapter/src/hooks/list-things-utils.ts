/**
 * Helpers for unwrapping the nested `list-things` / `tail-log` response shape.
 *
 * The Gateway returns these endpoints as a per-Kernel array of arrays
 * (`T[][]` — one inner array per responding node). The MDK aggregates a single
 * site, so the first inner array holds the rows. These helpers centralise that
 * unwrapping so it isn't re-implemented in every read hook.
 */

/** First inner array of a nested `T[][]` response, or `[]` when absent. */
export const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? first : []
}

/** First row of a nested `T[][]` response (`value[0][0]`), or `undefined`. */
export const headHead = <T>(value: T[][] | undefined | null): T | undefined =>
  headOrEmpty(value)[0]
