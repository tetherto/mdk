---
title: Stack file
description: The minimal `mdk.yaml` the CLI loads, and which page teaches each block under `spec`
docs@tether_slug: reference/mdk-yaml
---

## Overview

`mdk.yaml` declares a stack: the Kernel, the Gateway, and the Workers, apps, and access policy that run with them. Every `mdk`
command that reads a project loads it from the project directory. This page shows a minimal file the CLI accepts and maps
each block under `spec` to the page that teaches it.

The file is what the `mdk` CLI both writes and reads. A stack started from code with `@tetherto/mdk-core` doesn't need it: the
[MVP site example][mvp-site-example] runs a full site under PM2 from its own config, and
[Start apps from code][apps-from-code] shows the calls.

## Minimal starting file

```yaml
apiVersion: mdk/v1
kind: Stack
metadata:
  name: my-site
spec:
  gateway:
    port: 3847
```

`metadata` is optional: `metadata.name` names the stack, and the CLI assigns a name when it is missing.

Write the starter policy, then start the stack:

```sh
mdk rbac init
mdk run
```

[`mdk rbac init`][cli-rbac] writes `spec.rbac`, and [`mdk run`][cli-run] refuses to boot until it has. The other CLI
commands write the rest: [`mdk onboard`][cli-onboard] writes a complete file, [`mdk create`][cli-create] and
[`mdk add`][cli-add] add Workers and apps, and [`mdk user add --admin`][cli-user] binds a user to the `admin` role in
`spec.rbac`. Edit the blocks the key map points to, and leave the fields the CLI writes for its own use as it wrote them.

## Keys under `spec`

| Key            | Purpose                                               | Taught by                                                      |
| -------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `spec.kernel`  | Kernel port; written by `mdk onboard`, has no effect  | None: no command uses it                                       |
| `spec.gateway` | Sets the Gateway port and Gateway settings            | [Gateway-wide settings][hosted-site-settings]                  |
| `spec.mcp`     | Configures the MCP server                             | [MCP server settings for `mdk run mcp`][cli-run]               |
| `spec.workers` | Declares the Workers the stack runs                   | [Declaring a Worker][declare-worker]                           |
| `spec.apps`    | Registers and mounts apps                             | [Declaring and mounting an app][declare-app]                   |
| `spec.rbac`    | Controls access: roles and who holds them             | [Writing the access policy][security-policy]                   |
| `spec.network` | Configures a private DHT (`spec.network.dht`)         | [Running on a private DHT][private-dht]                        |

## Next steps

- [Run your Worker with the CLI][run-your-worker]: build a stack's `mdk.yaml` one command at a time and run it
- [Look up a CLI command][cli-reference]: every command that reads or writes `mdk.yaml`, with its flags
- [Resolve variables in `mdk.yaml`][env-vars]: keep secrets out of the file with `${VAR}` placeholders

## Links

[cli-onboard]: tooling/cli.md#mdk-onboard
<!-- docs@tether.io: cli-onboard → reference/tooling/cli#mdk-onboard -->

[cli-create]: tooling/cli.md#build
<!-- docs@tether.io: cli-create → reference/tooling/cli#build -->

[cli-add]: tooling/cli.md#mdk-add-app-source-and-mdk-add-worker-source
<!-- docs@tether.io: cli-add → reference/tooling/cli#mdk-add-app-source-and-mdk-add-worker-source -->

[cli-rbac]: tooling/cli.md#mdk-rbac
<!-- docs@tether.io: cli-rbac → reference/tooling/cli#mdk-rbac -->

[cli-user]: tooling/cli.md#mdk-user
<!-- docs@tether.io: cli-user → reference/tooling/cli#mdk-user -->

[cli-run]: tooling/cli.md#mdk-run-target-name
<!-- docs@tether.io: cli-run → reference/tooling/cli#mdk-run-target-name -->

[cli-reference]: tooling/cli.md
<!-- docs@tether.io: cli-reference → reference/tooling/cli -->

[hosted-site-settings]: ../guides/deployment/hosted-site.md#gateway-and-kernel-settings
<!-- docs@tether.io: hosted-site-settings → guides/deployment/hosted-site#gateway-and-kernel-settings -->

[declare-worker]: ../guides/cli/run-your-worker.md#declare-your-worker
<!-- docs@tether.io: declare-worker → guides/cli/run-your-worker#declare-your-worker -->

[declare-app]: ../guides/gateway/apps.md#declare-and-mount-it
<!-- docs@tether.io: declare-app → guides/gateway/apps#declare-and-mount-it -->

[security-policy]: ../guides/security/index.md#step-4-write-the-policy-and-put-identity-in-the-gateway
<!-- docs@tether.io: security-policy → guides/security#step-4-write-the-policy-and-put-identity-in-the-gateway -->

[private-dht]: ../guides/deployment/private-dht.md#b-mdk-run
<!-- docs@tether.io: private-dht → guides/deployment/private-dht#b-mdk-run -->

[mvp-site-example]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site-example → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md -->

[apps-from-code]: ../guides/gateway/apps.md#start-apps-from-code
<!-- docs@tether.io: apps-from-code → guides/gateway/apps#start-apps-from-code -->

[run-your-worker]: ../guides/cli/run-your-worker.md
<!-- docs@tether.io: run-your-worker → guides/cli/run-your-worker -->

[env-vars]: environment.md#variables-in-mdkyaml
<!-- docs@tether.io: env-vars → reference/environment#variables-in-mdkyaml -->
