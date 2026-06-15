'use strict'

const net = require('net')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const { decryptCommand, encryptResponse } = require('./utils')
const MockControlAgent = require('./mock-control-agent')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const md5 = require('../lib/utils/md5')

const ENCRYPTION_KEY = 'x5JSSQzqF0lEACIGSL0Ld1'
const MINER_TYPES = ['m63', 'm56s', 'm53s', 'm30sp', 'm30spp']
const SALT = '5QAHiKMb'

/**
 * Generates encryption key from password
 */
const generateEncryptionKey = (password) => {
  if (!password) return ENCRYPTION_KEY
  const key = md5.crypt(password, SALT)
  const arr = key.split('$')
  return arr[arr.length - 1]
}

/**
 * Finds the first existing path from a list of paths
 */
const findExistingPath = (paths) => {
  for (const p of paths) {
    const fullPath = path.resolve(__dirname, p) + '.js'
    if (fs.existsSync(fullPath)) {
      return p
    }
  }
  return null
}

/**
 * Sends an error response to the socket
 */
const sendErrorResponse = async (socket, code, msg, encryptionKey, isEncrypted, delay) => {
  const resp = {
    STATUS: 'E',
    When: +new Date(),
    Code: code,
    Msg: msg,
    Description: ''
  }

  if (delay) await promiseSleep(delay)

  if (isEncrypted) {
    socket.write(JSON.stringify(encryptResponse(resp, encryptionKey)))
  } else {
    socket.write(JSON.stringify(resp))
  }
  socket.destroy()
}

/**
 * Sends a response to the socket
 */
const sendResponse = async (socket, data, encryptionKey, isEncrypted, delay) => {
  if (delay) await promiseSleep(delay)

  if (isEncrypted) {
    socket.write(encryptResponse(data, encryptionKey))
  } else {
    socket.write(JSON.stringify(data))
  }
  socket.destroy()
}

/**
 * Validates token for encrypted commands
 */
const validateToken = (cmd, validTokens, hasPassword) => {
  if (!cmd.token) return false
  if (hasPassword) return true // Accept any non-empty token when password is provided
  return validTokens.has(cmd.token)
}

/**
 * Creates a mock control agent
 */
const createMockControlAgent = (things, mockControlPort) => {
  return new MockControlAgent({
    thgs: things,
    port: mockControlPort
  })
}

if (require.main === module) {
  const argv = yargs(hideBin(process.argv))
    .option('port', { alias: 'p', type: 'number', description: 'port to run on', default: 4028 })
    .option('host', { alias: 'h', type: 'string', description: 'host to run on', default: '127.0.0.1' })
    .option('type', { description: 'miner type', type: 'string' })
    .option('serial', { description: 'serial number', type: 'string', default: 'HHM38S98302B24K40073' })
    .option('mockControlPort', { description: 'mock control port port', type: 'number' })
    .option('delay', { description: 'delay in ms', type: 'number', default: 0 })
    .option('bulk', { description: 'bulk file', type: 'string' })
    .option('error', { description: 'send errored response', type: 'boolean', default: false })
    .option('minerpoolMockPort', { type: 'number', description: 'minerpool mock port', default: 8000 })
    .option('minerpoolMockHost', { type: 'string', description: 'minerpool mock host', default: '127.0.0.1' })
    .parse()

  const things = argv.bulk ? JSON.parse(fs.readFileSync(argv.bulk)) : [argv]
  const agent = createMockControlAgent(things, argv.mockControlPort)
  agent.init(runServer)
} else {
  module.exports = {
    createServer ({ port, host, type, serial, password }) {
      return runServer({ port, host, type, serial, password })
    }
  }
}

function runServer (argv, ops = {}) {
  const CTX = {
    host: argv.host,
    port: argv.port,
    type: argv.type,
    serial: argv.serial,
    delay: argv.delay,
    error: argv.error,
    minerpoolMockPort: argv.minerpoolMockPort,
    minerpoolMockHost: argv.minerpoolMockHost,
    password: argv.password || 'admin'
  }

  const STATE = {}
  const validTokens = new Set()
  const encryptionKey = generateEncryptionKey(CTX.password)

  // Add validTokens to CTX so commands can add tokens
  CTX.validTokens = validTokens
  CTX.encryptionKey = encryptionKey

  if (!MINER_TYPES.includes(CTX.type?.toLowerCase())) {
    throw Error('ERR_UNSUPPORTED')
  }

  // Load initial state
  const statePaths = ['./initial_states/default', `./initial_states/${CTX.type.toLowerCase()}`]
  const statePath = findExistingPath(statePaths)

  if (!statePath) {
    throw Error('ERR_INVALID_STATE')
  }

  try {
    debug(new Date(), `Loading initial state from ${statePath}`)
    Object.assign(STATE, require(statePath)(CTX))
  } catch (e) {
    throw Error('ERR_INVALID_STATE')
  }

  const processCmd = async (socket, chunk) => {
    const req = JSON.parse(chunk.toString())
    const id = req.ctx?.mockControl?.generateId()
    const isEncrypted = req.enc === 1
    let cmd

    // Handle encrypted commands
    if (isEncrypted) {
      try {
        cmd = decryptCommand(req, encryptionKey)
      } catch (e) {
        return sendErrorResponse(socket, 23, 'json cmd err', encryptionKey, true, CTX.delay)
      }

      if (!cmd) {
        return sendErrorResponse(socket, 135, 'check token err', encryptionKey, true, CTX.delay)
      }

      // Validate token
      if (!validateToken(cmd, validTokens, !!CTX.password)) {
        return sendErrorResponse(socket, 135, 'check token err', encryptionKey, true, CTX.delay)
      }

      // Store token for future validation
      if (cmd.token) {
        validTokens.add(cmd.token)
      }
    } else {
      cmd = req
    }

    // Find and execute command
    const command = cmd.cmd || cmd.command || null
    const cmdPaths = [`./cmds/${command}`, `./cmds/${CTX.type}/${command}`]
    const cmdPath = findExistingPath(cmdPaths)

    if (!cmdPath) {
      return sendErrorResponse(socket, 14, 'invalid cmd', encryptionKey, isEncrypted, CTX.delay)
    }

    try {
      const res = require(cmdPath)(CTX, STATE.state, cmd, id)

      // If null, close connection without sending a response (fire-and-forget commands like reboot)
      if (res === null) {
        socket.end()
        return
      }

      await sendResponse(socket, res, encryptionKey, isEncrypted, CTX.delay)
    } catch (e) {
      debug(new Date(), cmd, e)
      await sendErrorResponse(socket, 14, 'invalid cmd', encryptionKey, isEncrypted, CTX.delay)
    }
  }

  const server = new net.Server()

  server.listen(argv.port, argv.host, function () {
    debug(new Date(), `Server listening for connection requests on socket ${argv.host}:${argv.port}`)
  })

  server.on('close', STATE.cleanup)
  server.on('connection', function (socket) {
    debug(new Date(), 'Connection from ' + socket.remoteAddress + ':' + socket.remotePort)

    socket.on('data', async function (chunk) {
      await processCmd(socket, chunk)
    })
  })

  return {
    state: STATE.state,
    exit: () => {
      server.close()
    },
    start: () => {
      // if server isn't started
      if (!server.listening) {
        server.listen(argv.port, argv.host, () => {
          debug(`Server listening on socket ${argv.host}:${argv.port}`)
        })
      }
    },
    stop: () => {
      // if server is started
      if (server.listening) {
        server.close()
      }
    },
    reset: () => {
      return STATE.cleanup()
    }
  }
}
