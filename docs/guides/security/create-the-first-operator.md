---
title: Create the first operator and sign in
description: "[⏱️ ~5 min] Create the first user with `mdk user add --admin` while the Kernel runs, then sign in at the dashboard, over HTTP, or with `mdk login`"
docs@tether_slug: guides/security/create-the-first-operator
lastReviewedAt: "0.13.1"
---

## TL;DR

- Users live in the Kernel's identity store, so the stack runs first: `mdk rbac init` once, then `mdk run`
- In a second terminal, `mdk user add <name> --admin` creates the operator, writes the `admin` role if it is missing, and binds the user to it
- Sign in at the dashboard, at `POST /auth/login` for a bearer token, or with `mdk login <name>` so the CLI acts as you

## Overview

`mdk rbac init` binds only service accounts: the CLI's own account and each app. It creates no user, so a fresh stack boots
with nobody able to sign in. The first person is created with `mdk user add <name> --admin`, and that one binding is what opens
the dashboard and every app route. This page creates that operator and shows the three ways to sign in as them. Every other
MDK path that needs a signed-in user, the tutorials, the agent guides and the hosted-site profiles, delegates this step here.

## Prerequisites

- The [`mdk` CLI installed][cli-install]
- A project with `mdk.yaml`, from `mdk onboard` or a tutorial
- `jq`, only for the HTTP sign-in

<Steps>

<Step>

### Start the stack

A fresh stack needs its policy before the Kernel boots, so initialize it once, then run everything together:

```bash
mdk rbac init   # once per stack; binds the CLI and each app, creates no user
mdk run
```

Expected output ends with:

```text
Stack running. Press Ctrl+C to stop.
```

> [!TIP]
> `mdk run kernel` starts only the Kernel, which is enough for every `mdk user` command when nothing else is needed yet.

</Step>

<Step>

### Create the operator

In a second terminal, from the project directory:

```bash
mdk user add ops@example.com --admin
```

The command prompts `Password` and `Password again`; the Kernel accepts twelve characters or more. Expected output starts with:

```text
✔ Created user ops@example.com
  mdk.yaml bound ops@example.com to admin
```

A third line names the policy version the Kernel now enforces. `--admin` binds the user to the `admin` role, writing the role
first when `spec.rbac` has none. Confirm with `mdk user list`, which prints the one user.

> [!TIP]
> Scripts pipe the password instead of answering the prompt: `echo "$PW" | mdk user add ops@example.com --admin --password-stdin`.
> A flag value is never accepted.

</Step>

<Step>

### Sign in

#### A. In the dashboard

```bash
mdk run dashboard
```

Open the URL it prints, and sign in with the name and password you set.

#### B. Over HTTP

```bash
TOKEN=$(curl -s -X POST http://localhost:3847/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"ops@example.com","password":"<the password you set>"}' | jq -er .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3847/auth/me
```

Expected output:

```text
{"kind":"user","sub":"ops@example.com"}
```

The port is `spec.gateway.port` in `mdk.yaml`. The access token lasts minutes; the refresh token arrives as a cookie, or in
the body when the login request carries `"refreshIn": "body"`, which the [Gateway's sign-in routes][gateway-security] cover.

#### C. In the CLI

```bash
mdk login ops@example.com
mdk whoami
mdk logout
```

Expected output, one line per command:

```text
✔ Signed in as ops@example.com (until <expiry>)
ops@example.com until <expiry>
✔ Signed out
```

The session lives in `.mdk/session.json`, readable by you alone, and is renewed as it is used. While it lasts, `mdk status`,
`mdk user`, `mdk sa` and `mdk rbac` act as the user, with what `spec.rbac` binds the user to. Without a session the CLI acts
as its own service account, which `mdk whoami` reports as `mdk-cli`.

</Step>

</Steps>

## Troubleshooting

### The command fails because the Kernel is not running

`no Kernel key at <dir>/.mdk/kernel.key; start it with mdk run`, or `Kernel unreachable`. Users live in the Kernel's identity store, so start
`mdk run` in another terminal and run the command again.

### The password is refused

The Kernel answers `ERR_IDENTITY_PASSWORD_WEAK` for fewer than twelve characters. `The passwords do not match.` means the two
prompts differed; run the command again.

### No terminal to prompt for a password

`No terminal to prompt for a password: pipe it in with --password-stdin.` appears in CI and piped shells. Pass the password on
`stdin` as the TIP shows.

### Every route answers 403 after signing in

The user was created without `--admin`, so no rule names them. Run `mdk user add <name> --admin` again: it prints
`Updated user` and adds the binding.

### `mdk run` refuses to start because the policy binds nobody

Run `mdk rbac init` first. `mdk user add` cannot run against a Kernel that is not up, so the policy has to let the stack boot
before the first user exists.

### The CLI session has expired

`ERR_CLI_SESSION_EXPIRED` ends the command. An expired session is an error, never a quiet return to the service account, so
sign in again with `mdk login`.

## Next steps

- [Give everyone else a narrow role][security-policy]: groups, `resourceNames`, and the policy the first operator now administers
- [Manage users and service accounts][cli-users]: `mdk user passwd`, `disable`, `remove`, and `mdk sa` for agents
- [Understand the Gateway's sign-in routes][gateway-security]: cookies, refresh rotation, and what reaches an app
- [Build your first app with a UI][first-app]

## Links

[cli-install]: ../cli/install.md
<!-- docs@tether.io: cli-install → guides/cli/run-with-npm -->

[security-policy]: index.md#step-4-write-the-policy-and-put-identity-in-the-gateway
<!-- docs@tether.io: security-policy → guides/security#step-4-write-the-policy-and-put-identity-in-the-gateway -->

[cli-users]: ../../reference/tooling/cli.md#auth
<!-- docs@tether.io: cli-users → reference/tooling/cli#auth -->

[gateway-security]: ../../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-security → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[first-app]: ../../tutorials/build-your-first-app.md
<!-- docs@tether.io: first-app → tutorials/build-your-first-app -->
