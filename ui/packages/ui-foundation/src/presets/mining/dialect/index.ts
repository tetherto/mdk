/**
 * The mining Gateway's query dialect — the vocabulary that turns a semantic
 * request ("site hashrate over this range") into that backend's request shape.
 *
 * This is where the `t-*` device tags, the `*_aggr` aggregate field names, the
 * `last.snap.*` field projections and the JSON-stringified Mongo selectors live.
 * Nothing outside this directory should reference them —
 * [`ui/CLAUDE.md`](../../../../../../CLAUDE.md) makes that a load-bearing rule.
 *
 * ## Why there is no `QueryDialect` interface
 *
 * The original plan was to hide these builders behind a pluggable interface.
 * That turned out to be the wrong shape: every builder here returns a *mining*
 * request type — `TailLogParams`, `ListThingsParams`, `HistoryLogParams`, or a
 * Mongo selector string. An interface over them would be the mining API
 * restated, and a backend without tail-logs or Mongo selectors could not
 * implement it in any meaningful way.
 *
 * The real seam for a different backend's request shaping already exists one
 * level up: `createResourceQuery`'s `params` / `pathParams` mappers. A consumer
 * writes their own mapping there. This directory is simply *our* mapping — one
 * concrete dialect, not an abstraction others must conform to.
 */

export * from './alert-mappers'
export * from './alert-queries'
export * from './container-sockets'
export * from './container-tabs'
export * from './container-widgets-derive'
export * from './dashboard-mappers'
export * from './dashboard-queries'
export * from './device-tags'
export * from './op-center-queries'
export * from './query-utils'
