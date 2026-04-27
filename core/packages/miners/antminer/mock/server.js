'use strict'

const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const fastify = require('fastify')
const passport = require('@fastify/passport')
const fastifySecureSession = require('@fastify/secure-session')
const DigestStrategy = require('passport-http').DigestStrategy

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
    .option('type', {
      description: 'miner type',
      type: 'string'
    })
    .option('mockControlPort', {
      description: 'mock control port',
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
    .option('password', {
      description: 'password',
      type: 'string',
      default: 'root'
    })
    .option('minerpoolMockPort', {
      type: 'number',
      description: 'minerpool mock port',
      default: 8000
    })
    .option('minerpoolMockHost', {
      type: 'string',
      description: 'minerpool mock host',
      default: '127.0.0.1'
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

function runServer (argv, ops = {}) {
  const CTX = {
    startTime: Date.now(),
    host: argv.host,
    port: argv.port,
    type: argv.type,
    serial: argv.serial,
    delay: argv.delay,
    password: argv.password,
    error: argv.error,
    minerpoolMockPort: argv.minerpoolMockPort,
    minerpoolMockHost: argv.minerpoolMockHost
  }
  const STATE = {}

  const MINER_TYPES = ['s19xp', 's19xp_h', 's21', 's21pro']

  if (!MINER_TYPES.includes(CTX.type.toLowerCase())) {
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

  const addMinerContext = (req, res, next) => {
    req.ctx = CTX
    req.state = STATE.state
    next()
  }

  passport.use(new DigestStrategy({ qop: 'auth', realm: 'antMiner Configuration' },
    function (username, done) {
      return done(null, username, CTX.password)
    }
  ))

  const app = fastify()
  app.register(fastifySecureSession, {
    secret: 'averylongphrasebiggerthanthirtytwochars',
    salt: 'mq9hDxBVDbspDR6n',
    cookie: {
      path: '/',
      httpOnly: true
    }
  })
  app.register(passport.initialize())

  try {
    const router = require(`./routers/${CTX.type.toLowerCase()}.js`)
    app.addHook('onRequest', passport.authenticate('digest', { session: false }))
    app.addHook('onRequest', addMinerContext)
    app.addHook('onSend', addDelay)
    router(app)
  } catch (e) {
    console.log(e)
    throw new Error('ERR_ROUTER_NOTFOUND')
  }

  app.addHook('onClose', STATE.cleanup)
  app.listen({ port: argv.port, host: argv.host }, function (err, addr) {
    if (err) {
      debug(err)
      throw err
    }
    debug(`Server listening for HTTP requests on socket ${addr}`)
  })

  return {
    state: STATE.state,
    stop: () => {
      app.close()
    },
    start: () => {
      if (app.server.listening) {
        return
      }

      app.listen({ port: argv.port, host: argv.host }, function (err, addr) {
        if (err) {
          debug(err)
          throw err
        }
        debug(`Server listening for HTTP requests on socket ${addr}`)
      })
    },
    reset: () => {
      return STATE.cleanup()
    },
    exit: () => {
      if (app.server.listening) {
        app.close()
      }
    }
  }
}
