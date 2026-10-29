'use strict'

// Single per-process entrypoint for every PM2-supervised role — mocks, kernel,
// workers, gateway, mcp. Which role to run comes from --role, set by start.js from
// config/site.deploy.json's pm2.roles (also runnable directly for debugging
// one role in isolation, e.g. `node deploy/run-process.js --role kernel`).

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { startGateway, startDhtBootstrap, onShutdown } = require('@tetherto/mdk-core')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const { createMcpServer } = require('@tetherto/mdk-mcp')
const { trustedKeysDir, publishTrustedKey, callerKeyPair } = require('@tetherto/mdk-core/lib/local-discovery')
const {
  ROOT, GATEWAY_PORT, GATEWAY_HOST, GATEWAY_ALLOWED_HOSTS, PLUGIN_DIRS, STATIC_ROOT_PATH, DISCOVERY, DHT, DHT_CONF,
  MCP_AGENT_TOOLS_PORT, MCP_PLUGIN_DIRS,
  loadSeedDevices, startMocks, startAntminerMocks, startSealminerMocks, startSatecMocks, startOceanMock, startEmcdMock,
  startSpiderpoolMock, startFoundryMock,
  bootKernel, bootWorker, bootAntminerWorker, bootSealminerWorker, bootOceanWorker, bootSatecWorker, bootEmcdWorker,
  bootSpiderpoolWorker, bootFoundryWorker
} = require('../backend/site')
const { SITE_ROLES } = require('./roles')
const { credentialFile, signingCredential, MCP_TOOLS_ACCOUNT, GATEWAY_ACCOUNT } = require('../backend/access')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const readKernelTopic = (root, mode) => {
  if (mode !== 'dht') return null
  const topicFile = path.join(root, '.dht-topic')
  if (!fs.existsSync(topicFile)) throw new Error('ERR_KERNEL_TOPIC_MISSING: start the Kernel first')
  return fs.readFileSync(topicFile, 'utf8').trim()
}

// The site's private HyperDHT bootstrap (site.deploy.json `dht`): every other
// role joins it at host:port and binds its DHT node to host, so nothing in the
// site talks to the public *.hyperdht.org nodes. Start order does not matter: a
// DHT node that starts first joins as soon as the bootstrap answers.
const runDhtBootstrap = async () => {
  if (!DHT_CONF || DHT_CONF.bootstrap) throw new Error('ERR_DHT_BOOTSTRAP_ROLE_UNUSED: site.deploy.json has no dht section, or lists its own dht.bootstrap')
  const net = await startDhtBootstrap({ host: DHT_CONF.host, port: DHT_CONF.port })
  onShutdown(() => net.close())
  console.log('MDK_READY dht-bootstrap bootstrap=%s', net.bootstrap.join(','))
}

// Boots one Whatsminer mock server per seed miner in config/devices.json — the
// real worker connects to these instead of hardware. The mock listeners keep
// the event loop alive; SIGINT/SIGTERM tear them down.
const runMocks = async () => {
  const { miners } = loadSeedDevices()
  const { ready, close } = startMocks(miners)
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks devices=%d', miners.length)
}

// One Antminer CGI mock per seed entry under `antminers` in config/devices.json.
const runAntminerMocks = async () => {
  const { antminers } = loadSeedDevices()
  const { ready, close } = startAntminerMocks(antminers)
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-antminer devices=%d', antminers.length)
}

// One SealMiner 4028 API mock per seed entry under `sealminers` in config/devices.json.
const runSealminerMocks = async () => {
  const { sealminers } = loadSeedDevices()
  const { ready, close } = startSealminerMocks(sealminers)
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-sealminer devices=%d', sealminers.length)
}

// The meter's power reading tracks the whole fleet —
// Whatsminer, Antminer and SealMiner seeds together.
const fleetSize = ({ miners, antminers, sealminers }) => miners.length + antminers.length + sealminers.length

// The Ocean, EMCD, SpiderPool and Foundry API mocks serve their packages' fixture accounts.
const runOceanMock = async () => {
  const { ready, close } = startOceanMock()
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-ocean')
}

const runEmcdMock = async () => {
  const { ready, close } = startEmcdMock()
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-emcd')
}

