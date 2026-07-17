---
title: Run the full-site example
description: "[⏱️ <5 min] From git clone to a live site with multiple Workers and mock hardware, after a one-time setup"
docs@tether_slug: tutorials/quickstart/full-stack-demo
---

## Overview

This tutorial presents the [full-site example][full-site-example] end to end running the full MDK stack: multiple
configured Workers across a range of device families, their mock device servers, a Gateway HTTP API, and a React
dashboard, all in one command.

What you'll have at the end:

- The supported fleet: multiple miner types, container types, and power meters;
  one sensor family with two inlet sensors; and two mining pools, each backed by
  mock hardware that speaks the real wire protocol
- A Gateway API at `:3007` serving `/site/overview`, `/site/history`, and `/site/miners/:id/command`
- A React dashboard at `:3040` with live hashrate, power, and device status
- An MCP server exposing the site's device registry, telemetry, and commands as tools for AI agents

The example can boot in one Node.js process (`node start.js`) or as separate processes through an interactive REPL (`node cli.js`). 
This tutorial uses `start.js` — the simplest path.

## Prerequisites

- Node.js >=24 (LTS)
- npm >=11

<Steps>

<Step>

### Install the example

#### 1.1 Clone the repo

```bash
git clone git@github.com:tetherto/mdk.git
cd mdk
```

#### 1.2 Run setup

```bash
cd examples/full-site
npm run setup
```

`setup` installs `backend/core`, `backend/workers`, the UI workspace devkit packages, and this example's own dependencies. It runs once; subsequent 
starts skip it.

> [!NOTE]
> The script walks several workspaces; first run takes 1-2 minutes.

</Step>

<Step>

### Start the site

Start with a small fleet (3 miners per family, 9 total) for a fast first boot:

```bash
node start.js --miners 3
```

Wait for the terminal to print the Gateway and UI URLs:

```
Gateway  http://localhost:3007
UI       http://localhost:3040
```

Open `http://localhost:3040` in a browser. The dashboard shows live hashrate, total power, and a per-device breakdown.

Verify via the API:

```bash
curl -s http://localhost:3007/site/overview | jq '{miners: (.miners|length), containers: (.containers|length), pools: (.pools|length), sensors: (.sensors|length)}'
```

Expected output:

```
{
  "miners": 9,
  "containers": 2,
  "pools": 2,
  "sensors": 2
}
```

> [!IMPORTANT]
> The default fleet (100 miners per family, 300 total) opens 900+ file descriptors simultaneously. Before switching from `--miners 3` to the full 
> fleet, run `ulimit -n 4096` in the same terminal session.

</Step>

</Steps>

## What just happened

1. **Setup** installed `backend/core`, `backend/workers`, the MDK UI devkit, and this example — all the packages `start.js` imports at boot.
2. **Mock hardware** — `mocks.js` started one server per device family (miners on TCP, containers on HTTP and MQTT, power meters and sensors on
   Modbus, pools on REST). They speak the real wire protocols; every Worker driver runs its true connect, collect, and command paths against them.
3. **Kernel** — `getKernel()` started the orchestration layer that discovers Workers as they register and routes telemetry pulls and commands to them.
4. **Workers** — eleven `bootWorker()` calls, one per configured Worker spec, each dispatching to that family's `start{X}Worker()` boot function
(`startWhatsminerWorker`, `startAvalonWorker`, ...) to construct a `WorkerRuntime` and connect it to the Kernel.
5. **Gateway** — `startGateway()` mounted the site plugin from `plugins/site/` and opened the HTTP server on `:3007`. The plugin aggregates data across 
the configured Workers through `mdkClient`.
6. **UI** — a Vite React dev server started on `:3040`, serving a dashboard built from MDK devkit components.
7. **MCP server** — an MCP server started over HRPC, exposing the site's device registry, telemetry, and command dispatch as tools for AI agents.

## Cleanup

`Ctrl+C` stops mocks, Workers, Kernel, Gateway, and the UI dev server cleanly.

State (Kernel key, Worker seeds, device registry, and tail-log history) persists in `.mdk-data/`. To wipe it:

```bash
rm -rf examples/full-site/.mdk-data
```

## Next steps

- If Kernel, Gateway, Worker, manager, or thing are unfamiliar, read [terminology][terminology]
- Run the same supported Worker fleet under PM2 or Docker — [Multi-process deployment guide][all-workers]
- Add [custom plugins to the Gateway HTTP API][plugins]
- Connect an [AI agent to the MCP server][mcp-server] to query and command the site
- Explore [the interactive CLI process manager][full-site-example] for per-process logs, runtime seeding, and live status

## Links

[terminology]: ../../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[full-site-example]: ../../../examples/full-site/README.md
<!-- docs@tether.io: full-site-example → https://github.com/tetherto/mdk/tree/main/examples/full-site -->

[all-workers]: ../../guides/deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[plugins]: ../../guides/gateway/plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[mcp-server]: ../../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
