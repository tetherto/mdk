---
title: Run a mining site end to end
description: "[⏱️ ~3 min] From git clone to a live site with eight Workers, mock hardware, a browser dashboard, and an AI agent answering questions about the fleet"
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
- A React dashboard on `:3000` with Dashboard, Containers, Miners, Power & Sensors, Pools, Control, and Activity pages
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
```

`setup` first copies the committed `*.json.example` config files into place without overwriting any that already exist
(the same step `npm run setup:config` runs on its own), then installs [`backend/core`][backend-core],
[`backend/workers`](../../backend/workers/README.md), the UI workspace devkit packages, and this example's own dependencies.

> [!NOTE]
> The script walks several workspaces; first run takes 1-2 minutes.

</Step>

<Step>

### Start the site

```bash
npm start
```

[`start.js`][mvp-site-start] generates `deploy/ecosystem.config.js` from [`config/site.deploy.json`][mvp-site-deploy-config], starts the PM2 apps, then exits — PM2 itself keeps the processes running in the background.

```bash
pm2 list      # dht-bootstrap, mocks, mocks-antminer, mocks-sealminer, mocks-ocean, mocks-satec, mocks-emcd, mocks-spiderpool, mocks-foundry, kernel, worker, worker-antminer, worker-sealminer, worker-ocean, worker-satec, worker-emcd, worker-spiderpool, worker-foundry, app-site, gateway, mcp
```

> [!WARNING]
> PM2 identifies processes by role name and shares one daemon across every project on the machine. Starting this site while another
> site that uses the same roles (`mocks`, `kernel`, `gateway`, `mcp`) is running restarts that site's processes instead of starting
> new ones, and stopping either site removes both. Stop the other site first, with `npm run stop:pm2` from its directory.

Wait for every app to show `online`, then open `http://localhost:3000/` in a browser and sign in as one of the example's
[demo users][mvp-site-users]. The dashboard shows live hashrate, power, and
per-device status.

> [!IMPORTANT]
> PM2 showing every app `online` means the processes started, not that the site has fully settled. The pool Workers tick their
> mock fetch/save cycle every 10 seconds, SpiderPool spaces its API requests one second apart, and Kernel's local-discovery scan
> runs every 4 seconds, so `/site/overview` can report fewer than 4 pools for 15-20 seconds after `pm2 list` goes green. Retry the
> command below if the first response comes back short.

> [!WARNING]
> The Gateway listens on every network interface (`gateway.host` is `0.0.0.0` in `config/site.deploy.json`), and
> `mdk-site-demo` is a published password shared by every demo user, `admin` included. Anyone who can reach port `3000` can
> sign in as `admin`, and passwords cross plain HTTP in the clear. Keep this site on a trusted network: set `gateway.host` to
> `127.0.0.1` before `npm start`, or remove the shared `rbac.password` so each user gets a random one. The
> [site security blueprint][security] covers hardening a site you expose.

Verify via the API. App routes need a signed-in user, so sign in first and send the access token. `viewer` is the
read-only [demo user][mvp-site-users]; any of the others works too.

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"viewer","password":"mdk-site-demo"}' | jq -er .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/site/overview | jq '{miners: (.miners|length), pools: (.pools|length), powermeters: (.powermeters|length)}'
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
> [`config/devices.json`][mvp-site-devices-config] seeds five Whatsminer miners, three Antminer miners,
> two SealMiner miners, and one powermeter by default. Add or remove entries there to resize the fleet; [configuring devices][mvp-site-devices] describes
> the format. The four pools aren't seeded devices: each pool Worker reports one account from its section of
> [`config/site.deploy.json`][mvp-site-deploy-config].

Once the Kernel marks a Worker `DEAD` or `TERMINATED`, its miners are missing from `miners` and the overview lists it in
`unavailableWorkers` with that state, for example `{ "workerId": "whatsminer-worker", "reason": "DEAD" }`, so an outage
doesn't read as an empty site. Each of its devices you may read is listed in `unavailableDevices` with
`status: "offline"` and `stale: true`, and `totals.unavailableDeviceCount` counts them. Before that, while the Kernel
only reports the Worker `SICK`, its miners can drop out of `miners` without an `unavailableWorkers` entry. A command
the Kernel refuses, such as one for a device that doesn't exist, answers `404` for an unknown device or Worker and `422`
otherwise, with the Kernel's error code in the body.

</Step>

<Step>

### (Optional) Explore the UI pages

The Dashboard, Containers, Miners, Power & Sensors, Pools, Control, and Activity pages are all served from `ui/dist` via the
Gateway on the same `:3000` port. The Pools page lists the Ocean, EMCD, SpiderPool, and Foundry accounts side by side; the
Power & Sensors page charts the SATEC meter's power series over time. [UI pages][mvp-site-ui] describes what each one shows.

</Step>

<Step>

