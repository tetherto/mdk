'use strict'

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const modbus = require('modbus-stream')
const fs = require('fs')
const path = require('path')
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
      default: 5020
    })
    .option('host', {
      alias: 'h',
      type: 'string',
      description: 'host to run on',
      default: '127.0.0.1'
    })
    .option('type', {
      description: 'sensor type',
      type: 'string'
    })
    .option('error', {
      description: 'send errored response',
      type: 'boolean',
      default: false
    })
    .option('mockControlPort', {
      description: 'mock control port',
      type: 'number'
    })
    .option('bulk', {
      description: 'bulk file',
      type: 'string'
    })
    .parse()

  if (argv.bulk) {
    const bulkFile = fs.readFileSync(argv.bulk)
    const bulkJson = JSON.parse(bulkFile)
    const agent = createMockControlAgent(bulkJson, argv.mockControlPort)

    agent.init(runServer)
  } else {
    const agent = createMockControlAgent([argv], argv.mockControlPort)
    agent.init(runServer)
  }
} else {
  module.exports = {
    createServer: runServer
  }
}

function runServer (argv) {
  const CTX = {
    startTime: Date.now(),
    host: argv.host,
    port: argv.port,
    type: argv.type,
    error: argv.error
  }

  const SENSOR_TYPES = ['seneca']

  if (!SENSOR_TYPES.includes(CTX.type.toLowerCase())) {
    throw Error('ERR_UNSUPPORTED')
  }

  const statesPaths = ['./initial_states/default', `./initial_states/${CTX.type.toLowerCase()}`]
  let spath = null

  statesPaths.forEach(p => {
    if (fs.existsSync(path.resolve(__dirname, p) + '.js')) {
      spath = p
      return false
    }
  })

  if (!spath) {
    throw Error('ERR_UNSUPPORTED')
  }

  const STATE = {}

  try {
    debug(new Date(), `Loading initial state from ${spath}`)
    Object.assign(STATE, require(spath)())
  } catch (e) {
    throw Error('ERR_INVALID_STATE')
  }

  const { bind, cleanup } = require(spath)(CTX)

  const server = modbus.tcp.server({ debug: null }, (connection) => {
    bind(connection)
  }).listen(argv.port, argv.host, () => {
    debug(`Server listening on socket ${argv.host}:${argv.port}`)
  })

  return {
    state: STATE.state,
    server,
    cleanup,
    reset: () => {
      return STATE.cleanup()
    },
    start: () => {
      // if not started
      if (!server.listening) {
        server.listen(argv.port, argv.host, () => {
          debug(`Server listening on socket ${argv.host}:${argv.port}`)
        })
      }
    },
    stop: () => {
      server.close()
    }
  }
}
