'use strict'

const test = require('brittle')
const net = require('net')
const MockControlAgent = require('../../mock-control-agent')

function reservePort (host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.unref()
    s.listen(0, host, () => {
      const addr = s.address()
      s.close((err) => (err ? reject(err) : resolve(addr.port)))
    })
    s.on('error', reject)
  })
}

test('control server GET /things after agent init', async (t) => {
  const port = await reservePort()
  const agent = new MockControlAgent({
    thgs: [{ id: 't1' }],
    port
  })

  await agent.init(async () => ({
    state: { k: 1 },
    stop () {},
    start () {},
    reset () {
      return { k: 0 }
    }
  }))

  try {
    const res = await fetch(`http://127.0.0.1:${port}/things`)
    t.is(res.status, 200)
    const data = await res.json()
    t.is(data.length, 1)
    t.ok(data[0].mockId)
  } finally {
    await agent.server.close()
  }
})
