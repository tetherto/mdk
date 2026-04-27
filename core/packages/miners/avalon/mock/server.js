'use strict'

const net = require('net')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
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
      default: 4028
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
    .option('serial', {
      description: 'miner serial',
      type: 'string',
      default: '0000000000000000'
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

function runServer (argv, ops = {}) {
  const CTX = {
    startTime: Date.now(),
    host: argv.host,
    port: argv.port,
    serial: argv.serial,
    type: argv.type,
    error: argv.error,
    delay: argv.delay,
    minerpoolMockPort: argv.minerpoolMockPort,
    minerpoolMockHost: argv.minerpoolMockHost
  }
  const STATE = {}

  const MINER_TYPES = ['a1346']

  if (!MINER_TYPES.includes(CTX.type?.toLowerCase())) {
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

  const processCmd = async (socket, chunk) => {
    const req = chunk.toString()
    const id = req.ctx?.mockControl?.generateId()

    debug('Received data from client on port %d: %s', CTX.port, req)
    let command

    if (req.includes('ascset')) command = 'ascset_' + req.split(',')[1]
    else command = req

    debug('Command: %s', command)

    if (ops.onRequest) {
      ops.onRequest(req)
    }

    const cmdPaths = [`./cmds/${CTX.type}/${command}`, `./cmds/${command}`]
    let cpath = null

    cmdPaths.forEach((p) => {
      if (fs.existsSync(path.resolve(__dirname, p) + '.js')) {
        cpath = p
        return false
      }
    })

    try {
      if (!cpath) {
        throw new Error('ERR_CMD_NOTFOUND')
      }

      const res = require(cpath)(CTX, STATE.state, req, id)
      if (ops.onResponse) {
        ops.onResponse(req, res)
      }
      debug('Sending response to client: %s', res)
      CTX.delay && await promiseSleep(CTX.delay)
      socket.write(res)
    } catch (e) {
      debug(e)
    }
  }

  const server = new net.Server()

  server.listen(argv.port, argv.host, function () {
    debug(`Server listening for connection requests on socket ${argv.host}:${argv.port}`)
  })

  server.on('close', STATE.cleanup)
  server.on('connection', function (socket) {
    debug('A new connection has been established.')

    socket.on('data', async function (chunk) {
      await processCmd(socket, chunk)
      socket.end() // send FIN packet as Avalon does
    })
  })

  return {
    state: STATE.state,
    exit: () => {
      server.close()
    },
    start: () => {
      // if server is not running
      if (server.listening) {
        return
      }

      server.listen(argv.port, argv.host, function () {
        debug(`Server listening for connection requests on socket ${argv.host}:${argv.port}`)
      })
    },
    stop: () => {
      // if server is not running
      if (!server.listening) {
        return
      }

      server.close()
    },
    reset: () => {
      return STATE.cleanup()
    }
  }
}
