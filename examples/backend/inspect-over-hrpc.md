# Inspect MDK over HRPC with `hp-rpc-cli`

## Overview

Several backend examples print the Kernel's HRPC public key, a device ID, and a ready-to-paste `hp-rpc-cli` command.
Run the command in a second terminal to query the example while it is running. Every request targets the MDK Protocol's
single `mdk` method; the envelope's `action` selects the operation.

## List workers

Replace `<KERNEL_HRPC_KEY>` with the key printed by the example:

```bash
hp-rpc-cli -s <KERNEL_HRPC_KEY> -m mdk -d '{"id":"1","version":"0.1.0","type":"request","action":"worker.list","sender":"cli","timestamp":1700000000000,"payload":{}}'
```

## Pull telemetry

Replace both placeholders with values printed by the example:

```bash
hp-rpc-cli -s <KERNEL_HRPC_KEY> -m mdk -d '{"id":"2","version":"0.1.0","type":"request","action":"telemetry.pull","sender":"cli","deviceId":"<DEVICE_ID>","timestamp":1700000000000,"payload":{"query":{"type":"metrics"}}}'
```

The response shape depends on the Worker and device model. Its `mdk-contract.json` defines the available telemetry fields.

## Other actions

The same envelope format supports `device.capabilities`, `state.pull`, and `command.request`. Use the Worker's
`mdk-contract.json` for supported commands, parameters, and telemetry query types.

## Troubleshooting

If `hp-rpc-cli` is unavailable, install the Hyperswarm RPC CLI or use the printed key and envelope with
[`@tetherto/mdk-client`](../../backend/core/client/README.md).

## Next steps

- Understand HRPC terminology — [Hyperswarm RPC](../../docs/reference/glossary.md#hyperswarm-rpc)
- Review the programmatic API — [Client README](../../backend/core/client/README.md)
