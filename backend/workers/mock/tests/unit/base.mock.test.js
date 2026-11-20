'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const net = require('net')
const BaseMock = require('../../base.mock')
const TcpTransport = require('../../transports/tcp.transport')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-worker-mock-base-test-' + Date.now())
const CLI_FIXTURE_DIR = path.join(__dirname, '..', 'fixtures', 'cli-mock')

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

function makeTcpMock (dir, extra = {}) {
  return class TestMock extends BaseMock {
    static dir = dir
    createTransport () {
      return new TcpTransport(this, { onData: extra.onData || (() => {}) })
    }
  }
}

test('constructor - applies ctx defaults and keeps explicit overrides', (t) => {
  const mock = new BaseMock({ port: 9999, type: 'x' })
  t.is(mock.ctx.host, '127.0.0.1', 'defaults host')
  t.is(mock.ctx.delay, 0, 'defaults delay')
  t.is(mock.ctx.error, false, 'defaults error')
  t.ok(typeof mock.ctx.startTime === 'number', 'sets startTime')
  t.is(mock.ctx.port, 9999, 'keeps explicit port')
  t.is(mock.ctx.type, 'x', 'keeps explicit ctx fields')
  t.is(mock.state, null, 'state starts null')
  t.is(mock.transport, null, 'transport starts null')
  t.pass()
})

test('constructor - falls back to constructor.defaultPort when no port is given', (t) => {
  class CustomPortMock extends BaseMock { static defaultPort = 12345 }
  const mock = new CustomPortMock()
  t.is(mock.ctx.port, 12345)
  t.pass()
})

test('createTransport - throws ERR_ABSTRACT on the base class', (t) => {
  const mock = new BaseMock()
  t.exception(() => mock.createTransport(), /ERR_ABSTRACT/)
  t.pass()
})

test('_validateType - passes when TYPES is empty', (t) => {
  const mock = new BaseMock({ type: 'anything' })
  t.execution(() => mock._validateType())
  t.pass()
})

test('_validateType - passes when ctx.type matches a declared type (case-insensitive)', (t) => {
  class TypedMock extends BaseMock { static TYPES = ['Foo', 'Bar'] }
  const mock = new TypedMock({ type: 'foo' })
  t.execution(() => mock._validateType())
  t.pass()
})

test('_resolveType - accepts the plugin device tag and `model` as the mock type', (t) => {
  class Typed extends BaseMock { static TYPES = ['pm180', 'b23'] }
  t.is(new Typed({ type: 'powermeter-satec-pm180' }).ctx.type, 'pm180', 'legacy tag resolves to its model')
  t.is(new Typed({ model: 'B23' }).ctx.type, 'b23', 'model is an alias for type')
  t.is(new Typed({ type: 'miner-av-a1346' }).ctx.type, 'miner-av-a1346', 'an unsupported tag is left for _validateType')
  t.exception(() => new Typed({ type: 'miner-av-a1346' })._validateType(), /ERR_UNSUPPORTED/)
  t.is(new Typed({}).ctx.type, '', 'no type at all')
  t.execution(() => new Typed({})._validateType(), 'absent type passes: the default state stands in')
})

test('_validateType - throws ERR_UNSUPPORTED when ctx.type does not match', (t) => {
  class TypedMock extends BaseMock { static TYPES = ['foo'] }
  const mock = new TypedMock({ type: 'unknown' })
  t.exception(() => mock._validateType(), /ERR_UNSUPPORTED/)
  t.pass()
})

test('_loadState - loads a type-specific state file over default', (t) => {
  const dir = path.join(FIXTURES_DIR, 'type-specific')
  writeFixture(dir, {
    'initial_states/default.js': 'module.exports = () => ({ state: { which: "default" } })',
    'initial_states/foo.js': 'module.exports = () => ({ state: { which: "foo" } })'
  })
  const TestMock = makeTcpMock(dir)
  const mock = new TestMock({ type: 'foo' })
  mock._loadState()
  t.is(mock.state.which, 'foo')
  t.pass()
})

test('_loadState - falls back to default.js when no type-specific file exists', (t) => {
  const dir = path.join(FIXTURES_DIR, 'default-fallback')
  writeFixture(dir, {
    'initial_states/default.js': 'module.exports = () => ({ state: { which: "default" } })'
  })
  const TestMock = makeTcpMock(dir)
  const mock = new TestMock({ type: 'unknown-type' })
  mock._loadState()
  t.is(mock.state.which, 'default')
  t.pass()
})

