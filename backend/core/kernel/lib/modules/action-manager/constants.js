export const ACTION_NEG_VOTES_THRESHOLD = 1
export const PUSH_ACTIONS_BATCH_LIMIT = 5

// Upper bound for Hyperbee key-range scans when re-fetching batch members.
// Actions are keyed by individual push timestamps, so this window must cover
// the full push duration of a batch; results are filtered by batchActionUID.
export const BATCH_ACTION_QUERY_WINDOW_MS = 2 * 60 * 1000
