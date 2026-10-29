'use strict'

// Every role deploy/run-process.js can run, besides app-<name> (one per
// gateway.pluginDirs entry). start.js drops a pm2.roles entry not listed here,
// such as one a config written on another branch still names, instead of
// letting PM2 restart it forever on ERR_UNKNOWN_ROLE.
const SITE_ROLES = Object.freeze([
  'dht-bootstrap',
  'mocks',
  'mocks-antminer',
  'mocks-ocean',
  'mocks-satec',
  'mocks-emcd',
  'mocks-spiderpool',
  'mocks-foundry',
  'mocks-sealminer',
  'kernel',
  'worker',
  'worker-antminer',
  'worker-ocean',
  'worker-satec',
  'worker-emcd',
  'worker-spiderpool',
  'worker-foundry',
  'worker-sealminer',
  'gateway',
  'mcp'
])

module.exports = { SITE_ROLES }
