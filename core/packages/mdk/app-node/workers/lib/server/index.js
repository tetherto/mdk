'use strict'

const authRoutes = require('./routes/auth.routes')
const usersRoutes = require('./routes/users.routes')
const actionsRoutes = require('./routes/actions.routes')
const logsRoutes = require('./routes/logs.routes')
const globalRoutes = require('./routes/global.routes')
const thingsRoutes = require('./routes/things.routes')
const settingsRoutes = require('./routes/settings.routes')
const wsRoutes = require('./routes/ws.routes')
const financeRoutes = require('./routes/finance.routes')
const poolsRoutes = require('./routes/pools.routes')
const siteRoutes = require('./routes/site.routes')
const configsRoutes = require('./routes/configs.routes')
const devicesRoutes = require('./routes/devices.routes')
const metricsRoutes = require('./routes/metrics.routes')
const alertsRoutes = require('./routes/alerts.routes')
const minersRoutes = require('./routes/miners.routes')
const groupsRoutes = require('./routes/groups.routes')
const coolingSystemRoutes = require('./routes/coolingSystem.routes')
const energySystemRoutes = require('./routes/energySystem.routes')
const explorerRoutes = require('./routes/explorer.routes')

/**
 * Collect all routes into a flat array for server injection.
 * Each route is a Fastify-style object: { method, url, handler, ... }
 */
function routes (ctx) {
  return [
    ...authRoutes(ctx),
    ...actionsRoutes(ctx),
    ...logsRoutes(ctx),
    ...globalRoutes(ctx),
    ...thingsRoutes(ctx),
    ...usersRoutes(ctx),
    ...settingsRoutes(ctx),
    ...wsRoutes(ctx),
    ...financeRoutes(ctx),
    ...poolsRoutes(ctx),
    ...siteRoutes(ctx),
    ...configsRoutes(ctx),
    ...devicesRoutes(ctx),
    ...metricsRoutes(ctx),
    ...alertsRoutes(ctx),
    ...minersRoutes(ctx),
    ...groupsRoutes(ctx),
    ...coolingSystemRoutes(ctx),
    ...energySystemRoutes(ctx),
    ...explorerRoutes(ctx)
  ]
}

module.exports = {
  routes
}
