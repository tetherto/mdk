---
title: Run a mining site end to end
description: "[⏱️ <3 min] From git clone to a live site with six Workers, mock hardware, a browser dashboard, and an AI agent answering questions about the fleet"
docs@tether_slug: tutorials/run-a-site
---

> [!NOTE]
> If Kernel, Gateway, Worker, manager, or thing are unfamiliar, [terminology][terminology] defines them.

## Overview

This tutorial runs the [Starter site example][mvp-site-example] end to end: Whatsminer, Antminer, and SealMiner Workers, Ocean,
EMCD, SpiderPool, and Foundry pool Workers, and a SATEC powermeter Worker, each backed by a mock that speaks the real wire protocol, plus a Gateway HTTP
API and a React dashboard, all supervised by PM2.

What you'll have at the end:

- Mock miners, four mock pool APIs, and a mock powermeter, each driven by the real Worker driver code against a localhost mock
  instead of hardware
- A Gateway API on `:3000` serving `/site/overview`, `/site/history`, `/site/miners/:id/command`, and `/site/miners/:id/pools`
- A React dashboard on `:3000` with Dashboard, Containers, Monitoring, Pools, and Control pages
- One MCP surface on `:3101` exposing the site as tools for AI agents, served by a standalone MCP process: a hand-authored,
  agent-contract tool set alongside the site app's own routes, read off the same route table the Gateway forwards

Every component above runs as its own PM2-supervised OS process. Kernel discovers the Workers through a shared local directory
rather than a DHT topic, and the Gateway and MCP server find Kernel through its well-known key file.

## Prerequisites

- [Node.js][node] >=24 (LTS)
- npm 11 [(< 12)][npm-version]
- PM2 (`npm install -g pm2`)
- [Outbound UDP to the HyperDHT bootstrap nodes][network-requirements]

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
pm2 list      # mocks, mocks-antminer, mocks-ocean, mocks-satec, mocks-emcd, mocks-spiderpool, mocks-foundry, kernel, worker, worker-antminer, worker-ocean, worker-satec, worker-emcd, worker-spiderpool, worker-foundry, app-site, gateway, mcp
```

> [!WARNING]
> PM2 identifies processes by role name and shares one daemon across every project on the machine. Starting this site while another
> site that uses the same roles (`mocks`, `kernel`, `gateway`, `mcp`) is running restarts that site's processes instead of starting
> new ones, and stopping either site removes both. Stop the other site first, with `npm run stop:pm2` from its directory.

Wait for every app to show `online`, then open `http://localhost:3000/` in a browser. The dashboard shows live hashrate, power, and
per-device status.

> [!IMPORTANT]
> PM2 showing every app `online` means the processes started, not that the site has fully settled. The pool Workers tick their
> mock fetch/save cycle every 10 seconds, SpiderPool spaces its API requests one second apart, and Kernel's local-discovery scan
> runs every 4 seconds, so `/site/overview` can report fewer than 4 pools for 15-20 seconds after `pm2 list` goes green. Retry the
> command below if the first response comes back short.

Verify via the API:

```bash
curl -s http://localhost:3000/site/overview | jq '{miners: (.miners|length), pools: (.pools|length), powermeters: (.powermeters|length)}'
```

Expected output:

```text
{
  "miners": 10,
  "pools": 4,
  "powermeters": 1
}
```

> [!NOTE]
> [`config/devices.json`](../../examples/mvp-site/config/devices.json.example) seeds five Whatsminer miners, three Antminer miners,
> two SealMiner miners, and one powermeter by default. Add or remove entries there to resize the fleet; [configuring devices][mvp-site-devices] describes
> the format. The four pools aren't seeded devices: each pool Worker reports one account from its section of
> [`config/site.deploy.json`](../../examples/mvp-site/config/site.deploy.json.example).

</Step>

<Step>

### (Optional) Explore the UI pages

