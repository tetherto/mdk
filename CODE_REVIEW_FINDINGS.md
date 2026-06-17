# Code Review Findings — release/v0.2.0

> **Scope**: Full codebase audit (security + correctness + quality)
> **Date**: 2026-06-16
> **Branch**: `release/v0.2.0`

---

## Critical

### 1. authCheck → capCheck TypeError on unauthenticated requests

**File**: `workers/lib/server/routes/users.routes.js:42` · `workers/lib/server/lib/routeHelpers.js:27`

When `authCheck` fails (missing or invalid token), it calls `rep.status(401).send(...)` and **returns** — it does not throw. The `onRequest` hook then continues to call `capCheck`, which calls `ctx.authLib.tokenHasPerms(req._info.authToken, ...)`. Since auth failed, `req._info.authToken` is `undefined`, causing `undefined.substring(...)` to throw a `TypeError`. Fastify's error handler then tries to send a 400 after the 401 was already sent, producing a "Reply already sent" error.

**Affected routes**: all permission-gated routes (users CRUD, global-data write, features write, etc.)

**Fix**: In `createAuthOnRequest` and all inline `onRequest` hooks, check `rep.sent` after `authCheck` and return early before calling `capCheck`:

```js
async (req, rep) => {
  await authCheck(ctx, req, rep)
  if (rep.sent) return          // ← add this guard
  if (perms) {
    await capCheck(ctx, req, rep, perms)
  }
}
```

---

### 2. WebSocket handler runs after failed auth — unauthenticated clients added to wsClients

**File**: `workers/lib/server/routes/ws.routes.js:13`

The WebSocket route's `onRequest` calls `authCheck`, which on failure writes a 401 HTTP response and returns (no throw). `@fastify/websocket` v11 gates its upgrade handler on `request.raw[kWs]` (presence of the upgrade socket), **not** on `reply.sent`. The WebSocket handshake therefore completes, and the handler runs unconditionally — adding the unauthenticated socket to `ctx.wsClients`. That socket then receives all subsequent alert broadcasts.

**Fix**: Throw instead of return on auth failure inside `onRequest` for WebSocket routes, or check `rep.sent` in the handler:

```js
onRequest: async (req, rep) => {
  await authCheck(ctx, req, rep, req.query.token)
  if (rep.sent) throw new Error('ERR_AUTH_FAIL')   // ← abort upgrade
},
```

---

## High

### 3. Revoked tokens remain valid for up to 60 seconds via stale lru_1m cache

**File**: `workers/lib/server/lib/authCheck.js:27`

`authCheck` caches successful auth results in `ctx.lru_1m` under the key `${token}:${ips}`. When a token is revoked via `_deleteTokensOfUser`, the library invalidates its own internal LRU entry (`gotokens:<token>`) but has no knowledge of `authCheck`'s separate `lru_1m` cache. Revoked tokens continue to pass auth checks from cache for up to 60 seconds.

**Fix**: Expose a cache invalidation callback from `authCheck`, or call `ctx.lru_1m.delete(...)` for all matching keys during token revocation in `users.handlers.js`.

---

## Medium

### 4. Token format validation dead code — regex missing `+` quantifier

**File**: `node_modules/@tetherto/svc-facs-auth/index.js:287`

```js
if (typeof token !== 'string' || /^[a-zA-Z0-9:\-]$/.test(token)) {
```

The regex `/^[a-zA-Z0-9:\-]$/` with no quantifier matches strings of **exactly one character**. All real tokens (e.g. `pub:api:<uuid>-5`) are longer, so the regex never matches and the guard is inoperative for every real token. Any string — including malformed inputs — proceeds to the database query. No SQL injection risk (parameterized query), but the format validation is completely disabled.

**Fix**: Add `+` quantifier: `/^[a-zA-Z0-9:\-]+$/`

---

### 5. `_rpcMapAllPages` has no maximum page count guard

**File**: `workers/lib/data.proxy.js`

The `while (true)` pagination loop breaks only when `batch.length === 0` or `batch.length < pageLimit`. If a misbehaving worker consistently returns exactly `pageLimit` items (e.g. due to a bug on the ork side), the loop never terminates. Each iteration is bounded by the RPC timeout (~15 s), but `allItems` grows without bound until the process runs out of memory or the timeout chain exhausts the event loop.

**Fix**: Add a maximum page count guard:

```js
const MAX_PAGES = 1000
let page = 0
while (page++ < MAX_PAGES) {
  // ...
  if (batch.length < pageLimit) break
}
```

---

### 6. User `id` field schema uses `type: 'number'` instead of `type: 'integer'`

**File**: `workers/lib/server/routes/users.routes.js:101`

Fastify's AJV coercion accepts `1.5` as a valid `number`. A fractional ID passed to `deleteUser` or `updateUser` is forwarded to SQLite as-is. SQLite's integer affinity may silently find no row, causing the operation to succeed with 0 rows affected and no error returned to the caller.

**Fix**: Change `type: 'number'` to `type: 'integer'` for all user ID fields.

---

## Low / Quality

### 7. `configs.handlers.js` re-implements `parseJsonQueryParam` inline

**File**: `workers/lib/server/handlers/configs.handlers.js:19`

A `try { JSON.parse(...) } catch` block duplicates the shared `parseJsonQueryParam` utility already exported from `workers/lib/utils.js`. Fixes or enhancements to the shared utility (e.g. rejecting non-object JSON) will not be inherited.

**Fix**: Replace the inline block with `parseJsonQueryParam(jsonString, 'ERR_INVALID_JSON')`.

---

### 8. `data.proxy.js` defines its own `getRpcTimeout`, duplicating `utils.getRpcTimeout`

**File**: `workers/lib/data.proxy.js`

The module defines a local `getRpcTimeout` function that is byte-for-byte identical to the one in `workers/lib/utils.js`. If the timeout resolution logic changes in one copy, the other silently diverges.

**Fix**: Remove the local definition and import from `utils.js`.

---

### 9. `alerts.handlers.js` duplicates alert extraction logic from `AlertsService`

**File**: `workers/lib/server/handlers/alerts.handlers.js`

`extractAlertsFromThings` re-implements inline the same alert-extraction logic encapsulated in `workers/lib/alerts.js` (`AlertsService`). Behaviour fixes or threshold changes in `AlertsService` will not apply to the handler path.

**Fix**: Call `ctx.alertsService.extractAlerts(...)` (or the equivalent service method) instead of duplicating the logic.

---

### 10. Deep pagination causes O(orks × offset) data transfer per request

**File**: `workers/lib/server/handlers/miners.handlers.js:134`

Each ork is queried with `limit = offset + limit, offset = 0`, fetching all items from the beginning up to the requested page boundary. Results are merged in-memory, sorted, and sliced. At `offset=500, limit=50` with N orks, N × 550 items are transferred over RPC and 98% are discarded. Transfer volume grows linearly with both offset and ork count.

**Fix**: Implement cursor-based pagination at the ork level, or accept the scalability ceiling and document the maximum supported page depth.
