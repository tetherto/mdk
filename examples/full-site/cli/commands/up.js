'use strict'

const { DEFAULT_MINER_COUNT, waitForReady } = require('../../backend/site')
const { WORKER_SPECS, startComponentResilient } = require('./components')

// Bring up the whole site in dependency order, with readiness waits between
// stages. `--miners N` (default 100) sizes the mock fleet + miner seeding so
// e2e can run small/fast. `--no-ui` skips the Vite dev server.
async function up (ctx, { flags }) {
  const minerCount = flags.miners ? Number(flags.miners) : DEFAULT_MINER_COUNT
  const noUi = !!(flags['no-ui'] || flags.noUi)
  // --discovery local|dht selects the core discovery mode for this run; the ORK
  // and every worker inherit it via ctx so the two sides agree.
  if (flags.discovery) ctx.discovery = flags.discovery
  const discovery = ctx.discovery || 'local'

  ctx.print(`Bringing up site (miners=${minerCount}, discovery=${discovery}${noUi ? ', no-ui' : ''})…`)

  const onRetry = (name, err) => ctx.print(`  ${name} exited (${err.message}); retrying once…`)
  const startOne = (name) => startComponentResilient(ctx, name, { minerCount, onRetry })

  await startOne('mocks')
  ctx.print('  mocks up')
  await startOne('ork')
  ctx.print('  ork up')

  for (const spec of WORKER_SPECS) {
    await startOne(spec.workerId)
    ctx.print(`  ${spec.workerId} up`)
  }

  await startOne('app-node')
  ctx.print('  app-node up')

  const overview = await waitForReady({ port: ctx.httpPort, minerCount, timeoutMs: 60000 })
  ctx.print(overview
    ? `  site live: ${overview.miners.length} miner(s)`
    : `  WARNING: /site/overview did not report ${minerCount} miners in time`)

  if (!noUi) {
    await startOne('ui')
    ctx.print(`  ui up — http://localhost:${ctx.uiPort}`)
  }

  ctx.print('Site up.')
}

module.exports = { up }
