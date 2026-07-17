/**
 * Shared polling cadences for the Pool Manager and Op Centre read hooks.
 * Centralized so the same interval isn't duplicated as a raw literal across
 * every hook.
 */

/** Default poll cadence (ms) for the "slow" Pool Manager reads (pools, configs, miners, containers). */
export const POOL_MANAGER_POLL_INTERVAL_MS = 60_000

/** Poll cadence (ms) for the consolidated live site-status snapshot. */
export const SITE_STATUS_POLL_INTERVAL_MS = 5_000

/** Poll cadence (ms) for the current alert-bearing devices feed (mirrors the reference app). */
export const ALERTS_POLL_INTERVAL_MS = 20_000

/** Poll cadence (ms) for the live-actions feed (`/auth/actions`). */
export const LIVE_ACTIONS_POLL_INTERVAL_MS = 5_000

/** Poll cadence (ms) for the Operations Centre realtime snapshots (widgets, thing detail). */
export const OP_CENTRE_REALTIME_POLL_INTERVAL_MS = 20_000