test('_loadState - throws ERR_INVALID_STATE when neither type-specific nor default exists', (t) => {
  const dir = path.join(FIXTURES_DIR, 'no-state')
  fs.mkdirSync(dir, { recursive: true })
  const TestMock = makeTcpMock(dir)
  const mock = new TestMock({ type: 'unknown' })
  t.exception(() => mock._loadState(), /ERR_INVALID_STATE/)
  t.pass()
})

test('_loadState - accepts a state loader that returns the state directly (no wrapper)', (t) => {
  const dir = path.join(FIXTURES_DIR, 'plain-state')
  writeFixture(dir, {
    'initial_states/default.js': 'module.exports = () => ({ plain: true })'
  })
  const TestMock = makeTcpMock(dir)
  const mock = new TestMock({ type: 'x' })
  mock._loadState()
  t.alike(mock.state, { plain: true })
  t.absent(mock._stateCleanup, 'no cleanup when the loader has none')
  t.pass()
})

test('_loadState - wires up cleanup when the state loader provides one', (t) => {
  const dir = path.join(FIXTURES_DIR, 'with-cleanup')
  writeFixture(dir, {
    'initial_states/default.js': [
      'module.exports = () => {',
      '  let calls = 0',
      '  return { state: { n: 1 }, cleanup: () => { calls++; return calls } }',
      '}'
    ].join('\n')
  })
  const TestMock = makeTcpMock(dir)
  const mock = new TestMock({ type: 'x' })
  mock._loadState()
  t.is(typeof mock._stateCleanup, 'function')
  t.is(mock._stateCleanup(), 1)
  t.pass()
})

test('start/handle - full lifecycle: validate, load state, listen, exchange data, stop/start, exit', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'lifecycle')
  writeFixture(dir, {
    'initial_states/default.js': 'module.exports = () => ({ state: { ok: true } })'
  })
  const received = []
  const TestMock = makeTcpMock(dir, { onData: (socket, chunk) => received.push(chunk.toString()) })
  const mock = new TestMock({ port: 0 })
  const handle = mock.start()

  await new Promise((resolve) => mock.transport.server.once('listening', resolve))
  const assignedPort = mock.transport.server.address().port

  t.alike(handle.state, { ok: true }, 'handle exposes the loaded state')
  t.is(handle.host, '127.0.0.1', 'handle exposes host')
  t.ok(handle.app === mock.transport.server, 'handle.app is the transport server')
  t.ok(handle.server === mock.transport.server, 'handle.server is the transport server')
  await handle.ready

  const client = net.connect(assignedPort, '127.0.0.1')
  await new Promise((resolve) => client.once('connect', resolve))
  client.write('ping')
  await new Promise((resolve) => setTimeout(resolve, 20))
  t.alike(received, ['ping'], 'onData handler receives written data')
  client.destroy()

  t.alike(handle.reset(), { ok: true }, 'reset() falls back to returning state when no cleanup is set')

  handle.stop()
  await new Promise((resolve) => setTimeout(resolve, 20))
  t.absent(mock.transport.listening, 'stop() closes the transport')

  handle.start()
  await new Promise((resolve) => mock.transport.server.once('listening', resolve))
  t.ok(mock.transport.listening, 'start() re-listens when not already listening')

  handle.start()
  t.ok(mock.transport.listening, 'start() is a no-op when already listening')

  handle.exit()
  t.pass()
})

test('static create - constructs an instance and starts it', (t) => {
  const dir = path.join(FIXTURES_DIR, 'static-create')
  writeFixture(dir, {
    'initial_states/default.js': 'module.exports = () => ({ state: { created: true } })'
  })
  const TestMock = makeTcpMock(dir)
  const handle = TestMock.create({ port: 0 })
  t.alike(handle.state, { created: true })
  handle.exit()
  t.pass()
})

test('static expose - returns createServer without invoking runCli when not the main module', (t) => {
  const dir = path.join(FIXTURES_DIR, 'static-expose')
  writeFixture(dir, {
    'initial_states/default.js': 'module.exports = () => ({ state: {} })'
  })
  let runCliCalled = false
  class TestMock extends BaseMock {
    static dir = dir
    static runCli () { runCliCalled = true }
    createTransport () { return new TcpTransport(this, { onData: () => {} }) }
  }
  const exposed = TestMock.expose({})
  t.absent(runCliCalled, 'runCli should not run when leafModule is not require.main')
  t.is(typeof exposed.createServer, 'function')
  const handle = exposed.createServer({ port: 0 })
  handle.exit()
  t.pass()
})

