'use strict'

const { fetchStatus } = require('../../backend/inspect')
const { renderStatus } = require('../render')

// Query the ORK over HRPC and render worker → deviceIds → state/health.
async function status (ctx) {
  const s = await fetchStatus(ctx.root)
  ctx.print(renderStatus(s))
}

module.exports = { status }