The Dashboard, Containers, Monitoring, Pools, and Control pages are all served from `ui/dist` via the Gateway on the same `:3000`
port. The Pools page lists the Ocean, EMCD, SpiderPool, and Foundry accounts side by side; the Monitoring page charts the SATEC meter's power
series over time. [UI pages][mvp-site-ui] describes what each one shows.

</Step>

<Step>

### (Optional) Report a real EMCD, SpiderPool, or Foundry account

The EMCD, SpiderPool, and Foundry Workers read their API credentials from the environment, never from `config/site.deploy.json`.
With the variables unset, each Worker logs a warning and authenticates with its package's public mock credentials, which only the
bundled mock accepts.

| Pool       | Environment variables                           | Accounts setting                                       |
| ---------- | ----------------------------------------------- | ------------------------------------------------------ |
| EMCD       | `EMCD_API_KEY`, `EMCD_API_SECRET`               | `emcd.pool.accounts`: subaccount IDs, empty for master |
| SpiderPool | `SPIDERPOOL_ACCESS_KEY`, `SPIDERPOOL_PRIVATE_KEY` | `spiderpool.pool.accounts`: subaccount names         |
| Foundry    | `FOUNDRY_API_KEY`                               | `foundry.pool.accounts`: sub-account names, required   |

To switch one pool to the live API, set its variables in the shell you run `npm start` from, then in `config/site.deploy.json`
remove that pool's `pool.apiUrl` so the Worker uses its package default, set `pool.accounts`, and remove its `mocks-emcd`,
`mocks-spiderpool`, or `mocks-foundry` entry from `pm2.roles`. Run `npm run stop:pm2` and `npm start` to apply it. The
[pool config reference][mvp-site-pool-config] covers every setting.

</Step>

<Step>

### Ask a coding agent about the fleet

The `mcp` process started in step 2 serves the site as tools on `:3101`. It is the same standalone server that `mdk run mcp`
starts for a project scaffolded with the CLI; here the example launches it as a PM2 process.

Connect your coding agent to the server. [`.mcp.json.example`](../../examples/mvp-site/.mcp.json.example) holds the entry. For an
agent that reads a project-level `.mcp.json` (such as Claude Code), copy it and start the agent from the example directory:

```bash
cd examples/mvp-site
cp .mcp.json.example .mcp.json
claude
```

Accept the `mdk-site-agent-tools` server if prompted, then confirm it shows as connected.

For any other MCP client, add `http://127.0.0.1:3101/mcp` as an HTTP server in its MCP settings.

Ask these three questions in order:

| Prompt | Tool the agent calls | What comes back |
| --- | --- | --- |
| `How is the site doing right now?` | `summarize_site` | 8 Workers and 15 devices (10 miners, 4 pools, 1 powermeter), all online |
| `Which three miners are running the hottest?` | `rank_devices` | `AM-001`, `AM-002`, and `AM-003` at 97 °C |
| `What power mode is WM-001 in, and how hot is it?` | `get_device` | `normal` mode, 92.9 °C |

The wording and figures may vary slightly depending on your model and mock seeds, but your agent should call these tools and
report figures like those in the table. The mock miners of one model report the same readings, so ties in the ranking are expected.

> [!NOTE]
> The MCP server withholds write tools by default, so an agent can read the fleet but cannot change it: asking it to reboot a miner
> finds no tool to call. The example's `act_device` tool is declared but not served. See [tool exposure][mcp-tool-exposure] to
> enable writes, and the [conversational operator agent][agent-guides] for a human approval gate on them.

The server carries two tool sources:

- A hand-authored tool set with agent-contract metadata ([`backend/mcp-plugins/site/mcp-plugin.json`](../../examples/mvp-site/backend/mcp-plugins/site/mcp-plugin.json)) giving an agent summary-first, closed-vocabulary tools (`summarize_site`, `count_devices`, `list_devices`,
  `get_device`, `rank_devices`) instead of raw route exports
