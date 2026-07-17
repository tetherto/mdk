/**
 * Tiny projection helper used by the dashboard's header-stat hooks.
 *
 * Tail-log responses arrive as ordered time-series — the freshest sample is
 * at the tail. The header boxes (Hashrate, Consumption, Efficiency) only
 * need that last value, not the whole series; routing through this single
 * helper keeps the projection consistent across hooks.
 *
 * @category utils
 */
export const getLatestSample = <T>(entries: readonly T[] | null | undefined): T | undefined => {
  if (!entries || entries.length === 0) return undefined
  return entries[entries.length - 1]
}
