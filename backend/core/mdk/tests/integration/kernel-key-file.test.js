'use strict'

// getKernel publishes the Kernel HRPC public key to a well-known key file so
// out-of-process clients (gateway, CLIs) can connect without configuration.

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const sdk = require('../..')

async function createKernel (t, opts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-keyfile-'))
  const kernel = await sdk.getKernel({ root, discovery: { mode: 'local' }, ...opts })
  t.teardown(async () => {
    for (const fn of kernel._cleanup) { try { await fn() } catch {} }
    try { await kernel.stop() } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })
  return { root, kernel }
}

test('key file - getKernel writes the HRPC public key to opts.keyFile', async (t) => {
  const keyFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-keyfile-')), '.kernel-key')
  t.teardown(() => { try { fs.rmSync(path.dirname(keyFile), { recursive: true, force: true }) } catch {} })

  const { kernel } = await createKernel(t, { keyFile })

  t.ok(fs.existsSync(keyFile), 'key file written on start')
  const key = fs.readFileSync(keyFile, 'utf8').trim()
  t.is(key.length, 64, 'key is 32 bytes hex')
  t.is(key, kernel.getPublicKey().toString('hex'), 'file content matches getPublicKey()')
})

test('key file - keyFile: false disables the write', async (t) => {
  // DEFAULT_KEY_FILE is a shared tmpdir path other runs may have written;
  // assert it is untouched rather than absent.
  const before = fs.existsSync(sdk.DEFAULT_KEY_FILE) ? fs.statSync(sdk.DEFAULT_KEY_FILE).mtimeMs : null

  const { root } = await createKernel(t, { keyFile: false })

  t.absent(fs.existsSync(path.join(root, '.kernel-key')), 'no key file under root')
  const after = fs.existsSync(sdk.DEFAULT_KEY_FILE) ? fs.statSync(sdk.DEFAULT_KEY_FILE).mtimeMs : null
  t.is(after, before, 'default key file untouched')
})

test('key file - startGateway fails fast when no kernel key is resolvable', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-keyfile-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })

  await t.exception(
    () => sdk.startGateway({ root: path.join(dir, 'gateway'), keyFile: path.join(dir, 'missing.key'), noAuth: true, env: 'test' }),
    /ERR_KERNEL_KEY_FILE_NOT_FOUND/,
    'rejects before boot when the key file is absent'
  )
})

test('key file - hrpc: false writes nothing and does not throw', async (t) => {
  const keyFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-keyfile-')), '.kernel-key')
  t.teardown(() => { try { fs.rmSync(path.dirname(keyFile), { recursive: true, force: true }) } catch {} })

  await createKernel(t, { keyFile, hrpc: false })
  t.absent(fs.existsSync(keyFile), 'no key file when HRPC is disabled')
})

test('signals - getKernel installs SIGINT/SIGTERM handlers only with handleSignals', async (t) => {
  const counts = () => [process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')]
  const before = counts()
  await createKernel(t, { keyFile: false })
  t.alike(counts(), before, 'library default leaves process signals alone')

  await createKernel(t, { keyFile: false, handleSignals: true })
  const after = counts()
  t.is(after[0], before[0] + 1, 'opt-in adds a SIGINT handler')
  t.is(after[1], before[1] + 1, 'opt-in adds a SIGTERM handler')
  t.teardown(() => {
    for (const sig of ['SIGINT', 'SIGTERM']) {
      const ls = process.listeners(sig)
      process.removeListener(sig, ls[ls.length - 1])
    }
  })
})

test('trust - getKernel is fail-closed and admits keys from its trusted-keys dir', async (t) => {
  const { publishTrustedKey, readTrustedKeys } = require('../../lib/local-discovery')
  const { kernel } = await createKernel(t, { keyFile: false })
  const caller = 'ef'.repeat(32)

  t.absent(kernel.hrpcListener.isAllowed(caller), 'unknown caller rejected by default')
  t.ok(kernel.trustedKeysDir, 'trusted-keys dir set')
  const published = readTrustedKeys(kernel.trustedKeysDir).find((k) => k.name === 'kernel')
  t.is(published.key, kernel.getClientPublicKey().toString('hex'), 'kernel.pub is the worker-dialing key')

  publishTrustedKey(kernel.trustedKeysDir, 'cli', caller)
  let admitted = false
  for (let i = 0; i < 40 && !admitted; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    admitted = kernel.hrpcListener.isAllowed(caller)
  }
  t.ok(admitted, 'published caller admitted')
})

test('trust - hrpc.allowAll is refused', async (t) => {
  await t.exception(createKernel(t, { keyFile: false, trustedKeysDir: false, hrpc: { allowAll: true } }), /ERR_KERNEL_ALLOW_ALL_REMOVED/)
})

test('trust - startGateway({ kernel }) admits the gateway client key and publishes it for other processes', { timeout: 60000 }, async (t) => {
  const { readTrustedKeys } = require('../../lib/local-discovery')
  const { root, kernel } = await createKernel(t, { keyFile: false })
  const hnd = await sdk.startGateway({ kernel, root: path.join(root, 'gateway'), port: 0, env: 'test', noAuth: true })
  t.teardown(() => new Promise((resolve) => hnd.stop(resolve)), { order: -1 })

  const key = hnd.status.rpcClientKey
  t.is(key.length, 64)
  t.ok(kernel.hrpcListener.isAllowed(key), 'gateway key admitted on the in-process kernel')
  t.ok(kernel.listAllowedKeys().includes(key))
  t.ok(readTrustedKeys(kernel.trustedKeysDir).some((k) => k.name === 'gateway' && k.key === key), 'published for other processes')
})
