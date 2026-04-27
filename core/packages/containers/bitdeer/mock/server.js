'use strict'

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const mqtt = require('mqtt')
const fs = require('fs')
const path = require('path')
const debug = require('debug')('mock')
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
      default: 10883
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
    .option('id', {
      description: 'container id',
      type: 'string',
      default: 'C024_D40'
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
    .parseSync()

  const things = argv.bulk ? JSON.parse(fs.readFileSync(argv.bulk)) : [argv]
  const agent = createMockControlAgent(things, argv.mockControlPort)
  agent.init(runServer)
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
    id: argv.id,
    error: argv.error
  }

  const CONTAINER_TYPES = ['d40_m56', 'd40_m30', 'd40_a1346', 'd40_s19xp']

  const [type, ...cap] = CTX.type.split('+')
  CTX.type = type
  CTX.cap = cap

  if (!CONTAINER_TYPES.includes(CTX.type.toLowerCase())) {
    throw Error('ERR_UNSUPPORTED')
  }

  const cmdPaths = ['./d40/default', `./d40/${CTX.type.toLowerCase()}`]
  let cpath = null

  const STATE = {}

  cmdPaths.forEach(p => {
    if (fs.existsSync(path.resolve(__dirname, p) + '.js')) {
      cpath = p
      return false
    }
  })

  const statePath = path.resolve(__dirname, './d40/initialState.js')

  try {
    debug(new Date(), `Loading initial state from ${statePath}`)
    Object.assign(STATE, require(statePath)(CTX))
  } catch (e) {
    throw Error('ERR_INVALID_STATE')
  }

  if (!cpath) {
    throw new Error('ERR_MODEL_NOTFOUND')
  }

  const emitter = require(cpath)
  const client = mqtt.connect(`mqtt://${CTX.host}:${CTX.port}`)
  const cleanup = emitter(CTX, client, STATE.state)

  client.on('end', () => {
    cleanup()
  })

  return {
    state: STATE.state,
    exit: () => {
      client.end()
    },
    start: () => {
      if (client.connected) {
        return
      }

      client.publish(`${CTX.id}/start`, '')
    },
    stop: () => {
      client.end()
    },
    reset: () => {
      return STATE.cleanup()
    }
  }
}
