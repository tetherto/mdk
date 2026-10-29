---
title: Troubleshoot miner examples
description: Diagnose and clean up MDK miner mock examples for Antminer, Whatsminer, and Avalon.
docs@tether_slug: guides/miners/troubleshooting
---

## Overview

This page covers the mock/development examples used by the [Antminer][run-antminer], [Whatsminer][run-whatsminer], and [Avalon][run-avalon] miner guides. The examples start a bundled mock miner, start a Kernel, register one device, print the identifiers you need, and keep running until you stop them.

## Expected output

A working example prints a Kernel key and a registered device ID:

```text
Kernel HRPC key: <hex key>
Device: <device id>

Ctrl+C to stop.
```

If you do not see both `Kernel HRPC key:` and `Device:`, use the following checks.

## Find the right port

Mock examples and real miners use different sources for ports.

### Mock examples

An in-repo mock listens on the port you pass to `npm run mock`, and the Worker reaches it through the `port` in that
device's `seedDevices` entry. The two must match: the [Avalon mock run][avalon-runnable-example] uses `4028` for both.
Run `npm run mock` with no arguments to list every mock device and its types.

Antminer and Whatsminer follow a different shape — they're the external
[`antminer-mdk-worker`][antminer-mdk-worker] and [`whatsminer-mdk-worker`][whatsminer-mdk-worker] plugins, not
in-repo packages with a bundled mock. Their mock ports come from whatever deployment config seeds
them; `examples/mvp-site`'s `config/devices.json` (`antminers` and `miners`) and `config/site.deploy.json` are the
reference.

The cross-worker manifest also records the expected mock type and default port for each variant: [workers manifest][workers-manifest].

### Real miners

Real devices use their native APIs:

- Antminer: HTTP, usually port `80`, with digest-auth credentials.
- Whatsminer: encrypted TCP, port `4028` for API v2 (the default) or `4433` for API v3 (auto-detected from the
  port), with the API password.
- Avalon: CGMiner TCP API, usually port `4028`, with no username or password.

Before registering a real miner, confirm the miner is reachable from the machine or container running the Worker.

## Antminer or Whatsminer example installs an unexpected dependency

[`antminer-mdk-worker`][antminer-mdk-worker] and [`whatsminer-mdk-worker`][whatsminer-mdk-worker] are git dependencies, not versioned npm packages, and their `package.json` entries carry no pinned commit. Only the committed `package-lock.json` resolves it to a specific commit, so a plain `npm install` with a missing or discarded lockfile, or with a lockfile-regenerating command like `npm update`, can silently pull a different commit than the one already tested.

If `npm install` changes `package-lock.json` unexpectedly, or `git diff` shows the `antminer-mdk-worker` or `whatsminer-mdk-worker` entry's `resolved` commit changed, reinstall from the committed lockfile instead. `examples/mvp-site` is an npm workspace, not a standalone project — it has no lockfile of its own, so run this from the repository root:

```bash
npm ci
```

`npm ci` fails on a lockfile/`package.json` mismatch instead of drifting.

Separately, `npm ls crypto-js --prefix examples/mvp-site` or an `npm audit` run may show `crypto-js` resolving to `mdk-crypto-lib`, a local file dependency, rather than the real npm package. This is expected: `whatsminer-mdk-worker` still declares a dependency on the deprecated `crypto-js`, and MDK overrides it at install time with a drop-in replacement built on Node's own `node:crypto`. It is not a broken install.

## Clean up a mock port

If an example exits with `EADDRINUSE` or says a port is already in use, find the process using that port:

```bash
lsof -nP -iTCP:<port> -sTCP:LISTEN
```

Replace `<port>` with the mock port for your example. The output includes a process ID (`PID`). If the process is an old miner mock or example that you no longer need, stop it:

```bash
kill <pid>
```

Run `lsof` again to confirm the port is free before restarting the example.

## Example does not print a Kernel key

Same-process examples register Worker public keys directly and do not use DHT topic discovery. Runtime traffic still uses HRPC,
which relies on HyperDHT to establish encrypted peer connections. The machine therefore needs outbound UDP access to its configured
DHT bootstrap nodes even when Kernel and the Worker share a process or host.

If outbound access or network-interface inspection is blocked, startup may stop responding or fail before printing `Kernel HRPC key:`.
A machine with no outbound access runs the [local and air-gapped profile][private-dht] instead: a private bootstrap on `127.0.0.1`
that every component joins.

Check:

- The machine has outbound network access.
- Local security tooling, containers, or sandboxes are not blocking UDP/network-interface access.
- You are running the command from the repository root.
- Dependencies have been installed for [`backend/core`][backend-core] and [`backend/workers`](../../../backend/workers/README.md).

## Worker is HEALTHY but miners show no data

`READY` and `HEALTHY` describe the Worker process, not the miners behind it: Kernel's health ping is answered by the Worker from memory
and never reaches a device, so a Worker with every miner unplugged still reports both ([Worker health is not device liveness][worker-health]).

Check:

- Pull telemetry for one device and read its `status` and each channel's `{ error }`; an unreachable miner surfaces there, not in the Worker state.
- Confirm the miner is reachable from the Worker host on its native port ([real miners](#real-miners)).
- For a command, read `verification.state` from `command.status`; only `VERIFIED` proves the device reached the requested state.

## File lock or key file errors

The examples call `getKernel()` with default local paths. By default, the topic file is `~/.mdk/.dht-topic` and the kernel key file is `~/.mdk/.kernel-key`. If another Kernel, gateway, or example is already running with the same defaults, you may see file lock errors, or clients may pick up the wrong Kernel key from the shared key file.

Stop stale example processes before starting another example. If you need to run several examples side by side for development, run each process with a different home directory so each Kernel gets separate local state:

```bash
HOME=/tmp/mdk-avalon node avalon-dev.js
```

## Still blocked

When asking for help on [Discord](https://discord.com/invite/tetherdev) or [GitHub issues](https://github.com/tetherto/mdk/issues) collect:

- The exact example command
- The model and mock port
- The full `stdout` and `stderr`
- `node --version` and `npm --version`
- Any process currently listening on the mock port

## Links

[run-antminer]: run-antminer-worker.md
<!-- docs@tether.io: run-antminer → guides/miners/run-antminer-worker -->

[run-whatsminer]: run-whatsminer-worker.md
<!-- docs@tether.io: run-whatsminer → guides/miners/run-whatsminer-worker -->

[run-avalon]: run-avalon-worker.md
<!-- docs@tether.io: run-avalon → guides/miners/run-avalon-worker -->

[antminer-mdk-worker]: https://github.com/bitmain-official/antminer-mdk-worker
<!-- docs@tether.io: external link — preserve URL -->

[whatsminer-mdk-worker]: https://github.com/whatsminer/whatsminer-mdk-worker
<!-- docs@tether.io: external link — preserve URL -->

[backend-core]: ../../../backend/core/README.md
<!-- docs@tether.io: no parity link -->

[avalon-runnable-example]: ../../../backend/workers/miners/avalon/USAGE.md#run-against-a-mock
<!-- docs@tether.io: avalon-runnable-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md#run-against-a-mock -->

[workers-manifest]: ../../../backend/workers/docs/workers-manifest.yaml
<!-- docs@tether.io: workers-manifest → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/workers-manifest.yaml -->

[worker-health]: ../../concepts/control-plane.md#worker-health-is-not-device-liveness
<!-- docs@tether.io: worker-health → concepts/control-plane#worker-health-is-not-device-liveness -->

[private-dht]: ../deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->
