'use strict'

const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

class BaseMock {
  static TYPES = []
  static defaultPort = 8000
  static useControlAgent = true
  static dir = __dirname
  static extraCliOptions = {}

  constructor (ctx = {}) {
    this.ctx = {
      host: '127.0.0.1',
      delay: 0,
      error: false,
      startTime: Date.now(),
      ...ctx,
      port: ctx.port != null ? ctx.port : this.constructor.defaultPort
    }
    this.state = null
    this._loaded = null
    this._stateCleanup = null
    this.transport = null
  }

  createTransport () {
    throw new Error('ERR_ABSTRACT: createTransport() must be implemented by a transport/category mock')
  }

  _validateType () {
    const types = (this.constructor.TYPES || []).map((t) => String(t).toLowerCase())
    if (!types.length) return
    if (!types.includes(String(this.ctx.type || '').toLowerCase())) {
      throw new Error('ERR_UNSUPPORTED')
    }
  }

  _loadState () {
    const dir = path.join(this.constructor.dir, 'initial_states')
    const candidates = [String(this.ctx.type || '').toLowerCase(), 'default'].filter(Boolean)
    const found = candidates.find((name) => fs.existsSync(path.join(dir, `${name}.js`)))
    if (!found) throw new Error('ERR_INVALID_STATE')
    this._loaded = require(path.join(dir, found))(this.ctx)
    this.state = this._loaded.state !== undefined ? this._loaded.state : this._loaded
    this._stateCleanup = typeof this._loaded.cleanup === 'function' ? this._loaded.cleanup : null
  }

  start () {
    this._validateType()
    this._loadState()
    this.transport = this.createTransport()
    this.transport.listen(this.ctx.host, this.ctx.port)
    return this.handle()
  }

  handle () {
    return {
      state: this.state,
      host: this.ctx.host,
      port: this.ctx.port,
      app: this.transport.server || null,
      server: this.transport.server || this.transport.client || null,
      cleanup: this._stateCleanup || (() => this.state),
      ready: this.transport.ready || Promise.resolve(),
      start: () => { if (!this.transport.listening) this.transport.listen(this.ctx.host, this.ctx.port) },
      stop: () => { if (this.transport.listening) this.transport.close() },
      reset: () => (this._stateCleanup ? this._stateCleanup() : this.state),
      exit: () => this.transport.close()
    }
  }

  static create (opts = {}) {
    return new this(opts).start()
  }

  static expose (leafModule) {
    if (leafModule && require.main === leafModule) this.runCli()
    return { createServer: (opts) => this.create(opts) }
  }

  static runCli () {
    const argv = this.parseCli()
    const things = argv.bulk ? JSON.parse(fs.readFileSync(argv.bulk)) : [argv]
    if (this.useControlAgent) {
      const MockControlAgent = require('../../core/mock-control-service/mock-control-agent')
      const agent = new MockControlAgent({ thgs: things, port: argv.mockControlPort })
      agent.init((thing) => this.create(thing))
    } else {
      for (const thing of things) this.create(thing)
    }
  }

  static parseCli () {
    const leafRequire = createRequire(path.join(this.dir, 'server.js'))
    const yargs = leafRequire('yargs/yargs')
    const { hideBin } = leafRequire('yargs/helpers')
    return yargs(hideBin(process.argv))
      .option('port', { alias: 'p', type: 'number', default: this.defaultPort })
      .option('host', { alias: 'h', type: 'string', default: '127.0.0.1' })
      .option('type', { type: 'string', description: 'device model/type' })
      .option('mockControlPort', { type: 'number', description: 'mock-control HTTP API port' })
      .option('delay', { type: 'number', default: 0 })
      .option('bulk', { type: 'string', description: 'JSON file describing multiple device specs' })
      .option('error', { type: 'boolean', default: false, description: 'inject error responses' })
      .options(this.extraCliOptions)
      .parse()
  }
}

module.exports = BaseMock
