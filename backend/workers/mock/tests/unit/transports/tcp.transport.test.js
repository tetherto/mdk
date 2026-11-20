'use strict'

const test = require('brittle')
const net = require('net')
const TcpTransport = require('../../../transports/tcp.transport')

function makeMock () {
  return { ctx: {}, state: {} }
}

test('listen() starts a TCP server and dispatches incoming data to onData', async (t) => {
  const received = []
  const transport = new TcpTransport(makeMock(), {
    onData: (socket, chunk) => received.push(chunk.toString())
  })

  const result = transport.listen('127.0.0.1', 0)
  t.is(result, transport, 'listen() returns the transport itself')

  await new Promise((resolve) => transport.server.once('listening', resolve))
  t.ok(transport.listening, 'server is listening')

  const port = transport.server.address().port
  const client = net.connect(port, '127.0.0.1')
  await new Promise((resolve) => client.once('connect', resolve))
  client.write('hello')
  await new Promise((resolve) => setTimeout(resolve, 20))
  t.alike(received, ['hello'])

  client.destroy()
  transport.close()
  t.pass()
})

test('a socket error destroys the socket rather than crashing the server', async (t) => {
  const transport = new TcpTransport(makeMock(), { onData: () => {} })
  transport.listen('127.0.0.1', 0)
  await new Promise((resolve) => transport.server.once('listening', resolve))

  const serverSocketPromise = new Promise((resolve) => transport.server.once('connection', resolve))
  const port = transport.server.address().port
  const client = net.connect(port, '127.0.0.1')
  const serverSocket = await serverSocketPromise

  let destroyed = false
  const originalDestroy = serverSocket.destroy.bind(serverSocket)
  serverSocket.destroy = (...args) => { destroyed = true; return originalDestroy(...args) }

  serverSocket.emit('error', new Error('ECONNRESET'))
  t.ok(destroyed, 'the errored socket should be destroyed')

  client.destroy()
  transport.close()
  t.pass()
})

test('close() fires the onClose handler registered at construction', async (t) => {
  let closed = false
  const transport = new TcpTransport(makeMock(), { onData: () => {}, onClose: () => { closed = true } })
  transport.listen('127.0.0.1', 0)
  await new Promise((resolve) => transport.server.once('listening', resolve))

  transport.close()
  await new Promise((resolve) => transport.server.once('close', resolve))
  t.ok(closed, 'onClose handler should have fired')
  t.pass()
})

test('does not register a close listener when onClose is not a function', async (t) => {
  const transport = new TcpTransport(makeMock(), { onData: () => {} })
  transport.listen('127.0.0.1', 0)
  await new Promise((resolve) => transport.server.once('listening', resolve))
  t.execution(() => transport.close())
  t.pass()
})

test('close() destroys open client connections so the server fully closes', async (t) => {
  const transport = new TcpTransport(makeMock(), { onData: () => {} })
  transport.listen('127.0.0.1', 0)
  await new Promise((resolve) => transport.server.once('listening', resolve))

  const port = transport.server.address().port
  const client = net.connect(port, '127.0.0.1')
  await new Promise((resolve) => client.once('connect', resolve))
  await new Promise((resolve) => setTimeout(resolve, 20))
  t.is(transport.sockets.size, 1)

  const closed = new Promise((resolve) => transport.server.once('close', resolve))
  const clientClosed = new Promise((resolve) => client.once('close', resolve))
  transport.close()
  await Promise.all([closed, clientClosed])
  t.is(transport.sockets.size, 0)
  t.is(transport.listening, false)
})
