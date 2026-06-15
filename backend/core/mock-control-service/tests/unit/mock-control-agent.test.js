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

test('generateId returns 32-char hex strings', (t) => {
  const agent = new MockControlAgent({ thgs: [] })
  const a = agent.generateId()
  const b = agent.generateId()
  t.is(a.length, 32)
  t.is(b.length, 32)
  t.ok(/^[0-9a-f]+$/.test(a))
  t.not(a, b)
})

test('init runs runMockServer per thing and merges mock payload', async (t) => {
  const seen = []
  const agent = new MockControlAgent({
    thgs: [
      { name: 'one', port: 1 },
      { name: 'two', port: 2 }
    ]
  })

  await agent.init(async (thing) => {
    seen.push(thing)
    return {
      state: { v: thing.name },
      stop () {},
      start () {},
      reset () {
        return { v: 'reset' }
      }
    }
  })

  t.is(seen.length, 2)
  t.is(seen[0].name, 'one')
  t.is(agent.things.length, 2)
  t.ok(agent.things[0].mockId)
  t.is(agent.things[0].name, 'one')
  t.is(agent.things[0].state.v, 'one')
  t.is(agent.things[1].state.v, 'two')
})

test('init with control port starts HTTP API', async (t) => {
  const port = await reservePort()
  const agent = new MockControlAgent({
    thgs: [{ id: 'dev-1', label: 'a' }],
    port
  })

  await agent.init(async () => ({
    state: { temp: 22 },
    stop () {},
    start () {},
    reset () {
      return { temp: 0 }
    }
  }))

  try {
    const res = await fetch(`http://127.0.0.1:${port}/things?q=${encodeURIComponent('{}')}`)
    t.is(res.status, 200)
    const body = await res.json()
    t.is(body.length, 1)
    t.is(body[0].label, 'a')
    t.is(body[0].state.temp, 22)
  } finally {
    await agent.server.close()
  }
})
