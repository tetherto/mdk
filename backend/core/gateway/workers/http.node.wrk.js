'use strict'

const async = require('async')
const TetherWrkBase = require('@tetherto/tether-wrk-base/workers/base.wrk.tether')
const createLogger = require('debug')
const debug = createLogger('store:aggr')
const { loadPlugin } = require('./lib/plugin-loader')
const { buildFastifyRoutes, errorResponse } = require('./lib/plugin-adapter')
const { buildPluginContext } = require('./lib/plugin-gateway')
const { fastifyLoggerOptions, gatewayLogger } = require('./lib/logger')

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

    this.setInitFacs([
      ['fac', '@bitfinex/bfx-facs-lru', '10s', '10s', { max: 10000, maxAge: 10000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '15s', '15s', { max: 10000, maxAge: 15000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '30s', '30s', { max: 10000, maxAge: 30000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '1m', '1m', { max: 10000, maxAge: 60000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '15m', '15m', { max: 10000, maxAge: 60000 * 15 }],
      ['fac', '@tetherto/svc-facs-httpd', 'h0', 'h0', {
        staticRootPath: this.conf.staticRootPath,
        staticOn404File: 'index.html',
        port: this.ctx.port,
        logger: fastifyLoggerOptions(this.conf),
        addDefaultRoutes: true,
        trustProxy: true
      }, 0]
    ])

    this._plugins = []
    // Before the first registerPlugin call below, because loading a plugin is
    // what fills this: onReady is registered from a plugin's module code.
    this._readyWaiters = []

    // Nothing is registered that the caller did not name: `spec.gateway.plugins`
    // (or, programmatically, opts.extraPluginDirs) is the complete inventory of a
    // gateway's HTTP routes. Three plugins used to be registered here regardless
    // — telemetry, site-hashrate, site-monitor — which meant a stack that
    // declared two of them served eleven more routes nobody had asked for, and
    // no reading of mdk.yaml could tell you so. They still ship in
    // @tetherto/mdk-plugins; a stack that wants one names it like any other
    // package (bundledPluginDir() / a "@tetherto/mdk-plugins/<name>" subpath).
    //
    // Entries are a plugin dir, or { dir, config } when the stack spec carries
    // per-plugin config (spec.gateway.plugins[].config).
    for (const entry of this.ctx.extraPluginDirs || []) {
      if (typeof entry === 'string') this.registerPlugin(entry)
      else this.registerPlugin(entry.dir, entry.config)
    }
  }

  // Loads a plugin's manifest and controllers, binding them to a per-plugin
  // context exposed to the plugin as '@tetherto/mdk-gateway/plugin'.
  registerPlugin (pluginDir, pluginConf) {
    // buildPluginContext constructs everything a plugin sees as
    // '@tetherto/mdk-gateway/plugin' — plugins never touch the worker.
    const { context } = buildPluginContext(this, pluginDir, pluginConf)
    const plugin = loadPlugin(pluginDir, context)
    this._plugins.push(plugin)
    debug('registered plugin %s (%d routes)', plugin.manifest.name, plugin.routes.length)
  }

  debugGeneric (msg) {
    debug(`[HTTP/${this.ctx.shard}]`, ...arguments)
  }

  // The plugin context's onReady (see lib/plugin-gateway.js). Plugins are loaded
  // in init() and the listener opens in _start(), so load time is always too
  // early for a plugin that needs this gateway to answer. Registering after the
  // gateway is already serving is not a mistake (a plugin may do it from a
  // request), so it runs the callback rather than dropping it, on a fresh tick
  // to keep the two orders alike.
  onGatewayReady (fn) {
    if (this._serving) queueMicrotask(fn)
    else this._readyWaiters.push(fn)
  }

  // Everything this gateway serves is up. Callbacks are fire-and-forget: what a
  // plugin does here is its own, and neither the boot nor the next plugin waits
  // on it. A throw is reported against the gateway rather than propagated, for
  // the same reason.
  _notifyGatewayReady () {
    this._serving = true
    const waiters = this._readyWaiters
    this._readyWaiters = []

    for (const fn of waiters) {
      try {
        fn()
      } catch (err) {
        gatewayLogger(this.conf).warn(`a plugin's onReady callback threw: ${err.message}`)
      }
    }
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      async () => {
        await this.net_r0.startRpcServer()

        const httpd = this.httpd_h0

        this.ctx.additionalRoutes?.forEach(r => {
          httpd.addRoute(r)
        })

        for (const plugin of this._plugins) {
          buildFastifyRoutes(plugin, this).forEach(r => {
            httpd.addRoute(r)
          })
        }

        httpd.addErrorHandler((err, request, reply) => {
          const body = errorResponse(err, request.log)
          reply.status(body.statusCode).send(body)
        })

        await httpd.startServer()

        // rpc client key to be allowed through destination server firewall
        this.status.rpcClientKey = this.net_r0.dht.defaultKeyPair.publicKey.toString('hex')
        this.saveStatus()

        // Last, so that a plugin waiting on the gateway waits for all of it:
        // the HTTP listener is up and every route is mounted by this point, so a
        // plugin that calls out from onReady cannot race the server it needs.
        this._notifyGatewayReady()
      }
    ], cb)
  }
}

module.exports = WrkServerHttp
