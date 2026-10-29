'use strict'

const test = require('brittle')
const { withAppRoles } = require('../../start')

test('withAppRoles - adds the app role an older config lacks, ahead of the gateway', (t) => {
  const roles = ['mocks', 'kernel', 'worker', 'gateway', 'mcp']
  t.alike(withAppRoles(roles, ['backend/gateway-plugins/site']), ['mocks', 'kernel', 'worker', 'app-site', 'gateway', 'mcp'])
})

test('withAppRoles - keeps a config that already lists it, and drops an app role with no plugin dir', (t) => {
  const warnings = []
  const roles = ['kernel', 'app-site', 'app-gone', 'gateway']
  t.alike(withAppRoles(roles, ['backend/gateway-plugins/site'], (w) => warnings.push(w)), ['kernel', 'app-site', 'gateway'])
  t.is(warnings.length, 1)
  t.ok(warnings[0].includes('app-gone'))
})

test('withAppRoles - appends app roles when there is no gateway role', (t) => {
  t.alike(withAppRoles(['kernel'], ['a/site', 'b/fleet']), ['kernel', 'app-site', 'app-fleet'])
})

test('withAppRoles - drops a role this checkout cannot run, such as one from another branch', (t) => {
  const warnings = []
  const roles = ['mocks', 'mocks-retired', 'kernel', 'worker-retired', 'gateway']
  t.alike(withAppRoles(roles, [], (w) => warnings.push(w)), ['mocks', 'kernel', 'gateway'])
  t.is(warnings.length, 2)
  t.ok(warnings[0].includes('mocks-retired') && warnings[0].includes('pm2.roles'))
})

test('deploy/roles.js lists exactly the roles run-process.js runs', (t) => {
  const fs = require('fs')
  const path = require('path')
  const { SITE_ROLES } = require('../../deploy/roles')
  // run-process.js starts a role when loaded, so read its ROLES table instead of requiring it.
  const src = fs.readFileSync(path.join(__dirname, '../../deploy/run-process.js'), 'utf8')
  const table = /const ROLES = \{([\s\S]*?)\n\}/.exec(src)[1]
  const keys = [...table.matchAll(/^\s+'?([a-z-]+)'?:/gm)].map((m) => m[1])
  t.alike([...keys].sort(), [...SITE_ROLES].sort())
})

test('withDhtRole - adds the private DHT bootstrap first when site.deploy.json has a dht section', (t) => {
  const { withDhtRole } = require('../../start')
  t.alike(withDhtRole(['mocks', 'kernel'], { host: '127.0.0.1', port: 49737 }), ['dht-bootstrap', 'mocks', 'kernel'])
  t.alike(withDhtRole(['dht-bootstrap', 'kernel'], { host: '127.0.0.1' }), ['dht-bootstrap', 'kernel'], 'already listed')
})

test('withDhtRole - drops the role without a dht section, or with an external bootstrap list', (t) => {
  const { withDhtRole } = require('../../start')
  const warnings = []
  t.alike(withDhtRole(['dht-bootstrap', 'kernel'], undefined, (w) => warnings.push(w)), ['kernel'])
  t.alike(withDhtRole(['dht-bootstrap', 'kernel'], { bootstrap: ['10.0.0.5:49737'] }, (w) => warnings.push(w)), ['kernel'])
  t.alike(withDhtRole(['kernel'], undefined), ['kernel'], 'public DHT, nothing to add')
  t.is(warnings.length, 2)
})
