# mdk-plugin.json authoring

## Package layout

```
apps/<name>/
├── package.json
├── mdk-app.yaml
└── plugin/
    ├── mdk-plugin.json
    ├── lib/client.js
    └── controllers/<route>.js
```

### package.json

```json
{
  "name": "<name>",
  "version": "0.1.0",
  "private": true,
  "description": "<one-line: what telemetry/commands this aggregates>"
}
```

`mdk create app <name>` sets this for you (bare `<name>`, or `@org/<name>`
with `--org`) — `mdk.yaml` references whatever name lands here, the same way
it would a published package. `mdk-app.yaml`'s `version` must equal this
`version`; the [`mdk-create-app`](../../mdk-create-app/SKILL.md) skill owns the rest of that manifest.

### Route fields

Every field, its type, and when it is checked are in
[`mdk-plugin.schema.json`](../../../../../../backend/core/app-runtime/mdk-plugin.schema.json) (bundled beside this file as
`references/mdk-plugin.schema.json`), owned by the app runtime; `mdk validate app` checks a table against it. This table is the
authoring guidance the schema cannot carry; a field not listed here is fully described there.

| Field | Authoring guidance |
| --- | --- |
| `routes[].id` | Stable id (`<domain>.<resource>`) |
| `routes[].verb` / `routes[].resourceName` | How `spec.rbac` governs the route under `mdk run`, which checks every route as the resource `<app>/<path>`: `verb` overrides the one from the method ([the Gateway's mapping](../../../../../../backend/core/gateway/README.md#security-model)), and `resourceName` (`{ param \| query \| body: "<field>" }`) names the instance a rule's `resourceNames` match. Who may call the route is the operator's rule in `mdk.yaml`, never the app's |
| `routes[].auth` | Changes nothing under `spec.rbac`; set `true` anyway so a Gateway running an `authVerifier` instead answers `401` unless the verifier returns an identity, which reaches the controller as `req._info`. Only that verifier reads a route's `permissions` (as `route.permissions`): `spec.rbac` ignores them, `mdk validate app` warns about them, and the Gateway logs them at boot |
| `routes[].http.path` | Path the UI fetches (`/api/...`), served under `/apps/<app-name>` unless the app is mounted elsewhere |
| `routes[].http.responses` | Document `200` schema + error statuses |
| `routes[].examples` | At least one request/response example with realistic values |
| `routes[].safety` | `"read-only"` unless the route mutates devices. `mdk run mcp` withholds every other route unless started with `--allow-write` |

## Response schema rules

- Schema properties must match what the controller **actually returns**.
- Prefer flat, UI-ready shapes:

```json
{
  "unit": "W",
  "total": 3400,
  "devices": [
    { "deviceId": "dev-0", "value": 3400 }
  ]
}
```

- Include the contract `unit` as a field so the UI never hard-codes it.
- Name numeric fields with the unit suffix when helpful (`powerW`, not `power`
  next to a separate `unit`), so cards can round without guessing.

## Fully populated route example

Every field from the route fields table, together, on one route. What the route grants is set in `spec.rbac`, not here:

```json
{
  "id": "example.metric",
  "handler": "./controllers/metric.js",
  "auth": true,
  "http": {
    "method": "GET",
    "path": "/api/example/metric",
    "responses": {
      "200": {
        "description": "Aggregated metric across matching devices.",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "unit": { "type": "string" },
                "total": { "type": "number" },
                "devices": { "type": "array" }
              }
            }
          }
        }
      },
      "400": { "description": "MDK client unavailable." }
    }
  },
  "description": "Fans out telemetry.pull to matching devices and returns shaped rows.",
  "constraints": [
    "Requires the MDK client to be connected to a Kernel instance.",
    "Devices must expose the contract channel(s) this route reads."
  ],
  "examples": [
    {
      "description": "Example success payload",
      "request": "GET /api/example/metric",
      "response": { "unit": "W", "total": 0, "devices": [] }
    }
  ],
  "errors": ["ERR_MDK_CLIENT_UNAVAILABLE"],
  "safety": "read-only"
}
```

## Registering

`mdk create app <name>` does all of this: links the package into the project's
root `package.json` (root `npm install`) and appends it under `mdk.yaml` →
`spec.apps[]` → `{ name: <name>, package: <name>, config: {} }`. Scaffolding by
hand instead, do the same two steps yourself, run `mdk validate app <name>`,
then restart with `mdk run`.
