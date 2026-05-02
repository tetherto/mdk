'use strict'

const async = require('async')
const WebsocketPlugin = require('@fastify/websocket')
const TetherWrkBase = require('@tetherto/tether-wrk-base/workers/base.wrk.tether')
const AuthLib = require('./lib/auth')
const debug = require('debug')('store:aggr')
const libServer = require('./lib/server')
const GlobalDataLib = require('./lib/globalData')
const { UserService } = require('./lib/users')
const { AlertsService } = require('./lib/alerts')
const { auditLogger } = require('./lib/server/lib/auditLogger')
const { createDataProxy } = require('./lib/data.proxy')
const { AUTH_CACHE_TTL } = require('./lib/constants')

class WrkServerHttp extends TetherWrkBase {
  constructor (conf, ctx) {
    super(conf, ctx)

    if (!ctx.port) {
      throw new Error('ERR_HTTP_PORT_INVALID')
    }

    this.storeDir = 'http'
    this.prefix = `${this.wtype}-${ctx.port}`
    this.noAuth = !!this.ctx.noauth
    this.queuedRequests = new Map()
    this.wsClients = new Set()

    this.isRpcMode = ctx.isRpcMode !== false
    if (ctx.ork) this.ork = ctx.ork
    this.dataProxy = createDataProxy(this)

    this.init()
    this.start()
  }

  init () {
    super.init()

    this._loadOptionalConfig()

    this.setInitFacs([
      ['fac', '@bitfinex/bfx-facs-interval', '0', '0', {}, -10],
      ['fac', '@bitfinex/bfx-facs-lru', '10s', '10s', { max: 10000, maxAge: 10000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '15s', '15s', { max: 10000, maxAge: 15000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '30s', '30s', { max: 10000, maxAge: 30000 }],
      ['fac', '@bitfinex/bfx-facs-lru', '1m', '1m', { max: 10000, maxAge: AUTH_CACHE_TTL }],
      ['fac', '@bitfinex/bfx-facs-lru', '15m', '15m', { max: 10000, maxAge: 60000 * 15 }],
      ['fac', '@bitfinex/bfx-facs-db-sqlite', 'auth', 'auth', { name: 'mdk-app-node', persist: true }],
      ['fac', '@bitfinex/bfx-facs-http', 'c0', 'c0', { timeout: 30000, debug: false }, 0],
      ['fac', '@tetherto/svc-facs-httpd', 'h0', 'h0', {
        staticRootPath: this.conf.staticRootPath,
        staticOn404File: 'index.html',
        port: this.ctx.port,
        logger: true,
        addDefaultRoutes: true,
        trustProxy: true
      }, 0],
      ['fac', '@tetherto/svc-facs-httpd-oauth2', 'h0', 'h0', {}, 0],
      ['fac', '@tetherto/svc-facs-httpd-oauth2', 'h1', 'h1', {}, 0],
      ['fac', '@tetherto/svc-facs-auth', 'a0', 'a0', () => ({
        sqlite: this.dbSqlite_auth,
        lru: this.lru_15m
      }), 3]
    ])

    this.mem = {
      log: {}
    }
  }

  _loadOptionalConfig () {
    try {
      this.loadConf('audit.logger', 'auditLogConf')
      auditLogger.setConfig(this.conf.auditLogConf)
    } catch {
      debug('Skipping optional config: audit.logger')
    }
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
        const httpdAuth = this.httpdOauth2_h0
        const httpdAuthMicrosoft = this.httpdOauth2_h1

        if (!this.noAuth) {
          httpd.addPlugin(httpdAuth.injection())
          httpd.addPlugin(httpdAuthMicrosoft.injection())
        }

        httpd.addPlugin([WebsocketPlugin, {}])

        libServer.routes(this).forEach(r => {
          httpd.addRoute(r)
        })

        this.ctx.additionalRoutes?.forEach(r => {
          httpd.addRoute(r)
        })

        httpd.addHook('onError', async (request, reply, error) => {
          const isSafe = error.message && error.message.startsWith('ERR_')
          const message = isSafe ? error.message : 'Bad Request'

          if (!isSafe) {
            debug('onError handler:', error.message)
          }

          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message
          })
        })

        if (!this.noAuth) {
          this.userService = new UserService({
            sqlite: this.dbSqlite_auth,
            auth: this.auth_a0
          })

          this.authLib = new AuthLib({
            httpc: this.http_c0,
            httpd,
            auth: this.auth_a0,
            userService: this.userService
          })
        }

        await httpd.startServer()

        if (!this.noAuth) {
          await this.authLib.migrateUsers(httpdAuth)
          await this.authLib.start()
        }

        if (this.authLib) {
          this.interval_0.add('cleanupTokens', async () => {
            try {
              await this.authLib.cleanupTokens()
            } catch (err) {
              console.error(new Date().toISOString(), err)
            }
          }, 15 * 60 * 1000)
        }

        this.alertsService = new AlertsService({ dataProxy: this.dataProxy })
        this.interval_0.add('broadcastAlerts', async () => {
          try {
            await this.alertsService.broadcastAlerts(this.wsClients)
          } catch (err) {
            console.error(new Date().toISOString(), err)
          }
        }, 5 * 1000)

        this.globalDataBee = await this.store_s0.getBee(
          { name: 'global-data' },
          { keyEncoding: 'utf-8', valueEncoding: 'json' }
        )
        await this.globalDataBee.ready()
        this.globalDataLib = new GlobalDataLib(this.globalDataBee, this.conf.site)

        // rpc client key to be allowed through destination server firewall
        this.status.rpcClientKey = this.net_r0.dht.defaultKeyPair.publicKey.toString('hex')
        this.saveStatus()
      }
    ], cb)
  }
}

module.exports = WrkServerHttp
