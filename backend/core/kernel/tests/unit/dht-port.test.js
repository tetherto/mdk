'use strict'

const test = require('brittle')
const dgram = require('dgram')
const DHT = require('hyperdht')
const { dhtPortOpts } = require('../../lib/dht-port')

test('dhtPortOpts - a node with bootstrap entries searches above the highest of their ports', (t) => {
  t.alike(dhtPortOpts(['127.0.0.1:49737']), { port: [49738, 49743] }, 'host:port string')
  t.alike(dhtPortOpts(['88.99.3.86@node1.example:49737', '10.0.0.6:50001']), { port: [50002, 50007] }, 'suggested-IP form, highest port wins')
  t.alike(dhtPortOpts([{ host: '10.0.0.5', port: 49737 }]), { port: [49738, 49743] }, '{ host, port } object')
  t.alike(dhtPortOpts(undefined), {}, 'no bootstrap list: the public DHT default stays')
  t.alike(dhtPortOpts([]), {}, 'empty list')
  t.alike(dhtPortOpts(['bootstrap.example']), {}, 'no usable port')
})

test('dhtPortOpts - the range stays inside the UDP ports and still skips every bootstrap port', (t) => {
  t.alike(dhtPortOpts(['127.0.0.1:65530']), { port: [65531, 65536] }, 'the last room above: 65531-65535')
  t.alike(dhtPortOpts(['127.0.0.1:65535']), { port: [65530, 65535] }, 'no room above: the five ports below')
  t.alike(dhtPortOpts(['127.0.0.1:65532', '127.0.0.1:65535']), { port: [65527, 65532] }, 'below the lowest of them')
  t.alike(dhtPortOpts(['127.0.0.1:70000']), {}, 'a port outside UDP is not a bootstrap port')
  t.alike(dhtPortOpts(['127.0.0.1:2', '127.0.0.1:65535']), { port: [1, 2] }, 'the range below never starts under port 1')
})

function freeUdpPort () {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket('udp4')
    sock.once('error', reject)
    sock.bind(0, '127.0.0.1', () => {
      const { port } = sock.address()
      sock.close(() => resolve(port))
    })
  })
}

test('dhtPortOpts - a node that starts before its private bootstrap leaves the bootstrap port free', async (t) => {
  const port = await freeUdpPort()
  const bootstrap = [`127.0.0.1:${port}`]

  const { port: [start, end] } = dhtPortOpts(bootstrap)
  const node = new DHT({ bootstrap, host: '127.0.0.1', port: [start, end] })
  t.teardown(() => node.destroy())
  await node.ready()
  const bound = node.io.serverSocket.address().port
  t.ok(bound >= start && bound < end, `the node bound ${bound}, inside its range ${start}-${end - 1}, not hyperdht's default`)

  const boot = DHT.bootstrapper(port, '127.0.0.1', { host: '127.0.0.1' })
  t.teardown(() => boot.destroy())
  await boot.ready()
  t.is(boot.io.serverSocket.address().port, port, 'the bootstrap binds its port after the node')
})
