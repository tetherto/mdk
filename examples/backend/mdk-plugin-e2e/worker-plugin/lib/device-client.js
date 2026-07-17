'use strict'

const net = require('net')

// The "vendor SDK" for SimMinerMock: one request per connection, newline-
// delimited JSON. Plain device I/O — no MDK concepts.
function createClient ({ host, port }) {
  const call = (cmd, args) => new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: host || '127.0.0.1', port })
    let buf = ''
    socket.on('error', reject)
    socket.on('data', (chunk) => {
      buf += chunk.toString()
      const nl = buf.indexOf('\n')
      if (nl === -1) return
      socket.end()
      const res = JSON.parse(buf.slice(0, nl))
      if (!res.ok) return reject(new Error(res.error || 'ERR_DEVICE_CALL_FAILED'))
      resolve(res)
    })
    socket.write(JSON.stringify({ cmd, ...args }) + '\n')
  })

  return {
    getStats: async () => (await call('stats')).stats,
    setPowerLimit: (watts) => call('set_power_limit', { watts }),
    reboot: () => call('reboot')
  }
}

module.exports = { createClient }