test('static expose - invokes runCli when leafModule is require.main', (t) => {
  let called = false
  class TestMock extends BaseMock {
    static runCli () { called = true }
  }
  const exposed = TestMock.expose(require.main)
  t.ok(called, 'runCli should have been invoked')
  t.is(typeof exposed.createServer, 'function')
  t.pass()
})

test('parseCli - parses argv with declared options and defaults', (t) => {
  class TestMock extends BaseMock { static dir = CLI_FIXTURE_DIR }

  const originalArgv = process.argv
  process.argv = ['node', 'server.js', '--port', '9999', '--type', 'sample']
  t.teardown(() => { process.argv = originalArgv })

  const argv = TestMock.parseCli()
  t.is(argv.port, 9999, 'parses --port')
  t.is(argv.host, '127.0.0.1', 'defaults host')
  t.is(argv.type, 'sample', 'parses --type')
  t.is(argv.delay, 0, 'defaults delay')
  t.is(argv.error, false, 'defaults error')
  t.pass()
})

test('parseCli - refuses stray positional arguments instead of ignoring them', (t) => {
  class TestMock extends BaseMock { static dir = CLI_FIXTURE_DIR }

  const originalArgv = process.argv
  process.argv = ['node', 'server.js', '--type', 'sample', '10883', 'id=D40-DEV']
  t.teardown(() => { process.argv = originalArgv })

  t.exception(() => TestMock.parseCli(), /ERR_MOCK_CLI_POSITIONAL: unexpected argument\(s\) 10883 id=D40-DEV/)
})

test('parseCli - merges extraCliOptions', (t) => {
  class TestMock extends BaseMock {
    static dir = CLI_FIXTURE_DIR
    static extraCliOptions = { extra: { type: 'string', default: 'fallback' } }
  }

  const originalArgv = process.argv
  process.argv = ['node', 'server.js']
  t.teardown(() => { process.argv = originalArgv })

  const argv = TestMock.parseCli()
  t.is(argv.extra, 'fallback', 'includes extraCliOptions with their default')
  t.pass()
})

test('runCli - useControlAgent=false creates one instance per bulk device', (t) => {
  const created = []
  class TestMock extends BaseMock {
    static dir = CLI_FIXTURE_DIR
    static useControlAgent = false
    createTransport () { return new TcpTransport(this, { onData: () => {} }) }
    static create (opts) {
      const handle = super.create(opts)
      created.push(handle)
      return handle
    }
  }

  const originalArgv = process.argv
  process.argv = ['node', 'server.js', '--bulk', path.join(CLI_FIXTURE_DIR, 'bulk.json')]
  t.teardown(() => { process.argv = originalArgv })

  TestMock.runCli()

  t.is(created.length, 2, 'should create one mock per bulk entry')
  created.forEach((handle) => handle.exit())
  t.pass()
})

test('runCli - useControlAgent=false creates a single instance for a non-bulk argv', (t) => {
  const created = []
  class TestMock extends BaseMock {
    static dir = CLI_FIXTURE_DIR
    static useControlAgent = false
    createTransport () { return new TcpTransport(this, { onData: () => {} }) }
    static create (opts) {
      const handle = super.create(opts)
      created.push(handle)
      return handle
    }
  }

  const originalArgv = process.argv
  process.argv = ['node', 'server.js', '--port', '0']
  t.teardown(() => { process.argv = originalArgv })

  TestMock.runCli()

  t.is(created.length, 1, 'should create exactly one mock')
  created.forEach((handle) => handle.exit())
  t.pass()
})

test('runCli - useControlAgent=true (default) drives creation through MockControlAgent', async (t) => {
  const created = []
  class TestMock extends BaseMock {
    static dir = CLI_FIXTURE_DIR
    createTransport () { return new TcpTransport(this, { onData: () => {} }) }
    static create (opts) {
      const handle = super.create(opts)
      created.push(handle)
      return handle
    }
  }

  const originalArgv = process.argv
  process.argv = ['node', 'server.js', '--port', '0']
  t.teardown(() => { process.argv = originalArgv })

  TestMock.runCli()
  await new Promise((resolve) => setTimeout(resolve, 50))

  t.is(created.length, 1, 'should create exactly one mock via the control agent')
  created.forEach((handle) => handle.exit())
  t.pass()
})
