'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const async = require('async')
const LRU = require('lru')
const TetherWrkBase = require('@tetherto/tether-wrk-base/workers/base.wrk.tether')
const createLogger = require('debug')
const debug = createLogger('store:aggr')
const { createRuntimeClient, getOrCreateSeed, resolvePluginDir } = require('@tetherto/mdk-app-runtime')
const { loadPlugin } = require('@tetherto/mdk-app-runtime/lib/plugin-loader')
const { buildFastifyRoutes, errorResponse, resolveAppTimeout } = require('./lib/plugin-adapter')
const { createAuthRoutes } = require('./lib/auth-routes')
const { fastifyLoggerOptions, gatewayLogger } = require('./lib/logger')
const { resolveSecurityOptions, buildHostAllowlist, createHostCheck } = require('./lib/security')
const { resolveStoreDir } = require('./lib/utils')

// Publishes the key app runtimes allow-list. The directory is private to this
// user and the file is not group/other-writable (runtimes refuse one that is),
// and it is replaced atomically so a runtime never reads half a key.
function writeGatewayKeyFile (file, key) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`
  try {
    fs.writeFileSync(tmp, key, { mode: 0o644, flag: 'wx' })
    fs.chmodSync(tmp, 0o644) // the umask may have narrowed it; never widened past 0o644
    fs.renameSync(tmp, file)
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch {}
    throw err
  }
}

// The gateway's DHT settings: ctx.kernelBootstrap / ctx.kernelDhtHost from
// startGateway, or the same names as CLI flags (a comma-separated string) when
// the gateway is spawned as a service.
function resolveDhtOpts (ctx) {
  let bootstrap = ctx.kernelBootstrap
  if (typeof bootstrap === 'string') bootstrap = bootstrap.split(',').map(s => s.trim()).filter(Boolean)
  const out = {}
  if (Array.isArray(bootstrap)) out.bootstrap = bootstrap
  if (ctx.kernelDhtHost) out.host = String(ctx.kernelDhtHost)
  return out
}

class WrkServerHttp extends TetherWrkBase {
  constructor (conf, ctx) {
    super(conf, ctx)

    if (!ctx.port) {
      throw new Error('ERR_HTTP_PORT_INVALID')
    }

    this.storeDir = 'http'
    this.prefix = `${this.wtype}-${ctx.port}`
    this.queuedRequests = new Map()

    this.init()
    this.start()
  }

  init () {
    super.init()

    const storeFac = (this.conf.init?.facilities || []).find(([, mod, name]) => mod === '@tetherto/hp-svc-facs-store' && name === 's0')
    if (storeFac) storeFac[4] = { ...storeFac[4], storeDir: resolveStoreDir(storeFac[4].storeDir, this.ctx) }

    // Every DHT node this gateway starts uses the same bootstrap list and bind
    // interface: the net facility (the key a Kernel and Workers admit), the
    // Kernel client and the app runtime client. Without this the net facility
    // would join the public HyperDHT even on a private network.
    this._dhtOpts = resolveDhtOpts(this.ctx)
    if (this._dhtOpts.bootstrap) this.ctx.kernelBootstrap = this._dhtOpts.bootstrap
    const netFac = (this.conf.init?.facilities || []).find(([, mod, name]) => mod === '@tetherto/hp-svc-facs-net' && name === 'r0')
    if (netFac && Object.keys(this._dhtOpts).length) {
      const base = netFac[4]
      netFac[4] = () => {
        const opts = typeof base === 'function' ? base.call(this) : { ...base }
        return { ...opts, dhtOpts: { ...(opts.dhtOpts || {}), ...this._dhtOpts } }
      }
    }

    // Validated up front so a bad option fails the boot, not the first request.
    this._security = resolveSecurityOptions(this.conf, this.ctx)
    resolveAppTimeout(this.conf)

    for (const [label, maxAge] of [['10s', 10000], ['15s', 15000], ['30s', 30000], ['1m', 60000], ['15m', 60000 * 15]]) {
      this[`lru_${label}`] = new LRU({ max: 10000, maxAge })
    }

    this.setInitFacs([
      ['fac', '@tetherto/svc-facs-httpd', 'h0', 'h0', {
        // Static serving is opt-in: only when common.json sets staticRootPath.
        staticRootPath: this.conf.staticRootPath,
        staticOn404File: 'index.html',
        port: this.ctx.port,
        logger: fastifyLoggerOptions(this.conf),
        // No GET /echo: the gateway serves only what its plugins and caller declare.
        addDefaultRoutes: false,
        trustProxy: this._security.trustProxy,
        bodyLimit: this._security.bodyLimit
      }, 0]
    ])

    // ctx.apps (`{ name, appDir, keyFile, mount? }`) is the complete inventory
    // of a gateway's app routes. Each app runs in its own runtime process: only
    // its route table is read here, and every request is forwarded over HRPC.
    this._apps = (this.ctx.apps || []).map(app => ({
      ...app,
      routes: loadPlugin(resolvePluginDir(app.appDir), undefined, { handlers: false }).routes
    }))
    this._runtimeClient = null
  }

  debugGeneric (msg) {
    debug(`[HTTP/${this.ctx.shard}]`, ...arguments)
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      async () => {
        await this.net_r0.startRpcServer()

        const httpd = this.httpd_h0
        const security = this._security
        const log = gatewayLogger(this.conf)

        // Registered before any route so their onRoute/onRequest hooks cover
        // every plugin and additional route.
        if (security.helmet) httpd.addPlugin([require('@fastify/helmet'), security.helmet])
        else log.warn('security headers (helmet) are disabled')
        if (security.rateLimit) httpd.addPlugin([require('@fastify/rate-limit'), security.rateLimit])
        else log.warn('rate limiting is disabled')

        const hostAllowlist = buildHostAllowlist(security.allowedHosts, {
          port: String(this.ctx.port),
          host: httpd.opts.host || httpd.conf?.host
        })
        if (hostAllowlist) httpd.addHook('onRequest', createHostCheck(hostAllowlist))
        else log.warn('allowedHosts contains "*": the Host check is off, so DNS rebinding is not blocked')

        this.ctx.additionalRoutes?.forEach(r => {
          httpd.addRoute(r)
        })

        // spec.rbac at the Gateway: sign-in routes, and a token plus a rule on every app route.
        const authority = this.ctx.authority || null
        if (authority) {
          await authority.start()
          createAuthRoutes(authority).forEach(r => httpd.addRoute(r))
        }

        if (this._apps.length || this.ctx.gatewayKeyFile) {
          // One stable key, across restarts, for every app runtime to allow-list.
          const seed = getOrCreateSeed(path.join(this.ctx.root, 'identity', 'seedRuntimeClient'))
          this._runtimeClient = createRuntimeClient({ seed, bootstrap: this._dhtOpts.bootstrap, dhtHost: this._dhtOpts.host })
          await this._runtimeClient.connect()
        }

        for (const app of this._apps) {
          buildFastifyRoutes(app, this._runtimeClient, this, { authority, authVerifier: security.authVerifier }).forEach(r => {
            httpd.addRoute(r)
          })
        }

        if (!authority && !security.authVerifier) {
          const closed = this._apps.flatMap(a => a.routes.filter(r => r.auth === true).map(r => r.id))
          if (closed.length) log.warn(`no authVerifier configured: ${closed.length} auth: true route(s) answer 401 (${closed.join(', ')})`)
        }

        httpd.addErrorHandler((err, request, reply) => {
          const body = errorResponse(err, request.log)
          reply.status(body.statusCode).send(body)
        })

        await httpd.startServer()

        // The net facility's DHT client key; startGateway publishes it to the
        // trusted-keys dir as gateway.pub. App routes use appClientKey below.
        this.status.rpcClientKey = this.net_r0.dht.defaultKeyPair.publicKey.toString('hex')

        // The key app runtimes allow-list (their allowedKeyFiles), published
        // once the listener is up.
        if (this._runtimeClient) {
          this.status.appClientKey = this._runtimeClient.publicKey.toString('hex')
          if (this.ctx.gatewayKeyFile) {
            writeGatewayKeyFile(this.ctx.gatewayKeyFile, this.status.appClientKey)
          }
        }
        this.saveStatus()
      }
    ], cb)
  }

  _stop (cb) {
    async.series([
      next => { super._stop(next) },
      async () => {
        const client = this._runtimeClient
        this._runtimeClient = null
        if (client) await client.close()
        if (this.ctx.authority) await this.ctx.authority.close()
      }
    ], cb)
  }
}

module.exports = WrkServerHttp
module.exports.writeGatewayKeyFile = writeGatewayKeyFile
module.exports.resolveDhtOpts = resolveDhtOpts
