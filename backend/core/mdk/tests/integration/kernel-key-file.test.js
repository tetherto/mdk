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