- The site app's own `/site/*` routes, read off the same route table the Gateway forwards and converted into tools

Point an MCP client at that URL and it can query the fleet or, with the agent-contract tools, act on it with operator approval. This local site admits its own processes through the trusted-keys directory on this machine; a hardened Kernel restricts the MCP connection through [Kernel's caller allowlist][mcp-allowlist].

</Step>

<Step>

### Stop the site

```bash
npm run stop:pm2
```

This stops and removes every PM2-managed process for this site: mocks, Workers, Kernel, the site app, Gateway, and the MCP server.

> [!NOTE]
> The PM2 daemon itself (`pm2 list` still shows a `God Daemon` process) stays running in the background after this — that's expected,
> since PM2 manages processes across every project on the machine, not just this one. If it ever becomes unresponsive, see
> [stale PM2 processes][mvp-site-stale-pm2] for `pm2 kill`, which stops PM2 itself, not just this site.

</Step>

</Steps>

## What just happened

1. **Setup** installed [`backend/core`](../../backend/core/README.md), [`backend/workers`](../../backend/workers/README.md), the
   MDK UI devkit, and this example, then `setup:config` seeded its local config from the committed `*.example` files.
2. **Mock hardware**: PM2's `mocks`, `mocks-antminer`, `mocks-ocean`, `mocks-emcd`, `mocks-spiderpool`, `mocks-foundry`, and `mocks-satec` roles each
   started a mock server (Whatsminer and Antminer miners, the Ocean, EMCD, SpiderPool, and Foundry pool APIs, and a SATEC powermeter)
   speaking the real wire protocol, so the Worker drivers run their true connect, collect, and command paths against them.
3. **Kernel**: the `kernel` role started the orchestration layer in local-discovery mode, watching a shared directory for Workers to
   publish their RPC keys to.
4. **Workers**: the `worker`, `worker-antminer`, `worker-ocean`, `worker-emcd`, `worker-spiderpool`, `worker-foundry`, and `worker-satec` roles each
   dispatched to that family's boot function to construct a `WorkerRuntime` and publish its RPC key for the Kernel to discover. The
   miner and powermeter Workers seed their devices from `config/devices.json`. Each pool Worker is one logical device that polls its
   pool's API. The EMCD and SpiderPool Workers come from external git packages, booted by
   [`backend/pool-adapter.js`](../../examples/mvp-site/backend/pool-adapter.js).
5. **App and Gateway**: the `app-site` role ran the site app ([`backend/gateway-plugins/site`](../../examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json)) in its own app runtime, and the `gateway` role mounted that app's routes at `/` and the built UI from `ui/dist`, then opened the HTTP server on `:3000`, forwarding each `/site/*` request to the app. The app aggregates data across the
   six Workers through `mdkClient`.
6. **MCP**: the `mcp` role started the standalone MCP process on `:3101`, serving both tool sources — the hand-authored
   agent-contract tool set and the site app's own routes, derived from the same route table the Gateway forwards.

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
- Browse every runnable example in one place

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

[mvp-site-pool-config]: ../../examples/mvp-site/README.md#pool-config-emcd-spiderpool-and-foundry
<!-- docs@tether.io: mvp-site-pool-config → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#pool-config-emcd-spiderpool-and-foundry -->

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

[plugins]: ../guides/gateway/apps.md
<!-- docs@tether.io: plugins → guides/gateway/apps -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[build-a-dashboard]: build-a-dashboard.md
<!-- docs@tether.io: build-a-dashboard → tutorials/build-a-dashboard -->


[agent-guides]: ../guides/agent/index.md
<!-- docs@tether.io: agent-guides → guides/agent -->

[mcp-tool-exposure]: ../../backend/core/mcp/README.md#tool-exposure
<!-- docs@tether.io: mcp-tool-exposure → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md#tool-exposure -->

[network-requirements]: ../reference/environment.md#requirements
<!-- docs@tether.io: network-requirements → reference/environment#requirements -->