const runSpiderpoolMock = async () => {
  const { ready, close } = startSpiderpoolMock()
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-spiderpool')
}

const runFoundryMock = async () => {
  const { ready, close } = startFoundryMock()
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-foundry')
}

const runSatecMocks = async () => {
  const seeds = loadSeedDevices()
  const { powermeters } = seeds
  const { ready, close } = startSatecMocks(powermeters, fleetSize(seeds))
  await ready

  onShutdown(async () => close())

  console.log('MDK_READY mocks-satec devices=%d', powermeters.length)
}

// Boots the Kernel. --discovery local|dht (default from config/site.deploy.json).
// local: getKernel registers the worker by the RPC key it publishes to the
// shared dir. dht: Hyperswarm topic — this role owns the topic file (reads
// .dht-topic, else generates + writes it). Writes the Kernel's HRPC public key
// to .kernel-key for the gateway to connect.
const runKernel = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  fs.mkdirSync(root, { recursive: true })

  let topic = null
  if (mode === 'dht') {
    const topicFile = path.join(root, '.dht-topic')
    topic = fs.existsSync(topicFile) ? fs.readFileSync(topicFile, 'utf8').trim() : null
    if (!topic) {
      topic = crypto.randomBytes(32).toString('hex')
      fs.writeFileSync(topicFile, topic, 'utf8')
    }
  }

  const kernel = await bootKernel({ root, topic, mode })
  const kernelKey = kernel.getPublicKey().toString('hex')
  fs.writeFileSync(path.join(root, '.kernel-key'), kernelKey, 'utf8')

  // getKernel({ handleSignals: true }) handles SIGINT/SIGTERM (drains kernel._cleanup, then kernel.stop()).
  console.log('MDK_READY kernel key=%s mode=%s%s', kernelKey, mode, topic ? ` topic=${topic}` : '')
}

// Boots the Whatsminer worker (no in-process Kernel handle). local (default):
// publish the RPC key to the shared dir. dht: read the Kernel's topic from
// .dht-topic and join it. Seed devices come from config/devices.json (miners).
const runWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  const { miners } = loadSeedDevices()
  const handle = await bootWorker({ kernelTopic, root, mode, devices: miners })
  const seeded = handle.seeded

  // bootWorker (no kernel handle) binds SIGINT/SIGTERM to the runtime handle's stop.
  console.log('MDK_READY worker devices=%d', seeded)
}

// Boots the Antminer worker — same discovery handling as runWorker; seed
// devices come from config/devices.json (antminers).
const runAntminerWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  const { antminers } = loadSeedDevices()
  const handle = await bootAntminerWorker({ kernelTopic, root, mode, devices: antminers })

  console.log('MDK_READY worker-antminer devices=%d', handle.seeded)
}

// Boots the SealMiner worker — same discovery handling as runWorker; seed
// devices come from config/devices.json (sealminers).
const runSealminerWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  const { sealminers } = loadSeedDevices()
  const handle = await bootSealminerWorker({ kernelTopic, root, mode, devices: sealminers })

  console.log('MDK_READY worker-sealminer devices=%d', handle.seeded)
}

const runOceanWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  await bootOceanWorker({ kernelTopic, root, mode })

  console.log('MDK_READY worker-ocean')
}

const runEmcdWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  await bootEmcdWorker({ kernelTopic, root, mode })

  console.log('MDK_READY worker-emcd')
}

const runSpiderpoolWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  await bootSpiderpoolWorker({ kernelTopic, root, mode })

  console.log('MDK_READY worker-spiderpool')
}

const runFoundryWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  await bootFoundryWorker({ kernelTopic, root, mode })

  console.log('MDK_READY worker-foundry')
}

const runSatecWorker = async () => {
  const root = arg('--root', ROOT)
  const mode = arg('--discovery', DISCOVERY)
  const kernelTopic = readKernelTopic(root, mode)

  const { powermeters } = loadSeedDevices()
  const handle = await bootSatecWorker({ kernelTopic, root, mode, devices: powermeters })
  const seeded = handle.services.provisioning.listDeviceIds().length

  console.log('MDK_READY worker-satec devices=%d', seeded)
}