### (Optional) Report a real EMCD, SpiderPool, or Foundry account

The EMCD, SpiderPool, and Foundry Workers read their API credentials from the environment, never from `config/site.deploy.json`.
With the variables unset, each Worker logs a warning and authenticates with its package's public mock credentials, which only the
bundled mock accepts.

| Pool       | Environment variables                             | Accounts setting                                       |
| ---------- | ------------------------------------------------- | ------------------------------------------------------ |
| EMCD       | `EMCD_API_KEY`, `EMCD_API_SECRET`                 | `emcd.pool.accounts`: subaccount IDs, empty for master |
| SpiderPool | `SPIDERPOOL_ACCESS_KEY`, `SPIDERPOOL_PRIVATE_KEY` | `spiderpool.pool.accounts`: subaccount names           |
| Foundry    | `FOUNDRY_API_KEY`                                 | `foundry.pool.accounts`: sub-account names, required   |

To switch one pool to the live API, set its variables in the shell you run `npm start` from, then in `config/site.deploy.json`
remove that pool's `pool.apiUrl` so the Worker uses its package default, set `pool.accounts`, and remove its `mocks-emcd`,
`mocks-spiderpool`, or `mocks-foundry` entry from `pm2.roles`. Run `npm run stop:pm2` and `npm start` to apply it. The
[pool config reference][mvp-site-pool-config] covers every setting.

</Step>

<Step>

### Ask a coding agent about the fleet

The `mcp` process started in step 2 serves the site as tools on `:3101`. It is the same standalone server that `mdk run mcp`
starts for a project scaffolded with the CLI; here the example launches it as a PM2 process.

Connect your coding agent to the server. [`.mcp.json.example`][mvp-site-mcp-json] holds the entry. For an
agent that reads a project-level `.mcp.json` (such as Claude Code), copy it and start the agent from the example directory:

```bash
cd examples/mvp-site
cp .mcp.json.example .mcp.json
claude
```

Accept the `mdk-site-agent-tools` server if prompted, then confirm it shows as connected.

For any other MCP client, add `http://127.0.0.1:3101/mcp` as an HTTP server in its MCP settings.

Ask these three questions in order:

| Prompt                                             | Tool the agent calls | What comes back                                                         |
| -------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| `How is the site doing right now?`                 | `summarize_site`     | 8 Workers and 15 devices (10 miners, 4 pools, 1 powermeter), all online |
| `Which three miners are running the hottest?`      | `rank_devices`       | `AM-001`, `AM-002`, and `AM-003` at 97 °C                               |
| `What power mode is WM-001 in, and how hot is it?` | `get_device`         | `normal` mode, 92.9 °C                                                  |

The wording and figures may vary slightly depending on your model and mock seeds, but your agent should call these tools and
report figures like those in the table. The mock miners of one model report the same readings, so ties in the ranking are expected.

> [!NOTE]
> The MCP server withholds write tools by default, so an agent can read the fleet but cannot change it: asking it to reboot a miner
> finds no tool to call. The example's `act_device` tool is declared but not served. See [tool exposure][mcp-tool-exposure] to
> enable writes, and the [conversational operator agent][agent-guides] for a human approval gate on them.

The server carries two tool sources:

- A hand-authored tool set with agent-contract metadata ([`backend/mcp-plugins/site/mcp-plugin.json`][mvp-site-mcp-plugin]) giving an agent summary-first, closed-vocabulary tools (`summarize_site`, `count_devices`, `list_devices`,
  `get_device`, `rank_devices`) instead of raw route exports
- The site app's own `/site/*` routes, read off the same route table the Gateway forwards and converted into tools

