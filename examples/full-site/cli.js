'use strict'

// Interactive process-manager REPL for the full-site example.
//
//   node cli.js
//
// Boots and manages each MDK component (mocks, Kernel, each worker, gateway, UI)
// as its own OS process, with per-process logs, live status over HRPC, and
// device seeding. start.js (the one-shot single-process path) is unaffected.
//
// The command logic lives in cli/commands (driven directly by the tests); this
// file is just the readline shell + lifecycle wiring around it. The MDK
// integration the example teaches lives under backend/.

const { checkDeps } = require('./preflight')
checkDeps()

const readline = require('readline')
const { ProcessManager } = require('./cli/process-manager')
const { createDispatcher, HELP } = require('./cli/commands')
const { ROOT, HTTP_PORT, UI_PORT, MCP_PORT } = require('./backend/site')

function main () {
  const pm = new ProcessManager({ root: ROOT, cwd: __dirname })
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.setPrompt('mdk> ')

  let shuttingDown = false
  async function shutdown () {
    if (shuttingDown) return
    shuttingDown = true
    console.log('\nstopping all components…')
    try { await pm.stopAll() } catch {}
    rl.close()
    process.exit(0)
  }

  const ctx = {
    pm,
    root: ROOT,
    siteDir: __dirname,
    httpPort: HTTP_PORT,
    uiPort: UI_PORT,
    mcpPort: MCP_PORT,
    // Core discovery mode for spawned components; override per-run with `up --discovery dht`.
    discovery: process.env.MDK_DISCOVERY || 'local',
    print: (s) => console.log(s),
    exit: shutdown
  }
  const { dispatch } = createDispatcher(ctx)

  let follow = null
  const stopFollow = () => { if (follow) { follow.stop(); follow = null } }

  console.log('\n  MDK full-site CLI — type "help" for commands, "up" to boot the site.\n')
  console.log(HELP + '\n')
  rl.prompt()

  rl.on('line', async (line) => {
    if (follow) { stopFollow(); rl.prompt(); return }
    const result = await dispatch(line.trim())
    if (result && result.follow) follow = result.follow
    if (!shuttingDown) rl.prompt()
  })

  rl.on('SIGINT', () => {
    if (follow) { stopFollow(); rl.prompt(); return }
    shutdown()
  })
}

main()
