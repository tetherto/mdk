'use strict'

const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const fastify = require('fastify')
const MockControlAgent = require('./mock-control-agent')

/**
 * Creates a mock control agent
 * @param things
 * @param mockControlPort
 * @returns {MockControlAgent}
 */
const createMockControlAgent = (things, mockControlPort) => {
  return new MockControlAgent({
    thgs: things,
    port: mockControlPort
  })
}

if (require.main === module) {
  const argv = yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      type: 'number',
      description: 'port to run on',
      default: 8000
    })
    .option('host', {
      alias: 'h',
      type: 'string',
      description: 'host to run on',
      default: '127.0.0.1'
    })
    .option('mockControlPort', {
      description: 'Mock control port',
      type: 'number'
    })
    .option('delay', {
      description: 'delay in ms',
      type: 'number',
      default: 0
    })
    .option('bulk', {
      description: 'bulk file',
      type: 'string'
    })
    .option('error', {
      description: 'send errored response',
      type: 'boolean',
      default: false
    })
    .parse()

  const things = argv.bulk ? JSON.parse(fs.readFileSync(argv.bulk)) : [argv]
  const agent = createMockControlAgent(things, argv.mockControlPort)
  agent.init(runServer)
} else {
  module.exports = {
    createServer: runServer
  }
}

function addDelay (req, res, data, next) {
  if (req.ctx.delay) {
    setTimeout(next, req.ctx.delay)
  } else {
    next()
  }
}

function runServer (argv) {
  const CTX = {
    startTime: Date.now(),
    host: argv.host,
    port: argv.port,
    serial: argv.serial,
    delay: argv.delay,
    error: argv.error,
    usernames: argv.usernames ? argv.usernames.split(',') : ['haven7346']
  }

  const STATE = {}

  const cmdPaths = ['./initial_states/default']
  let cpath = null

  cmdPaths.forEach(p => {
    if (fs.existsSync(path.resolve(__dirname, p) + '.js')) {
      cpath = p
      return false
    }
  })

  try {
    debug(new Date(), `Loading initial state from ${cpath}`)
    Object.assign(STATE, require(cpath)(CTX))
  } catch (e) {
    throw Error('ERR_INVALID_STATE', e)
  }

  const addF2PoolContext = (req, res, next) => {
    req.ctx = CTX
    req.state = STATE.state
    next()
  }

  const authenticate = (req, res, next) => {
    const apiSecret = req.headers['f2p-api-secret']
    if (!apiSecret || apiSecret !== 'secret-key') {
      return res.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or missing API secret'
      })
    }
    next()
  }

  const app = fastify()

  try {
    const router = require('./routers/base.js')
    app.addHook('onRequest', authenticate)
    app.addHook('onRequest', addF2PoolContext)
    app.addHook('onSend', addDelay)
    router(app)
  } catch (e) {
    throw new Error('ERR_ROUTER_NOTFOUND')
  }

  app.addHook('onClose', STATE.cleanup)
  app.listen({ port: argv.port, host: argv.host }, function (err, addr) {
    if (err) {
      throw err
    }
    debug(`Server listening for HTTP requests on socket ${addr}`)
  })

  return {
    app,
    state: STATE.state,
    start: () => {
      if (!app.server) {
        app.listen(CTX.port, CTX.host)
      }
    },
    stop: () => {
      if (app.server) {
        app.close()
      }
    },
    reset: () => {
      return STATE.cleanup()
    },
    exit: () => {
      app.close()
      process.exit(0)
    }
  }
}
