---
title: Run a mining site end to end
description: "[⏱️ <3 min] From git clone to a live site with three Workers, mock hardware, and a browser dashboard"
docs@tether_slug: tutorials/run-a-site
---

> [!NOTE]
> If Kernel, Gateway, Worker, manager, or thing are unfamiliar, [terminology][terminology] defines them.

## Overview

This tutorial runs the [Starter site example][mvp-site-example] end to end: a Whatsminer worker, an Ocean pool worker, and a SATEC
powermeter worker, each backed by mock hardware that speaks the real wire protocol, a Gateway HTTP API, and a React dashboard, all
supervised by PM2.

What you'll have at the end:

- Mock miners, a mock pool, and a mock powermeter, each driven by the real Worker driver code against a localhost mock instead of
  hardware
- A Gateway API on `:3000` serving `/site/overview`, `/site/history`, `/site/miners/:id/command`, and `/site/miners/:id/pools`
- A React dashboard on `:3000` with Dashboard, Containers, Monitoring, Pools, and Control pages
- One MCP surface on `:3101` exposing the site as tools for AI agents, served by a standalone MCP process: a hand-authored,
  agent-contract tool set alongside the site Gateway plugin's own routes, read off the same plugin dir the Gateway loads

Every component above runs as its own PM2-supervised OS process, discovering the Kernel over a shared local directory rather than a
DHT.

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- PM2 (`npm install -g pm2`)

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
cd examples/mvp-site
npm run setup
npm run setup:config
```

`setup` installs [`backend/core`](../../backend/core/README.md), [`backend/workers`](../../backend/workers/README.md), the UI workspace devkit packages, and this example's own dependencies. `setup:config` copies the committed `*.json.example` config files
into place without overwriting any that already exist.

> [!NOTE]
> The script walks several workspaces; first run takes 1-2 minutes.

</Step>

<Step>

### Start the site

```bash
npm start
```

[`start.js`](../../examples/mvp-site/start.js) generates `deploy/ecosystem.config.js` from [`config/site.deploy.json`](../../examples/mvp-site/config/site.deploy.json.example), starts the PM2 apps, then exits — PM2 itself keeps the processes running in the background.

```bash
pm2 list      # mocks, mocks-ocean, mocks-satec, kernel, worker, worker-ocean, worker-satec, gateway, mcp
```

Wait for every app to show `online`, then open `http://localhost:3000/` in a browser. The dashboard shows live hashrate, power, and
per-device status.

> [!IMPORTANT]
> PM2 showing every app `online` means the processes started, not that the site has fully settled. The Ocean pool worker ticks its
> mock fetch/save cycle every 10 seconds, and Kernel's local-discovery scan runs every 4 seconds, so `/site/overview` can report
> `"pools": 0` for 15-20 seconds after `pm2 list` goes green. Retry the command below if the first response comes back short.

Verify via the API:

```bash
curl -s http://localhost:3000/site/overview | jq '{miners: (.miners|length), pools: (.pools|length), powermeters: (.powermeters|length)}'
```

Expected output:

```text
{
  "miners": 5,
  "pools": 1,
  "powermeters": 1
}
```

> [!NOTE]
> [`config/devices.json`](../../examples/mvp-site/config/devices.json.example) seeds five miners and one powermeter by default. Add
> or remove entries there to resize the fleet; [configuring devices][mvp-site-devices] describes the format.

</Step>

<Step>

### (Optional) Explore the UI pages

The Dashboard, Containers, Monitoring, Pools, and Control pages are all served from `ui/dist` via the Gateway on the same `:3000`
port. The Pools page reads the Ocean pool worker's stats; the Monitoring page charts the SATEC meter's power series over time. See
[UI pages][mvp-site-ui] for what each one shows.

</Step>

<Step>

### (Optional) Connect an AI agent over MCP

> [!TIP]
> Agents and connection modes vary; apply the method for your agent. For Claude CLI:
> `cd examples/mvp-site`
> `claude`
> Accept `Use this MCP server`
> Then your agent can query and act on the site's devices.

The example exposes MCP as a single surface on `:3101`, served by a standalone MCP process and listed in [`.mcp.json.example`](../../examples/mvp-site/.mcp.json.example). It carries two tool sources:

- A hand-authored tool set with agent-contract metadata — [`backend/mcp-plugins/site/mcp-plugin.json`](../../examples/mvp-site/backend/mcp-plugins/site/mcp-plugin.json) — giving an agent summary-first, closed-vocabulary tools (`summarize_site`, `count_devices`, `list_devices`,
  `get_device`, `rank_devices`, `act_device`) instead of raw route exports
- The site Gateway plugin's own `/site/*` routes, read off the same plugin dir the Gateway loads and converted into tools

