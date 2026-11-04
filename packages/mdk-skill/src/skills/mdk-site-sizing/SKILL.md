---
name: mdk-site-sizing
description: >
  Size an MDK deployment from a plain description of a site using measured
  benchmark envelopes. Use when the task mentions "size a site", "how many
  Workers", "capacity", "hardware for N miners", "sizing recommendation",
  "deployment envelope", "devices per Worker", or turning benchmark results
  into a Kernel/Worker/Gateway layout.
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# Size an MDK site from a description

Measured performance data turned into an Agent Skill that sizes an MDK
deployment from a plain description of a site. Bar: the Skill's recommendations
match the measured envelope on a held-out set of site descriptions.

Do **not** invent CPU, RAM, devices-per-Worker, or pass/fail status. Parse the
site, run the sizer, quote the matching envelope.

## When to use

| Situation                                           | Action     |
| --------------------------------------------------- | ---------- |
| "How many Workers for N miners on this host?"       | This skill |
| "Size a site from this description"                 | This skill |
| Turn committed `backend/tests/benchmark/published/<run>/*.json`, or a local `results/*.json`, into advice | Compile the envelope, then this skill |
| Write `mdk.yaml` / `mdk run` after a size is agreed | Hand off to `mdk-deployment` |
| Measure a new host | Point at the [capacity harness](../../../../../backend/tests/benchmark/README.md); do not guess |

## Workflow

Copy this checklist:

```
Task Progress:
- [ ] 1. Parse the site description into facts
- [ ] 2. Run size-site.mjs against the envelope (never skip)
- [ ] 3. Present the script output as the recommendation
- [ ] 4. If status is unmeasured or beyond-envelope, stop claiming support
```

### 1. Parse

Extract facts matching this shape (or run `scripts/parse-site.mjs`):

```json
{
  "devices": [
    { "type": "mdk-worker-whatsminer", "model": "m56s", "count": 80 }
  ],
  "deviceCount": 80,
  "host": {
    "tier": "edge | site-server | custom",
    "cpuCoresPhysical": 16,
    "ramGiB": 64,
    "diskType": "nvme | sata | hdd | sd"
  },
  "kernels": 1,
  "gateways": 1
}
```

Worker `type` values are package names (`mdk-worker-whatsminer`,
`mdk-worker-antminer`, `mdk-worker-avalon`). Map vendor prose (MicroBT,
Bitmain, Canaan) onto those names. Default topology is **1 Kernel, 1 Gateway**.

If a count or family is missing, leave it null. Do not fill gaps with a guess.

### 2. Size (mandatory)

From this skill directory. Never paste the operator's text into a shell
command (not even inside double quotes: `$( )`, backticks and `"` still
expand). Write it verbatim to a file with your file-writing tool, then pass the
file:

```bash
node scripts/size-site.mjs --description-file site.txt --md
# or, if you already wrote facts.json:
node scripts/size-site.mjs facts.json --md
```

The script reads [`references/envelope.json`](./references/envelope.json) and
prints the recommendation. That JSON is the measured envelope. Treat its
`status`, Worker count, devices-per-Worker, and resource numbers as
authoritative.

Rebuild the envelope from committed runs, or from a run of your own:

```bash
# committed: published harness runs, present in a fresh clone
node scripts/compile-envelope.mjs --from <repo>/backend/tests/benchmark/published/2026-10-27-m3max

# local: your own `npm run benchmark` output, gitignored
node scripts/compile-envelope.mjs --from <repo>/backend/tests/benchmark/results
```

`results/` is gitignored, so it is empty until you run the harness yourself.
`published/` carries the committed runs, one directory per measurement date.

The envelope shipped with this skill is still compiled from
[`eval/profiles/`](./eval/profiles/cap-100devices-2workers.json) (same schema
as a harness profile). Label any quote from a `source: fixture` envelope as
fixture data.

### 3. Present

Use the script's `--md` output, or the same table it renders: status, tier,
devices, Workers, devices per Worker, Kernels, Gateways, matching profile,
RSS, CPU, p99, supported-up-to (densest **green** profile on that mix and
tier). Repeat the script's caveats verbatim.

**Supported** means `status: green` inside the envelope. Amber is "little spare
capacity", not a supported-up-to bound. `beyond-envelope` and `unmeasured` are
not sizes: tell the operator to run the harness.

### 4. Hand-off

Once the operator accepts a green (or explicit amber) layout, use
`mdk-deployment` to write `mdk.yaml` with that Worker count and device split.

## Envelope rules (do not override)

- Match on device-family set, then reference tier (`edge` / `site-server` /
  `custom`). Custom profiles may fill a tier gap; they do not change the host
  tier you report.
- Covering profile = smallest profile with `deviceCount >= requested` at the
  best pass/fail (`green` then `amber`). Worker count is
  `ceil(requested / devices-per-Worker)` from that profile.
- Resource numbers interpolate between the next-smaller green point and the
  covering profile. Do not extrapolate past the last non-red point and call it
  green.
- Densest green on that mix+tier is `supportedUpTo`. A red profile is a
  measured failure, not a layout to copy.
- Unknown families (no profile in the envelope) → `unmeasured`.

Full compile/lookup notes: [`references/envelope.md`](./references/envelope.md).

## Held-out bar

The bar is that the Skill's recommendations match the measured envelope on a
held-out set of site descriptions. Prove it:

```bash
node scripts/compile-envelope.mjs
node scripts/eval-held-out.mjs
```

[`eval/held-out.json`](./eval/held-out.json) is the held-out set: prose the
train profiles never use as ids, expected windows read off the envelope.
`eval-held-out.mjs` parses each description, sizes it, and exits 0 only when
every case matches. Do not edit expected windows to make a bad recommendation
pass; fix parse/size or add a measured profile.

## Utility scripts

| Script                 | Run                                                     |
| ---------------------- | ------------------------------------------------------- |
| `parse-site.mjs`       | `node scripts/parse-site.mjs < site.txt`                |
| `size-site.mjs`        | `node scripts/size-site.mjs --description-file site.txt [--md]` |
| `compile-envelope.mjs` | `node scripts/compile-envelope.mjs [--from <dir>]`      |
| `eval-held-out.mjs`    | `node scripts/eval-held-out.mjs`                        |

Execute these. Do not reimplement them in the conversation.
