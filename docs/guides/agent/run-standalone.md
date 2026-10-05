---
title: Run the agent as a standalone CLI
description: Serve a model, boot the demo fleet, and talk to the operator agent from the terminal
docs@tether_slug: guides/agent/run-standalone
---

## Overview

[`@tetherto/mdk-agent`][agent-core-readme] runs as a small library and CLI for local development or evaluation,
talking to a served model and an MCP tool server directly, with no Gateway in front of it.

This is one of [two ways to run the agent][agent-guides-index].

## Prerequisites

- Node.js ≥ 24
- npm 11 [(< 12)][npm-version]
- GPU — see [the agent's prerequisites][agent-prereqs] for the exact backend requirements
- Dependencies installed — see [the agent's prerequisites][agent-prereqs]: a single root `npm install`, not one run inside the package
- Language model: this guide uses [QVAC](https://qvac.tether.io/) serving an OpenAI-compatible API

<Steps>

<Step>

### Serve the model with QVAC

The agent needs a language model listening locally. Already have a QVAC server running elsewhere?
Skip this step, then add `--base-url <its-url>` when you [start the agent](#start-the-agent-and-ask).

#### 1.1 Note the agent package's path

```bash
cd backend/core/agent    # From the repo root (dependencies come from the root npm install)
pwd                      # Note this: the serve command below needs it after it cd's elsewhere
```

#### 1.2 Serve the model

QVAC installs into a separate directory, so a fresh terminal, started from wherever you like:

```bash
mkdir -p ~/qvac-runtime && cd ~/qvac-runtime && npm init -y   # once
npm i @qvac/cli@^0.12.0                                       # ~6 GB of prebuilt engines
./node_modules/.bin/qvac doctor                               # confirms this host can serve
# --config pins the model: Qwen3-4B, 4-bit quantized, 16k context
./node_modules/.bin/qvac serve openai \
  --config <path-noted-in-1.1>/qvac-runtime/qvac.config.json \
  --port 11500 --verbose --no-cancel-load-on-disconnect      # --verbose: load + GPU offload; wait until listening on 11500
```

<details>
<summary>Why install @qvac/cli outside this package?</summary>

`@qvac/cli` is an optional peer dependency because the agent only needs it to *serve* a model, not
to talk to one. Installing its ~6 GB into this tree perturbs a `package-lock.json` that CI
gates on. External mode never loads `@qvac/cli` at all, so a separate directory costs nothing and
keeps the lockfile clean.

</details>

> [!IMPORTANT]
> The port and flag above aren't arbitrary: `11500` avoids Ollama's default `11434` (whichever
> starts second on a machine with both dies on `EADDRINUSE`), and `--no-cancel-load-on-disconnect`
> stops a lazily loaded model's first request from failing with a `503` that isn't really about a
> disconnect.

If this doesn't work first try, see [troubleshooting](#troubleshooting).

</Step>

<Step>

### Optional: Start the demo fleet

If you already have an MCP tool server, skip this and point the agent at its URL in the [next step](#start-the-agent-and-ask).

To try it end-to-end, boot the full-site example. It brings up a simulated fleet (miners,
containers, powermeters, sensors, pools) and exposes the MDK tools over MCP on port `3008`:

```bash
cd ../../../examples/full-site
npm run setup  # first time only. NOT npm install: examples/full-site is a root workspace member,
               # and this also builds the UI toolkit and installs its own nested ui/ app
npm start      # kernel + workers + gateway + MCP server on :3008
```

Leave it running.

</Step>

<Step>

### Start the agent and ask

In a third terminal, start the CLI — pointing it at the model (per the previous step) and the MCP tool
server:

```bash
node bin/mdk-agent.js --model qwen3-4b --mcp-url http://127.0.0.1:3008/mcp
```

You may now query the site in plain language, for example:

```text
you › how many miners are on the site?
  → tool   count_devices({"family":"miner","state":"all"})
  ← data   { "summary": "30 miners.", "count": 30 }
  ▌ There are 30 miners on the site.

you › list the devices that are not ready
you › reboot antminer-3          ← a write: the agent stops and asks you to approve
```

REPL commands: `/about` (what this is) · `/tools` · `/info` · `/new` · `/exit`.

</Step>

</Steps>

## Troubleshooting

### `npx qvac` fails with a 404

There is no `qvac` package on npm; the binary comes from `@qvac/cli`, installed in
[Serve the model](#serve-the-model-with-qvac).

### `qvac serve openai` dies with `EADDRINUSE`

`qvac serve openai` defaults to port `11434`, the same as Ollama's. Pass `--port 11500` (as the
command above does) if both run on this machine.

### The first request 503s with `model_load_failed`, blaming a disconnect that didn't happen

`serve.load.cancelOnDisconnect` defaults to `true`, which cancels a lazily loaded model's first
request. `--no-cancel-load-on-disconnect` fixes it. Models declared `preload: true` (like
`qwen3-4b` in `qvac-runtime/qvac.config.json`) never hit this, but the flag costs nothing.

### The first run looks stalled, or the server "never starts"

The first run fetches ~2.5 GB peer-to-peer. The log says `registry://s3/…`, but the transfer is
actually Hyperswarm (a DHT plus UDP hole-punching), at roughly ~110 MB/min, so ~25 minutes. There's
no HTTP fallback, so a network that blocks UDP stalls it, and since `preload: true` means the port
doesn't open until the model is resident, a stalled download presents as a dead server, not a
failed fetch. Three things help:

1. Copy `qvac.config.json` and set `preload: false`. The port opens in ~5 s and a stalled fetch
   surfaces as a `503` on the first request instead of a server that looks dead. Switch back once
   `~/.qvac/models` holds the weights.
2. Always pass `--verbose`; without it there's no progress output at all.
3. Bypass the registry entirely: `serve.models` accepts an explicit `{ "src", "type" }` entry, and
   `*ModelSrc` fields accept URLs and filesystem paths, so a GGUF fetched by hand over HTTPS, or
   copied from a machine that already has one, works. This is the path for a locked-down site.

### Disk usage is larger than expected

Budget ~6 GB for the CLI, 2.5 GB for the model, and a KV cache that grows. Of that 6 GB, ~5 GB is
prebuilt binaries for platforms this host can't run (every modality engine is pulled whether used
or not). Deleting the foreign `prebuilds/` directories takes the install to ~400 MB and is safe,
verified by cold restart, but `npm i` restores them, so it's disk relief rather than a fix.

### The fleet has fewer devices than expected

Each Worker seeds its device list once, into a persistent on-disk store, and only when that store
is empty. A later `npm start` reuses whatever's already there rather than reseeding to the current
`--miners` count, so a fleet from an earlier run (a different `--miners` value, or an interrupted
seed) sticks around. Clear `examples/full-site/.mdk-data/workers/*/store` for a fresh fleet on the next start.

## Next steps

- [Look up a flag, the capability table, or a hosted-model setup][agent-core-readme]: the CLI's full reference
- [Score a battery run against a fleet and compare models][measuring]
- [Deploy the agent behind the Gateway instead][gateway-deployment], for a chat API an operator UI can call

## Links

[npm-version]: ../../reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->

[agent-core-readme]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-core-readme → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[agent-prereqs]: ../../../backend/core/agent/README.md#prerequisites
<!-- docs@tether.io: agent-prereqs → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md#prerequisites -->

[agent-guides-index]: index.md
<!-- docs@tether.io: agent-guides-index → guides/agent -->

[measuring]: ../../../backend/core/agent/docs/EVALUATION.md
<!-- docs@tether.io: measuring → https://github.com/tetherto/mdk/blob/main/backend/core/agent/docs/EVALUATION.md -->

[gateway-deployment]: gateway-deployment.md
<!-- docs@tether.io: gateway-deployment → guides/agent/gateway-deployment -->
