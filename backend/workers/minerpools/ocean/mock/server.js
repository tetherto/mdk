'use strict'

const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const fastify = require('fastify')

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
    .option('delay', {
      description: 'delay in ms',
      type: 'number',
      default: 0
    })
    .parse()

  runServer(argv)
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
    delay: argv.delay,
    error: argv.error
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

  const addOceanContext = (req, res, next) => {
    req.ctx = CTX
    req.state = STATE.state
    next()
  }

  const app = fastify({ logger: false })

  try {
    const router = require('./routers/base.js')
    app.addHook('onRequest', addOceanContext)
    app.addHook('onSend', addDelay)
    router(app)
  } catch (e) {
    console.error('Error loading router:', e)
    throw e
  }

  app.addHook('onClose', STATE.cleanup)
  app.listen({ port: argv.port, host: argv.host }, function (err, addr) {
    if (err) {
      throw err
    }
    console.log(`Mock Ocean API server listening on ${addr}`)
  })

  return {
    app,
    state: STATE.state,
    start: () => {
      if (!app.server) {
        app.listen(CTX.port, CTX.host)
      }
    },
    stop: async () => {
      if (app.server) {
        // Close all connections and the server
        return new Promise((resolve) => {
          app.close(() => {
            // Also close the underlying server if it exists
            if (app.server && typeof app.server.close === 'function') {
              app.server.close(() => resolve())
            } else {
              resolve()
            }
          })
          // Force resolve after timeout to prevent hanging
          setTimeout(resolve, 500)
        })
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