Point an MCP client at that URL and it can query the fleet or, with the agent-contract tools, act on it with operator approval. This local site runs an empty Kernel allowlist; a hardened Kernel restricts the MCP connection through [Kernel's caller allowlist][mcp-allowlist].

</Step>

<Step>

### Stop the site

```bash
npm run stop:pm2
```

This stops and removes every PM2-managed process for this site: mocks, Workers, Kernel, Gateway, and the MCP server.

> [!NOTE]
> The PM2 daemon itself (`pm2 list` still shows a `God Daemon` process) stays running in the background after this — that's expected,
> since PM2 manages processes across every project on the machine, not just this one. If it ever becomes unresponsive, see
> [stale PM2 processes][mvp-site-stale-pm2] for `pm2 kill`, which stops PM2 itself, not just this site.

</Step>

</Steps>

## What just happened

1. **Setup** installed [`backend/core`](../../backend/core/README.md), [`backend/workers`](../../backend/workers/README.md), the
   MDK UI devkit, and this example, then `setup:config` seeded its local config from the committed `*.example` files.
2. **Mock hardware**: PM2's `mocks`, `mocks-ocean`, and `mocks-satec` roles each started a mock device server — a Whatsminer miner,
   an Ocean pool, and a SATEC powermeter — speaking the real wire protocol, so the Worker drivers run their true connect, collect,
   and command paths against them.
3. **Kernel**: the `kernel` role started the orchestration layer in local-discovery mode, watching a shared directory for Workers to
   publish their RPC keys to.
4. **Workers**: the `worker`, `worker-ocean`, and `worker-satec` roles each dispatched to that family's boot function
   (`startWhatsminerWorker`, `startOceanPoolWorker`, `startSatecWorker`) to construct a `WorkerRuntime`, seed its devices from
   `config/devices.json`, and publish its RPC key for the Kernel to discover.
5. **Gateway**: the `gateway` role mounted the site plugin declared by [`backend/gateway-plugins/site/mdk-plugin.json`](../../examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json) and the built UI from `ui/dist`, then opened the HTTP server on `:3000`. The plugin aggregates data across the
   three Workers through `mdkClient`.
6. **MCP**: the `mcp` role started the standalone MCP process on `:3101`, serving both tool sources — the hand-authored
   agent-contract tool set and the site Gateway plugin's own routes, derived from the same plugin dir the Gateway loads.

## Resetting state

State (Kernel key, Worker seeds, device registry) persists in `.site-data/`. If you change `config/devices.json` after the first
run, [reset it][mvp-site-reset] before restarting — seed devices are only registered once, on an empty store.

## Next steps

- Fix a failed boot, a port clash, or stale PM2 processes with the example's [troubleshooting section][mvp-site-troubleshooting]
- Register real hardware instead of mocks by [configuring devices][mvp-site-devices]
- Build the same shape from an empty directory with one Worker and one route: [build a minimal single-page dashboard][build-a-dashboard]
- Serve your own data by [adding custom plugins to the Gateway HTTP API][plugins]
- Integrate your own hardware by [building a third-party Worker][build-a-worker]
- Run the same PM2-supervised model as a production deployment, or across hosts with DHT discovery, with the [supervised-services deployment guide][all-workers]
- Go beyond querying the site's MCP tools by hand: connect [the conversational operator agent][agent-guides], which calls the same
  tools and gates writes behind human approval
- See the full 11-worker fleet — three miner families, containers, sensors, and two pools — in [`examples/full-site`][full-site-example]
- Browse [every runnable example in one place][examples-readme]

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[npm-version]: ../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[terminology]: ../reference/glossary.md
<!-- docs@tether.io: terminology → reference/glossary -->

[mvp-site-example]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site-example → https://github.com/tetherto/mdk/tree/main/examples/mvp-site -->

[mvp-site-devices]: ../../examples/mvp-site/README.md#configure-devices
<!-- docs@tether.io: mvp-site-devices → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#configure-devices -->

[mvp-site-ui]: ../../examples/mvp-site/README.md#ui-pages
<!-- docs@tether.io: mvp-site-ui → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#ui-pages -->

[mvp-site-reset]: ../../examples/mvp-site/README.md#reset-state
<!-- docs@tether.io: mvp-site-reset → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#reset-state -->

[mvp-site-stale-pm2]: ../../examples/mvp-site/README.md#stale-pm2-processes-after-system-crash
<!-- docs@tether.io: mvp-site-stale-pm2 → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#stale-pm2-processes-after-system-crash -->

[mvp-site-troubleshooting]: ../../examples/mvp-site/README.md#troubleshooting

[mcp-allowlist]: ../guides/security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->
<!-- docs@tether.io: mvp-site-troubleshooting → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#troubleshooting -->

[all-workers]: ../guides/deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[plugins]: ../guides/gateway/plugins.md
<!-- docs@tether.io: plugins → guides/gateway/plugins -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->

[examples-readme]: ../../examples/backend/README.md
<!-- docs@tether.io: examples-readme → https://github.com/tetherto/mdk/blob/main/examples/backend/README.md -->

[full-site-example]: ../../examples/full-site/README.md
<!-- docs@tether.io: full-site-example → https://github.com/tetherto/mdk/tree/main/examples/full-site -->

[agent-guides]: ../guides/agent/index.md
<!-- docs@tether.io: agent-guides → guides/agent -->
