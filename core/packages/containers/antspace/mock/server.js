'use strict'

const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const fastify = require('fastify')
const MockControlAgent = require('./mock-control-agent')
const crypto = require('crypto')

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
    .option('type', {
      description: 'container type',
      type: 'string'
    })
    .option('error', {
      description: 'send errored response',
      type: 'boolean',
      default: false
    })
    .option('bulk', {
      description: 'bulk file',
      type: 'string'
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

function runServer (argv, ops = {}) {
  const CTX = {
    startTime: Date.now(),
    host: argv.host,
    port: argv.port,
    type: argv.type,
    serial: argv.serial,
    error: argv.error,
    password: crypto.randomBytes(4).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 4)
  }
  const STATE = {}

  const CONTAINER_TYPES = ['hk3', 'immersion']

  if (!CONTAINER_TYPES.includes(CTX.type.toLowerCase())) {
    throw Error('ERR_UNSUPPORTED')
  }

  const cmdPaths = ['./initial_states/default', `./initial_states/${CTX.type.toLowerCase()}`]
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
    throw Error('ERR_INVALID_STATE')
  }

  const addContainerContext = (req, res, next) => {
    req.ctx = CTX
    req.state = STATE.state

    if (ops.mockControl) {
      ops.mockControl?.onRequest(req, res)
    }
    next()
  }

  const app = fastify()

  try {
    const router = require('./routers/base.js')
    app.addHook('onRequest', addContainerContext)
    router(app)
  } catch (e) {
    debug(e)
    throw new Error('ERR_ROUTER_NOTFOUND')
  }

  app.addHook('onClose', STATE.cleanup)

  const ready = new Promise((resolve, reject) => {
    app.listen({ port: argv.port, host: argv.host }, function (err, addr) {
      if (err) {
        debug(err)
        reject(err)
        return
      }
      debug(`Server listening for HTTP requests on socket ${addr}`)
      resolve(addr)
    })
  })

  return {
    state: STATE.state,
    host: argv.host,
    port: argv.port,
    ready,
    exit: () => {
      app.close()
    },
    start: () => {
      // if server isn't listening, start it
      if (!app.server.listening) {
        app.listen({ port: argv.port, host: argv.host }, function (err, addr) {
          if (err) {
            debug(err)
            throw err
          }
          debug(`Server listening for HTTP requests on socket ${addr}`)
        })
      }
    },
    stop: () => {
      // if server is listening, stop it
      if (app.server.listening) {
        app.close()
      }
    },
    reset: () => {
      return STATE.cleanup()
    }
  }
}
