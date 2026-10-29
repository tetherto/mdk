'use strict'

const { requestClient } = require('./utils')

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

// One command attempt as the Activity page shows it: who sent it (the user,
// `via` the app that acted for them), the roles they held, and how it ended,
// from the log's later `settled` entry for the same command when there is one.
const toEntry = (attempt, settled) => ({
  ts: attempt.ts,
  commandId: attempt.commandId || null,
  user: (attempt.caller && attempt.caller.key) || null,
  roles: (attempt.caller && attempt.caller.roles) || [],
  via: (attempt.via && attempt.via.key) || null,
  command: attempt.command || null,
  deviceId: attempt.deviceId || null,
  params: attempt.params || {},
  outcome: (settled && settled.outcome) || attempt.outcome || null,
  error: (settled && settled.error) || attempt.error || null
})

// The Kernel's write-command log, newest first: every command attempted on the
// site, refused ones included. Read as the signed-in user, so it needs
// `commands: read` in their roles as well as the app's.
//
// `ctx` is a test-only seam — see utils.js requestClient.
module.exports = async (req, ctx) => {
  const mdkClient = requestClient(req, ctx)
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')
  // Only a signed-in user reads the log: an MCP agent's call carries no identity.
  if (ctx === undefined && !(req._info && req._info.sub)) {
    throw Object.assign(new Error('ERR_SIGN_IN_REQUIRED'), { statusCode: 401 })
  }

  // mdk-plugin.json declares 1..MAX_LIMIT; the HTTP route does not enforce it.
  const asked = Math.trunc(Number(req.query && req.query.limit)) || DEFAULT_LIMIT
  const limit = Math.min(Math.max(asked, 1), MAX_LIMIT)
  const res = await mdkClient.getCommandLog({ limit })
  const log = (res && res.entries) || []
  const settled = new Map(log.filter((e) => e.event === 'settled' && e.commandId).map((e) => [e.commandId, e]))
  return {
    entries: log.filter((e) => e.event === 'attempt').map((e) => toEntry(e, e.commandId && settled.get(e.commandId)))
  }
}