Point an MCP client at that URL and it can query the fleet. The MCP server itself has no approval step: once write tools are
enabled, a call runs as soon as the client sends it, and only the [operator agent][agent-guides] adds a human approval. This
local site admits its own processes through the trusted-keys directory on this machine; a hardened Kernel restricts the MCP
connection through [Kernel's caller allowlist][mcp-allowlist].

</Step>

<Step>

### Stop the site

```bash
npm run stop:pm2
```

This stops and removes every PM2-managed process for this site: the private DHT bootstrap, mocks, Workers, Kernel, the site app, Gateway, and the MCP server.

> [!NOTE]
> The PM2 daemon itself stays running in the background after this (`pm2 list` is empty, but `pm2 ping` still answers). That's expected,
> since PM2 manages processes across every project on the machine, not just this one. If it ever becomes unresponsive, see
> [stale PM2 processes][mvp-site-stale-pm2] for `pm2 kill`, which stops PM2 itself, not just this site.

</Step>

</Steps>

## What just happened

1. **Setup** seeded the local config from the committed `*.example` files, then installed [`backend/core`][backend-core],
   [`backend/workers`](../../backend/workers/README.md), the MDK UI devkit, and this example.
2. **Mock hardware**: PM2's `mocks`, `mocks-antminer`, `mocks-sealminer`, `mocks-ocean`, `mocks-emcd`, `mocks-spiderpool`,
   `mocks-foundry`, and `mocks-satec` roles each started a mock server (Whatsminer, Antminer, and SealMiner miners, the Ocean,
   EMCD, SpiderPool, and Foundry pool APIs, and a SATEC powermeter) speaking the real wire protocol, so the Worker drivers run
   their true connect, collect, and command paths against them.
3. **Kernel**: the `kernel` role started the orchestration layer in local-discovery mode, watching a shared directory for Workers to
   publish their RPC keys to.
4. **Workers**: the eight Worker roles each started one Worker and published its RPC key for the Kernel to discover:
   - `worker`, `worker-antminer`, and `worker-sealminer` host the Whatsminer, Antminer, and SealMiner plugins, which come from
     external git packages, through this example's own adapters. Each builds its device list from `config/devices.json`.
   - `worker-ocean` hosts the external Ocean plugin through its adapter, and `worker-emcd`, `worker-spiderpool`, and
     `worker-foundry` host the external EMCD, SpiderPool, and Foundry plugins through
     [`backend/pool-adapter.js`][mvp-site-pool-adapter]. Each pool Worker is one logical device that polls its pool's API.
   - `worker-satec` boots the in-repo SATEC powermeter Worker, which seeds its device from `config/devices.json` into its own store.
5. **App and Gateway**: the `app-site` role ran the site app ([`backend/gateway-plugins/site`][mvp-site-gateway-plugin]) in its own app runtime, and the `gateway` role mounted that app's routes at `/` and the built UI from `ui/dist`, then opened the HTTP server on `:3000`, forwarding each `/site/*` request to the app. The app aggregates data across the
   eight Workers through `mdkClient`.
6. **MCP**: the `mcp` role started the standalone MCP process on `:3101`, serving both tool sources — the hand-authored
   agent-contract tool set and the site app's own routes, derived from the same route table the Gateway forwards.

## Resetting state

State (Kernel key, Worker seeds, device registry) persists in `.site-data/`. What a change to `config/devices.json` needs
depends on the Worker:

- Miners (Whatsminer, Antminer, SealMiner): restart the site. Their adapters rebuild the device list from the file on every start.
- The SATEC powermeter: [reset the state][mvp-site-reset] before restarting. Its Worker registers seed devices only once, on an
  empty store.

## Next steps

- Fix a failed boot, a port clash, or stale PM2 processes with the example's [troubleshooting section][mvp-site-troubleshooting]
- Register real hardware instead of mocks by [configuring devices][mvp-site-devices]
- Build the same shape from an empty directory with one Worker and one route: [build a minimal single-page dashboard][build-a-dashboard]
- Serve your own data by [adding custom plugins to the Gateway HTTP API][apps]
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
<!-- docs@tether.io: mvp-site-troubleshooting → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#troubleshooting -->

[mcp-allowlist]: ../guides/security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->

[all-workers]: ../guides/deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers → guides/deployment/run-all-workers-site -->

[apps]: ../guides/gateway/apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

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

[mvp-site-users]: ../../examples/mvp-site/README.md#users-and-permissions
<!-- docs@tether.io: mvp-site-users → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md#users-and-permissions -->

[backend-core]: ../../backend/core/README.md
<!-- docs@tether.io: backend-core → https://github.com/tetherto/mdk/blob/main/backend/core/README.md -->

[mvp-site-start]: ../../examples/mvp-site/start.js
<!-- docs@tether.io: mvp-site-start → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/start.js -->

[security]: ../guides/security/index.md
<!-- docs@tether.io: security → guides/security -->

[mvp-site-deploy-config]: ../../examples/mvp-site/config/site.deploy.json.example
<!-- docs@tether.io: mvp-site-deploy-config → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/config/site.deploy.json.example -->

[mvp-site-devices-config]: ../../examples/mvp-site/config/devices.json.example
<!-- docs@tether.io: mvp-site-devices-config → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/config/devices.json.example -->

[mvp-site-mcp-json]: ../../examples/mvp-site/.mcp.json.example
<!-- docs@tether.io: mvp-site-mcp-json → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/.mcp.json.example -->

[mvp-site-mcp-plugin]: ../../examples/mvp-site/backend/mcp-plugins/site/mcp-plugin.json
<!-- docs@tether.io: mvp-site-mcp-plugin → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/mcp-plugins/site/mcp-plugin.json -->

[mvp-site-pool-adapter]: ../../examples/mvp-site/backend/pool-adapter.js
<!-- docs@tether.io: mvp-site-pool-adapter → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/pool-adapter.js -->

[mvp-site-gateway-plugin]: ../../examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json
<!-- docs@tether.io: mvp-site-gateway-plugin → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/gateway-plugins/site/mdk-plugin.json -->
