'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const { createAppRuntime } = require('../../index')
const { ECHO_APP, tmpDir, capturingLogger } = require('../fixtures/helpers')

const PEM = '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIIgYjDtNeDdBPu4fDLtPQz1t4h8bOTK2ZeJbfpt1Zp8M\n-----END PRIVATE KEY-----\n'

function file (t, body) {
  const f = path.join(tmpDir(t), 'cred.json')
  fs.writeFileSync(f, typeof body === 'string' ? body : JSON.stringify(body))
  return f
}

test('the credential must be the app\'s own account', async (t) => {
  const ok = createAppRuntime({ name: 'echo', appDir: ECHO_APP, kernelKey: 'ab'.repeat(32), credentialFile: file(t, { name: 'app:echo', privateKeyPem: PEM }), logger: capturingLogger() })
  t.ok(ok)
  await ok.stop()

  t.exception(() => createAppRuntime({ name: 'echo', appDir: ECHO_APP, credentialFile: file(t, { name: 'app:other', privateKeyPem: PEM }) }), /ERR_APP_RUNTIME_CREDENTIAL_MISMATCH/)
  t.exception(() => createAppRuntime({ name: 'echo', appDir: ECHO_APP, credential: { name: 'app:echo' } }), /ERR_APP_RUNTIME_CREDENTIAL_MISMATCH/)
  t.exception(() => createAppRuntime({ name: 'echo', appDir: ECHO_APP, credentialFile: file(t, '{not json') }), /ERR_APP_RUNTIME_CREDENTIAL_UNREADABLE/)
  t.exception(() => createAppRuntime({ name: 'echo', appDir: ECHO_APP, credentialFile: '/nope/cred.json' }), /ERR_APP_RUNTIME_CREDENTIAL_UNREADABLE/)
})

test('a runtime with a Kernel but no credential warns', async (t) => {
  const logger = capturingLogger()
  const rt = createAppRuntime({ name: 'echo', appDir: ECHO_APP, kernelKey: 'ab'.repeat(32), logger })
  t.ok(logger.lines.some((l) => l.startsWith('warn:') && l.includes('no service-account credential for app:echo')))
  await rt.stop()
})
