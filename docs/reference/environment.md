---
title: Environment requirements
description: The Node.js, npm, Git and network baseline every MDK guide assumes, why npm stays below 12, and the environment variables MDK reads
docs@tether_slug: reference/environment
---

## Overview

Every guide and tutorial in this repo assumes the same baseline; this page explains the npm ceiling and lists the
[environment variables](#environment-variables) MDK packages read. The [core SDK README][mdk-readme] covers Worker admission in
depth, and the [hosted-site settings table][hosted-site] maps each setting a managed site touches to its spec field and boot option.

## Requirements

- [Node.js][node] >=24 (LTS)
- npm 11 (< 12)
- Git (latest stable version)
- Outbound UDP to the HyperDHT bootstrap nodes, the [public set on port `49737`][hosted-site-ports] by default or your own private
  list, because [HRPC runs over HyperDHT in every deployment shape, even on one host][hrpc-same-host]. A network that blocks this
  traffic [hangs before the Kernel key is printed][network-checks].

> [!IMPORTANT]
> Across hosts (the [DHT discovery shape][cross-host]), the backend hosts also need [hole-punched UDP][hyperdht] to each other, as the
> [hosted-site port table][hosted-site-ports] lays out.

Check the installed npm version with `npm --version`.

## Environment variables

Most of these matter when you run MDK processes yourself rather than through `mdk run`: the services
[`startServices()`][mdk-readme-services] generates for PM2 or Docker, the agent outside the CLI, or a UI built on the MDK packages.

### Service processes

`backend/core/mdk/worker.js` is the one entry point the generated PM2 and Docker configs run, once per service. `startServices()`
writes these variables into that config; set them yourself only when you start `worker.js` by hand.

| Variable | Read by | Default | Purpose |
| --- | --- | --- | --- |
| `SERVICE` | `worker.js` | Required | The service this process runs: `gateway`, `worker` or `dht-bootstrap` |
| `MDK_ENV` | `SERVICE=gateway` | `development` | Passed to the Gateway as `--env`: it prefers `config/<env>.<name>.json` over `config/<name>.json`, and reads the `<env>` section of a config file that has one |
| `PORT` | `SERVICE=gateway` | `3000` | Gateway HTTP port |
| `MDK_REPO_ROOT` | `SERVICE=worker` | Required | The MDK source checkout the Worker seeds its config from; `/app/repo` under Docker |
| `WORKER` | `SERVICE=worker` | Required | The Worker to boot: `miner-avalon`, `container-antspace`, `container-bitdeer`, `powermeter-abb`, `powermeter-satec`, `powermeter-schneider`, `sensor-seneca` or `minerpool-f2pool` |
| `TYPE` | `SERVICE=worker` | Required, except for `minerpool-f2pool` | The device model, one of that Worker's models |
| `RACK` | `SERVICE=worker` | Required | Rack name, the last part of the Worker id |
| `MDK_WORKER_ROOT` | `SERVICE=worker` | `data/<RACK>` under the working directory | State root; the Worker's store is `<root>/workers/<workerId>/store` |
| `MDK_WORKER_ALLOWED_KEYS` | `SERVICE=worker` | None | Comma-separated hex public keys the Worker admits, on top of the Kernel key in the default trusted-keys directory |
| `MDK_WORKER_ALLOW_ALL` | `SERVICE=worker` | Unset | `1` or `true` admits every peer with no policy check; for throwaway local experiments only |
| `MDK_DHT_BOOTSTRAP` | `SERVICE=gateway`, `SERVICE=worker` | The public HyperDHT bootstrap set | Comma-separated `host:port` list of [private bootstrap][private-dht] nodes |
| `MDK_DHT_HOST` | Every service | Every interface; `127.0.0.1` for `SERVICE=dht-bootstrap` | IP address the process's DHT nodes bind; for `dht-bootstrap`, also the address it advertises |
| `MDK_DHT_PORT` | `SERVICE=dht-bootstrap` | `49737` | UDP port of the private bootstrap |
| `MDK_DHT_NODES` | `SERVICE=dht-bootstrap` | `2` | Persistent DHT nodes started beside the bootstrap |

### Agent

| Variable | Read by | Default | Purpose |
| --- | --- | --- | --- |
| `MDK_AGENT_API_KEY` | `mdk-agent` | None | API key for a hosted model endpoint. `--provider openai` reads `OPENAI_API_KEY` before it; `--api-key` is the fallback. The default local `qvac` provider takes no key. See [talking to a hosted model][agent-hosted] |
| `MDK_EVAL_DIR` | `mdk-agent`, `eval/analyse.mjs` | The package's `eval/` directory | Where the eval ledger and run files are written and read |
| `MDK_NODE` | The agent's `run.sh` | `/usr/bin/node` | Node.js binary `run.sh` starts the agent with |

### UI

| Variable | Read by | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_MDK_API_URL` | `@tetherto/mdk-ui-foundation`, in a Vite build | `http://localhost:3000` | Gateway base URL when `MdkProvider` gets no `apiBaseUrl`. `apiBaseUrl=""` keeps every request same-origin and skips it |
| `MDK_API_URL` | `@tetherto/mdk-ui-foundation`, under Node | `http://localhost:3000` | The same, read after `VITE_MDK_API_URL` |

`VITE_API_BASE_URL` and `API_BASE_URL` are still read after both, with a deprecation warning.

### Variables in `mdk.yaml`

A string in `spec.workers[].env`, `spec.gateway.config` or `spec.apps[].config` can name a variable as `${NAME}`. The CLI replaces
it from its own environment first, then from the project's `.env`, and leaves the text as written when neither sets it.
`mdk onboard` keeps a plugin's secret answers out of `mdk.yaml` this way: it writes each to `.env` as `MDK_<PLUGIN>_<KEY>`, such as
`MDK_AUTH_GOOGLE_CLIENTSECRET`, and puts the `${...}` reference in `mdk.yaml`.

### Set by the CLI

The CLI passes these to its own child processes. You don't set them.

| Variable | Set for |
| --- | --- |
| `MDK_DASHBOARD_APPS` | The dashboard dev server `mdk run dashboard` starts: a JSON array of the installed apps whose UIs it loads |
| `MDK_APP_RUNTIME_OPTIONS` | Each app's runtime process: the app's resolved options, config included, as JSON |
| `MDK_UI_ENTRY`, `MDK_UI_ID`, `MDK_UI_IMPORTS` | The child process that checks an app's UI module against its contract |

### Examples and tooling

| Variable | Read by | Default | Purpose |
| --- | --- | --- | --- |
| `MDK_UI_PORT` | `examples/mvp-site` UI dev server | `3040` | Port of the example's UI dev server |
| `MDK_WORKER_BASE` | The `mdk-worker` skill's `worker-smoke.mjs` | The Worker's `@tetherto/mdk-worker` dependency, then a monorepo checkout | `mdk-worker` package directory the smoke test loads from |

## Why npm stays below 12

npm 12 disables fetching git-based dependencies by default and fails with `EALLOWGIT`:

```text
npm error code EALLOWGIT
npm error Fetching packages of type "git" have been disabled
```

[`examples/mvp-site`][mvp-site] takes several third-party Workers as git dependencies, each pinned to a commit in a
vendor-controlled repository. Its [`package.json`][mvp-site-manifest] carries the current set.

On npm 12, `npm install` fails on the first of these before it reaches anything else. The ceiling lifts only once every
one of them resolves from the registry, so it is not a single pending fix.

If `npm --version` already reports 12 or higher, repin with:

```bash
npm install -g npm@11
```

## Links

[node]: https://nodejs.org/
<!-- docs@tether.io: external link — preserve URL -->

[mvp-site]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: no parity link -->

[mvp-site-manifest]: ../../examples/mvp-site/package.json
<!-- docs@tether.io: mvp-site-manifest → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/package.json -->

[mdk-readme]: ../../backend/core/mdk/README.md#trust-and-admission
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#trust-and-admission -->

[mdk-readme-services]: ../../backend/core/mdk/README.md#device-data-and-caller-input
<!-- docs@tether.io: mdk-readme-services → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#device-data-and-caller-input -->

[private-dht]: ../guides/deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->

[agent-hosted]: ../../backend/core/agent/README.md#talking-to-a-hosted-model
<!-- docs@tether.io: agent-hosted → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md#talking-to-a-hosted-model -->

[hosted-site]: ../guides/deployment/hosted-site.md#gateway-and-kernel-settings
<!-- docs@tether.io: hosted-site → guides/deployment/hosted-site#gateway-and-kernel-settings -->

[hosted-site-ports]: ../guides/deployment/hosted-site.md#networks-and-ports
<!-- docs@tether.io: hosted-site-ports → guides/deployment/hosted-site#networks-and-ports -->

[hrpc-same-host]: glossary.md#hrpc-on-the-same-host
<!-- docs@tether.io: hrpc-same-host → reference/glossary#hrpc-on-the-same-host -->

[hyperdht]: https://github.com/holepunchto/hyperdht
<!-- docs@tether.io: external link — preserve URL -->

[cross-host]: ../guides/deployment/run-all-workers-site.md
<!-- docs@tether.io: cross-host → guides/deployment/run-all-workers-site -->

[network-checks]: ../guides/miners/troubleshooting.md#example-does-not-print-a-kernel-key
<!-- docs@tether.io: network-checks → guides/miners/troubleshooting#example-does-not-print-a-kernel-key -->
