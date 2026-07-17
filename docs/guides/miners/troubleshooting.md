---
title: Troubleshoot miner examples
description: Diagnose and clean up MDK miner mock examples for Antminer, Whatsminer, and Avalon.
docs@tether_slug: guides/miners/troubleshooting
---

## Overview

This page covers the mock/development examples used by the Antminer, Whatsminer, and Avalon miner guides. The examples start a bundled mock miner, start an Kernel, register one device, print the identifiers you need, and keep running until you stop them.

## Expected output

A working example prints an Kernel key and a registered device ID:

```text
Kernel HRPC key: <hex key>
Device: <device id>

Ctrl+C to stop.
```

If you do not see both `Kernel HRPC key:` and `Device:`, use the following checks.

## Find the right port

Mock examples and real miners use different sources for ports.

### Mock examples

Each runnable example starts a mock miner on the port declared in that example file. To find the mock port for your model:

1. Open the Worker's `USAGE.md` and choose the runnable example for your model:
   - Antminer: [USAGE.md][antminer-runnable-examples]
   - Whatsminer: [USAGE.md][whatsminer-runnable-examples]
   - Avalon: [USAGE.md][avalon-runnable-example]
2. Open the matching `examples/run-*.js` file.
3. Look for the `createServer({ port: ... })` call.

The cross-worker manifest also records the expected mock type and default port for each variant: [workers manifest][workers-manifest].

### Real miners

Real devices use their native APIs:

- Antminer: HTTP, usually port `80`, with digest-auth credentials.
- Whatsminer: encrypted TCP, usually port `14028`, with the API password.
- Avalon: CGMiner TCP API, usually port `4028`, with no username or password.

Before registering a real miner, confirm the miner is reachable from the machine or container running the Worker.

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

Check:

- The machine has outbound network access.
- Local security tooling, containers, or sandboxes are not blocking UDP/network-interface access.
- You are running the command from the repository root.
- Dependencies have been installed for `backend/core` and `backend/workers`.

## File lock or key file errors

The examples call `getKernel()` with default local paths. By default, the topic file is `os.tmpdir()/mdk/.dht-topic` and the kernel key file is `os.tmpdir()/mdk/.kernel-key`. If another Kernel, gateway, or example is already running with the same defaults, you may see file lock errors, or clients may pick up the wrong Kernel key from the shared key file.

Stop stale example processes before starting another example. If you need to run several examples side by side for development, run each process with a different temporary directory so each Kernel gets separate local state:

```bash
TMPDIR=/tmp/mdk-antminer-s21 node backend/workers/miners/antminer/examples/run-s21.js
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

[antminer-runnable-examples]: ../../../backend/workers/miners/antminer/USAGE.md#runnable-examples
<!-- docs@tether.io: antminer-runnable-examples → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/USAGE.md#runnable-examples -->

[whatsminer-runnable-examples]: ../../../backend/workers/miners/whatsminer/USAGE.md#runnable-examples
<!-- docs@tether.io: whatsminer-runnable-examples → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/USAGE.md#runnable-examples -->

[avalon-runnable-example]: ../../../backend/workers/miners/avalon/USAGE.md#runnable-example
<!-- docs@tether.io: avalon-runnable-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md#runnable-example -->

[workers-manifest]: ../../../backend/workers/docs/workers-manifest.yaml
<!-- docs@tether.io: workers-manifest → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/workers-manifest.yaml -->
