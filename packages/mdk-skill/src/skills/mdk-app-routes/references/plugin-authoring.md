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

### mdk-plugin.json — required route fields

| Field | Purpose |
| --- | --- |
| `name` / `version` / `description` | Package identity (often mirrors package.json) |
| `routes[].id` | Stable id (`<domain>.<resource>`) |
| `routes[].handler` | Relative path, e.g. `./controllers/power.js` |
| `routes[].auth` | Not an access switch under `mdk run`: the Gateway checks every route against `spec.rbac`, whatever `auth` says. A request needs a bearer token (`401` without one) and a rule that grants the caller the route's verb on its resource (`403` otherwise). The resource is `<app>/<path>`, e.g. `ops/api/ops/summary`. The caller's identity, never its token, reaches the controller as `req._info`. `spec.gateway.config.authVerifier` is refused |
| `routes[].verb` | Optional RBAC verb. Without it the verb follows the method: `GET` `get`, `POST` `create`, `PUT`/`PATCH` `update`, `DELETE` `delete` |
| `routes[].resourceName` | Optional `{ "param" \| "query" \| "body": "<field>" }`: where the request names the instance, so a `spec.rbac` rule with `resourceNames` can scope it |
| `routes[].http.method` | `GET` / `POST` / … |
| `routes[].http.path` | Path the UI fetches (`/api/...`), served under `/apps/<app-name>` unless the app is mounted elsewhere |
| `routes[].http.responses` | Document `200` schema + error statuses |
| `routes[].description` | What the route does (operator + LLM context) |
| `routes[].constraints` | Runtime preconditions (Kernel connected, channels present) |
| `routes[].examples` | At least one request/response example with realistic values |
| `routes[].errors` | `ERR_*` strings the controller may throw |
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

Every field from the table above, together, on one route. What the route grants is set in `spec.rbac`, not here:

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