// Each gateway plugin dir <name> runs as an app in its own `app-<name>` process.
// Keys travel through files under the data root, re-read on every connection
// or request, so the roles start in any order.
// PM2 starts every role at once: wait for the Kernel to publish its key instead
// of exiting and crash-looping until it has.
const KERNEL_KEY_WAIT_MS = 30000
const readKernelKey = async (root) => {
  const file = path.join(root, '.kernel-key')
  const deadline = Date.now() + KERNEL_KEY_WAIT_MS
  while (!fs.existsSync(file)) {
    if (Date.now() > deadline) throw new Error('ERR_KERNEL_KEY_MISSING: start the Kernel first')
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return fs.readFileSync(file, 'utf8').trim()
}

// The site's DHT settings as a Kernel client's config.
const kernelDht = () => (DHT.bootstrap ? { kernelBootstrap: DHT.bootstrap, ...(DHT.dhtHost ? { kernelDhtHost: DHT.dhtHost } : {}) } : {})

const appKeyFile = (root, name) => path.join(root, 'apps', name, 'runtime.key')
const gatewayKeyFile = (root) => path.join(root, 'gateway.key')
const mcpKeyFile = (root) => path.join(root, 'mcp.key')

// The app runtimes the Gateway and the MCP server forward to.
const siteApps = (root) => PLUGIN_DIRS.map((appDir) => {
  const name = path.basename(appDir)
  return { name, appDir, keyFile: appKeyFile(root, name), mount: '/' }
})

// Boots one app runtime (--role app-<name>), with its own Kernel keypair under
// apps/<name>/ (published to the trusted-keys dir), accepting calls only from
// the gateway's key.
const runApp = async (name) => {
  const root = arg('--root', ROOT)
  const appDir = PLUGIN_DIRS.find((dir) => path.basename(dir) === name)
  if (!appDir) throw new Error(`ERR_UNKNOWN_APP: no gateway plugin dir named "${name}"`)

  const kernelKey = await readKernelKey(root)

  const runtime = createAppRuntime({
    name,
    appDir,
    kernelKey,
    storeDir: path.join(root, 'apps', name),
    keyFile: appKeyFile(root, name),
    allowedKeyFiles: [gatewayKeyFile(root), mcpKeyFile(root)],
    // The Kernel is fail-closed: it admits the app's Kernel key from the trusted-keys dir,
    // and checks every call against spec.rbac as app:<name>, signed in with this credential.
    kernelKeyFile: path.join(trustedKeysDir(root), `app-${name}.pub`),
    credentialFile: credentialFile(root, `app:${name}`),
    // Private DHT: the runtime's server and its Kernel client both join it.
    ...DHT,
    ...kernelDht()
  })
  await runtime.start()
  onShutdown(() => runtime.stop())
  console.log('MDK_READY app name=%s kernel=%s', name, kernelKey.slice(0, 16))
}

// Boots the gateway (static UI, sign-in, and app routes forwarded to the app runtimes,
// mounted at `/` because the UI calls root paths), connecting to the Kernel by
// its .kernel-key public key (RPC-listener-only — no in-process Kernel handle).
// HTTP only: the site plugin's routes also reach agents as MCP
// tools, but that is the --role mcp process forwarding to the same runtime, not
// anything this gateway hosts.
const runGateway = async () => {
  const root = arg('--root', ROOT)
  const port = Number(arg('--port', GATEWAY_PORT))

  const kernelKey = await readKernelKey(root)

  await startGateway({
    handleSignals: true,
    kernelKey,
    apps: siteApps(root),
    gatewayKeyFile: gatewayKeyFile(root),
    // The Kernel (and workers) are fail-closed: publish this gateway's client
    // key where the separately-running Kernel and workers admit it from.
    trustedKeysDir: trustedKeysDir(root),
    port,
    httpd: { h0: { host: GATEWAY_HOST } },
    allowedHosts: GATEWAY_ALLOWED_HOSTS,
    // Signed in as mvp-gateway, the Gateway follows the Kernel's spec.rbac: it
    // serves /auth/login|refresh|logout|me, every app route needs a user's
    // bearer token and a rule allowing it, and the user's token travels on to
    // the Kernel, which checks their device access too (see backend/access.js).
    gatewayCredential: signingCredential(root, GATEWAY_ACCOUNT),
    root: path.join(root, 'gateway'),
    common: { staticRootPath: STATIC_ROOT_PATH },
    // Private DHT: the Gateway's net facility, Kernel client and app runtime client.
    ...DHT
  })

  // An app runtime that is not up yet answers 503, so no depends_on/ordering
  // is required between the PM2 apps.
  // startGateway({ handleSignals: true }) handles SIGINT/SIGTERM (hnd.stop()).
  console.log('MDK_READY gateway port=%d kernel=%s', port, kernelKey.slice(0, 16))
}

// Boots the standalone MCP server (Streamable HTTP) serving both tool sources
// this example has: the hand-authored agent-contract tools from MCP_PLUGIN_DIRS
// (mcp-plugin.json manifests — curated granularity and descriptions), and the
// site app's own HTTP routes, read off its route table and converted into tools
// (site_overview, site_history, site_miner_command, site_miner_pools) whose
// calls are forwarded to the site app's runtime, as the gateway's are. The
// Kernel's .kernel-key public key goes into the ambient plugin
// config — each tool plugin authors its own HRPC client from it (lib/client.js),
// so no client is built here.
const runMcp = async () => {
  const root = arg('--root', ROOT)
  const port = Number(arg('--port', MCP_AGENT_TOOLS_PORT))

  const kernelKey = await readKernelKey(root)

  // Write tools (act_device, Gateway `safety: "write"` routes) stay withheld:
  // pass allowWrite/allowTools here to expose them. handleSignals stops the
  // HTTP server on SIGINT/SIGTERM.
  // A persistent caller identity the Kernel admits from the trusted-keys dir;
  // every tool plugin's client dials with it (config.kernelKeyPair).
  const kernelKeyPair = callerKeyPair(path.join(root, 'mcp', 'identity'))
  publishTrustedKey(trustedKeysDir(root), 'mcp', kernelKeyPair.publicKey)
  // The tool plugins call the Kernel as mvp-mcp-tools (see backend/access.js).
  const kernelCredential = MCP_PLUGIN_DIRS.length ? signingCredential(root, MCP_TOOLS_ACCOUNT) : undefined
  await createMcpServer(path.join(root, 'mcp'), port, { kernelKey, kernelKeyPair, ...(kernelCredential ? { kernelCredential } : {}), ...kernelDht() }, MCP_PLUGIN_DIRS, siteApps(root), {
    handleSignals: true,
    keyFile: mcpKeyFile(root)
  })

  console.log('MDK_READY mcp port=%d kernel=%s', port, kernelKey.slice(0, 16))
}

const ROLES = {
  'dht-bootstrap': runDhtBootstrap,
  mocks: runMocks,
  'mocks-antminer': runAntminerMocks,
  'mocks-sealminer': runSealminerMocks,
  'mocks-ocean': runOceanMock,
  'mocks-satec': runSatecMocks,
  'mocks-emcd': runEmcdMock,
  'mocks-spiderpool': runSpiderpoolMock,
  'mocks-foundry': runFoundryMock,
  kernel: runKernel,
  worker: runWorker,
  'worker-antminer': runAntminerWorker,
  'worker-sealminer': runSealminerWorker,
  'worker-ocean': runOceanWorker,
  'worker-satec': runSatecWorker,
  'worker-emcd': runEmcdWorker,
  'worker-spiderpool': runSpiderpoolWorker,
  'worker-foundry': runFoundryWorker,
  gateway: runGateway,
  mcp: runMcp
}

// deploy/roles.js is what start.js trusts: keep the two lists the same.
const unlisted = Object.keys(ROLES).filter((r) => !SITE_ROLES.includes(r)).concat(SITE_ROLES.filter((r) => !ROLES[r]))
if (unlisted.length) throw new Error(`ERR_ROLES_OUT_OF_SYNC: deploy/roles.js and run-process.js disagree on ${unlisted.join(', ')}`)

const main = async () => {
  const role = arg('--role')
  const run = ROLES[role] || (role?.startsWith('app-') && (() => runApp(role.slice(4))))
  if (!run) throw new Error(`ERR_UNKNOWN_ROLE: --role must be one of ${Object.keys(ROLES).join(', ')}, or app-<name>`)
  await run()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
