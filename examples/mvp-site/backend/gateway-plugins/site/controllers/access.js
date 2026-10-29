'use strict'

const path = require('path')
const { compilePolicy, routeAccess, deviceName, brandSlug } = require('@tetherto/mdk-rbac')
const manifest = require('../mdk-plugin.json')
const { loadSite } = require('./utils')

// spec.rbac names this app's routes <app>/<path>, the app being the plugin dir's name.
const APP_NAME = path.basename(path.join(__dirname, '..'))

// The routes the UI offers as an action on one miner.
const MINER_ACTIONS = Object.freeze({ command: 'site.miner-command', pools: 'site.miner-pools' })

// The brand a miner's Kernel name carries (its worker contract's metadata.brand,
// as a slug). The Kernel registry does not hand it out, so it is read from the
// device type the worker assigns, else the workerId, as the UI does
// (ui/src/utils.ts minerFamily). SealMiners report no device type.
const BRANDS = Object.freeze({ 'miner-wm': 'whatsminer', 'miner-am': 'antminer', 'miner-av': 'avalon' })
const WORKER_BRANDS = Object.freeze(['whatsminer', 'antminer', 'sealminer', 'avalon'])
const minerBrand = (thg) => {
  const type = Object.keys(BRANDS).find((prefix) => (thg.type || '').startsWith(prefix))
  if (type) return BRANDS[type]
  const workerId = String(thg.workerId || '').toLowerCase()
  return WORKER_BRANDS.find((brand) => workerId.includes(brand)) || null
}

const signInRequired = () => Object.assign(new Error('ERR_SIGN_IN_REQUIRED'), { statusCode: 401 })

// What the signed-in user may do here, worked out from the policy the Kernel
// enforces, so the UI shows only the pages and actions open to them. It is
// advice: the Gateway checks every route call, and the Kernel every device
// call, against the same policy.
//
// The app reads the policy and the miner list as itself (config.mdkClient),
// not as the user, who need not be allowed either.
//
// `ctx` is a test-only seam: tests pass `{ mdkClient }` directly.
module.exports = async (req, ctx) => {
  const mdkClient = ctx === undefined ? require('../lib/client') : ctx.mdkClient
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const info = (req && req._info) || {}
  if (!info.kind || !info.sub) throw signInRequired()
  const identity = { kind: info.kind, sub: info.sub, ...(info.email ? { email: info.email } : {}), groups: info.groups || [] }

  const { record } = (await mdkClient.getRbac()) || {}
  const policy = compilePolicy(record ? record.policy : null)
  const allows = (request) => policy.evaluate(identity, request).allowed

  const routes = {}
  for (const route of manifest.routes) {
    const { resource, verb } = routeAccess(APP_NAME, { method: route.http.method, path: route.http.path, verb: route.verb })
    routes[route.id] = allows({ resource, verb })
  }

  const miners = Object.fromEntries(Object.keys(MINER_ACTIONS).map((action) => [action, []]))
  if (Object.values(MINER_ACTIONS).some((id) => routes[id])) {
    const { byFamily } = await loadSite(mdkClient)
    for (const thg of byFamily.miner || []) {
      const brand = minerBrand(thg)
      const resourceName = brand ? deviceName({ family: 'miner', brand: brandSlug(brand), worker: thg.workerId, device: thg.id }) : undefined
      const writable = allows({ resource: 'devices', verb: 'write', ...(resourceName ? { resourceName } : {}) })
      for (const [action, routeId] of Object.entries(MINER_ACTIONS)) {
        if (writable && routes[routeId]) miners[action].push(thg.id)
      }
    }
  }

  return {
    user: identity,
    roles: policy.rolesFor(identity),
    routes,
    miners
  }
}
