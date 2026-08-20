'use strict'

const net = require('node:net')

const HEADER_SIZE = 4
const DEFAULT_MAX_FRAME_SIZE = 1024 * 1024
const DEFAULT_MAX_BINARY_SIZE = 64 * 1024 * 1024

function encodeFrame (payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8')
  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt32LE(body.length, 0)
  return Buffer.concat([header, body])
}

class FrameDecoder {
  constructor (maxFrameSize = DEFAULT_MAX_FRAME_SIZE) {
    this.maxFrameSize = maxFrameSize
    this.buffer = Buffer.alloc(0)
  }

  push (chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    const frames = []

    while (this.buffer.length >= HEADER_SIZE) {
      const length = this.buffer.readUInt32LE(0)
      if (length === 0 || length > this.maxFrameSize) {
        throw new Error('ERR_API_V3_FRAME_LENGTH_INVALID')
      }
      if (this.buffer.length < HEADER_SIZE + length) break

      frames.push(this.buffer.subarray(HEADER_SIZE, HEADER_SIZE + length))
      this.buffer = this.buffer.subarray(HEADER_SIZE + length)
    }

    return frames
  }
}

class WMApiV3Transport {
  constructor ({ host, port = 4433, timeout = 5000, maxFrameSize = DEFAULT_MAX_FRAME_SIZE }) {
    this.host = host
    this.port = port
    this.timeout = timeout
    this.maxFrameSize = maxFrameSize
    this.sockets = new Set()
  }

  request (payload) {
    return new Promise((resolve, reject) => {
      const decoder = new FrameDecoder(this.maxFrameSize)
      const socket = net.createConnection({ host: this.host, port: this.port })
      let settled = false

      const finish = (error, response) => {
        if (settled) return
        settled = true
        this.sockets.delete(socket)
        socket.destroy()
        if (error) reject(error)
        else resolve(response)
      }

      this.sockets.add(socket)
      socket.setTimeout(this.timeout)
      socket.once('connect', () => socket.write(encodeFrame(payload)))
      socket.on('data', (chunk) => {
        try {
          const frames = decoder.push(chunk)
          if (frames.length > 0) finish(null, frames[0].toString('utf8'))
        } catch (error) {
          finish(error)
        }
      })
      socket.once('timeout', () => finish(new Error('ERR_API_V3_TIMEOUT')))
      socket.once('error', () => finish(new Error('ERR_API_V3_CONNECTION')))
      socket.once('end', () => finish(new Error('ERR_API_V3_FRAME_INCOMPLETE')))
    })
  }

  requestBinary (payload, getLength, maxBinarySize = DEFAULT_MAX_BINARY_SIZE) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port })
      let buffer = Buffer.alloc(0)
      let response
      let expectedLength
      let settled = false

      const finish = (error, data) => {
        if (settled) return
        settled = true
        this.sockets.delete(socket)
        socket.destroy()
        if (error) reject(error)
        else resolve({ response, data })
      }

      const consume = () => {
        if (expectedLength === undefined) {
          if (buffer.length < HEADER_SIZE) return
          const frameLength = buffer.readUInt32LE(0)
          if (frameLength === 0 || frameLength > this.maxFrameSize) {
            throw new Error('ERR_API_V3_FRAME_LENGTH_INVALID')
          }
          if (buffer.length < HEADER_SIZE + frameLength) return

          response = buffer.subarray(HEADER_SIZE, HEADER_SIZE + frameLength).toString('utf8')
          expectedLength = Number(getLength(response))
          if (!Number.isSafeInteger(expectedLength) || expectedLength < 0 || expectedLength > maxBinarySize) {
            throw new Error('ERR_LOG_DOWNLOAD_SIZE_INVALID')
          }
          buffer = buffer.subarray(HEADER_SIZE + frameLength)
        }

        if (buffer.length >= expectedLength) {
          finish(null, buffer.subarray(0, expectedLength))
        }
      }

      this.sockets.add(socket)
      socket.setTimeout(this.timeout)
      socket.once('connect', () => socket.write(encodeFrame(payload)))
      socket.on('data', (chunk) => {
        try {
          buffer = Buffer.concat([buffer, chunk])
          consume()
        } catch (error) {
          finish(error)
        }
      })
      socket.once('timeout', () => finish(new Error('ERR_API_V3_TIMEOUT')))
      socket.once('error', () => finish(new Error('ERR_API_V3_CONNECTION')))
      socket.once('end', () => {
        if (settled) return
        finish(new Error(expectedLength === undefined
          ? 'ERR_API_V3_FRAME_INCOMPLETE'
          : 'ERR_LOG_DOWNLOAD_INCOMPLETE'))
      })
    })
  }

  requestUpload (payload, data, validateReady, timeout = this.timeout) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port })
      const decoder = new FrameDecoder(this.maxFrameSize)
      let phase = 'ready'
      let transmitted = false
      let settled = false

      const finish = (error, response) => {
        if (settled) return
        settled = true
        this.sockets.delete(socket)
        socket.destroy()
        if (error) reject(error)
        else resolve(response)
      }

      this.sockets.add(socket)
      socket.setTimeout(timeout)
      socket.once('connect', () => socket.write(encodeFrame(payload)))
      socket.on('data', (chunk) => {
        try {
          const frames = decoder.push(chunk)
          for (const frame of frames) {
            const response = frame.toString('utf8')
            if (phase === 'ready') {
              validateReady(response)
              phase = 'result'
              const size = Buffer.alloc(HEADER_SIZE)
              size.writeUInt32LE(data.length, 0)
              transmitted = true
              socket.write(size)
              socket.write(data)
            } else {
              finish(null, response)
              break
            }
          }
        } catch (error) {
          finish(error)
        }
      })
      socket.once('timeout', () => finish(new Error(transmitted
        ? 'ERR_FIRMWARE_OUTCOME_UNKNOWN'
        : 'ERR_API_V3_TIMEOUT')))
      socket.once('error', () => finish(new Error(transmitted
        ? 'ERR_FIRMWARE_OUTCOME_UNKNOWN'
        : 'ERR_API_V3_CONNECTION')))
      socket.once('end', () => finish(new Error(transmitted
        ? 'ERR_FIRMWARE_OUTCOME_UNKNOWN'
        : 'ERR_API_V3_FRAME_INCOMPLETE')))
    })
  }

  async stop () {
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
  }
}

module.exports = {
  HEADER_SIZE,
  DEFAULT_MAX_FRAME_SIZE,
  DEFAULT_MAX_BINARY_SIZE,
  encodeFrame,
  FrameDecoder,
  WMApiV3Transport
}
