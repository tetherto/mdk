'use strict'

const net = require('node:net')
const test = require('brittle')
const {
  encodeFrame,
  FrameDecoder,
  WMApiV3Transport
} = require('../../lib/protocols/wm-api-v3-transport')
const apiV3Mock = require('../../mock/api-v3-server')

async function listen (onConnection) {
  const sockets = new Set()
  const server = net.createServer((socket) => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
    onConnection(socket)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    port: server.address().port,
    close: async () => {
      for (const socket of sockets) socket.destroy()
      await new Promise((resolve) => server.close(resolve))
    }
  }
}

test('api-v3 transport - encodes a four-byte little-endian length', (t) => {
  const frame = encodeFrame('{"cmd":"get.device.info"}')
  t.is(frame.readUInt32LE(0), frame.length - 4)
  t.is(frame.subarray(4).toString(), '{"cmd":"get.device.info"}')
})

test('api-v3 transport - decodes fragmented and coalesced frames', (t) => {
  const decoder = new FrameDecoder()
  const first = encodeFrame('{"code":0}')
  const second = encodeFrame('{"code":-1}')

  t.alike(decoder.push(first.subarray(0, 2)), [])
  t.alike(decoder.push(first.subarray(2, 6)), [])
  const frames = decoder.push(Buffer.concat([first.subarray(6), second]))
  t.is(frames.length, 2)
  t.is(frames[0].toString(), '{"code":0}')
  t.is(frames[1].toString(), '{"code":-1}')
})

test('api-v3 transport - rejects invalid frame lengths', (t) => {
  const decoder = new FrameDecoder(16)
  const invalid = Buffer.alloc(4)
  invalid.writeUInt32LE(17)
  t.exception(() => decoder.push(invalid), /ERR_API_V3_FRAME_LENGTH_INVALID/)
})

test('api-v3 transport - reads a fragmented native mock response', async (t) => {
  const mock = apiV3Mock.createServer({ fragmentResponses: true })
  const address = await mock.ready
  const transport = new WMApiV3Transport({ host: '127.0.0.1', port: address.port })
  t.teardown(async () => {
    await transport.stop()
    await mock.close()
  })

  const raw = await transport.request(JSON.stringify({ cmd: 'get.device.info', param: 'salt' }))
  const response = JSON.parse(raw)
  t.is(response.code, 0)
  t.is(response.msg.salt, '5QAHiKMb')
  t.alike(mock.requests, [{ cmd: 'get.device.info', param: 'salt' }])
})

test('api-v3 transport - reads a framed response followed by a binary stream', async (t) => {
  const logData = Buffer.from('fragmented log archive')
  const mock = apiV3Mock.createServer({ fragmentResponses: true, state: { logData } })
  const address = await mock.ready
  const transport = new WMApiV3Transport({ host: '127.0.0.1', port: address.port })
  t.teardown(async () => {
    await transport.stop()
    await mock.close()
  })

  const result = await transport.requestBinary(
    JSON.stringify({ cmd: 'get.log.download' }),
    raw => JSON.parse(raw).msg.logsize
  )
  t.is(JSON.parse(result.response).code, 0)
  t.alike(result.data, logData)
})

test('api-v3 transport - rejects incomplete and oversized binary streams', async (t) => {
  const incomplete = await listen((socket) => {
    socket.once('data', () => {
      socket.end(Buffer.concat([
        encodeFrame(JSON.stringify({ code: 0, msg: { logsize: '10' } })),
        Buffer.from('short')
      ]))
    })
  })
  const incompleteTransport = new WMApiV3Transport({ host: '127.0.0.1', port: incomplete.port })
  t.teardown(async () => {
    await incompleteTransport.stop()
    await incomplete.close()
  })
  await t.exception(incompleteTransport.requestBinary('{}', raw => JSON.parse(raw).msg.logsize), /ERR_LOG_DOWNLOAD_INCOMPLETE/)

  const oversized = await listen((socket) => {
    socket.once('data', () => {
      socket.end(encodeFrame(JSON.stringify({ code: 0, msg: { logsize: '11' } })))
    })
  })
  const oversizedTransport = new WMApiV3Transport({ host: '127.0.0.1', port: oversized.port })
  t.teardown(async () => {
    await oversizedTransport.stop()
    await oversized.close()
  })
  await t.exception(oversizedTransport.requestBinary('{}', raw => JSON.parse(raw).msg.logsize, 10), /ERR_LOG_DOWNLOAD_SIZE_INVALID/)
})

test('api-v3 transport - timeout is a stable Error.message string', async (t) => {
  const server = await listen(() => {})
  const transport = new WMApiV3Transport({ host: '127.0.0.1', port: server.port, timeout: 20 })
  t.teardown(async () => {
    await transport.stop()
    await server.close()
  })

  await t.exception(transport.request('{}'), /ERR_API_V3_TIMEOUT/)
})

test('api-v3 transport - uploads size-prefixed firmware and reads final frame', async (t) => {
  const firmware = Buffer.from('firmware bytes')
  let received
  const server = await listen((socket) => {
    const decoder = new FrameDecoder()
    let ready = false
    let buffer = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      if (!ready) {
        if (decoder.push(chunk).length === 0) return
        ready = true
        socket.write(encodeFrame(JSON.stringify({ code: 0, msg: 'ready' })))
        return
      }
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length < 4) return
      const size = buffer.readUInt32LE(0)
      if (buffer.length < size + 4) return
      received = Buffer.from(buffer.subarray(4, size + 4))
      socket.end(encodeFrame(JSON.stringify({ code: 0, msg: 'ok' })))
    })
  })
  const transport = new WMApiV3Transport({ host: '127.0.0.1', port: server.port })
  t.teardown(async () => {
    await transport.stop()
    await server.close()
  })

  const result = await transport.requestUpload('{}', firmware, raw => {
    t.is(JSON.parse(raw).msg, 'ready')
  })
  t.is(JSON.parse(result).msg, 'ok')
  t.alike(received, firmware)
})

test('api-v3 transport - connection failure is a stable Error.message string', async (t) => {
  const holder = await listen(() => {})
  const port = holder.port
  await holder.close()
  const transport = new WMApiV3Transport({ host: '127.0.0.1', port, timeout: 100 })
  t.teardown(() => transport.stop())

  await t.exception(transport.request('{}'), /ERR_API_V3_CONNECTION/)
})

test('api-v3 transport - detects a peer ending mid-frame', async (t) => {
  const server = await listen((socket) => {
    const partial = Buffer.alloc(6)
    partial.writeUInt32LE(10, 0)
    partial.write('ab', 4)
    socket.end(partial)
  })
  const transport = new WMApiV3Transport({ host: '127.0.0.1', port: server.port })
  t.teardown(async () => {
    await transport.stop()
    await server.close()
  })

  await t.exception(transport.request('{}'), /ERR_API_V3_FRAME_INCOMPLETE/)
})
