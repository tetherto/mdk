# mdk-plugin.json authoring

## Package layout

```
plugins/<name>/
├── package.json
├── mdk-plugin.json
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

`mdk create plugin <name>` sets this for you (bare `<name>`, or `@org/<name>`
with `--org`) — `mdk.yaml` references whatever name lands here, the same way
it would a published package.

### mdk-plugin.json — required route fields

| Field | Purpose |
| --- | --- |
| `name` / `version` / `description` | Package identity (often mirrors package.json) |
| `routes[].id` | Stable id (`<domain>.<resource>`) |
| `routes[].handler` | Relative path, e.g. `./controllers/power.js` |
| `routes[].auth` | Documentation only — the Gateway reads neither `auth` nor `permissions`. Protect a route by checking the token in its controller |
| `routes[].http.method` | `GET` / `POST` / … |
| `routes[].http.path` | Public path the UI fetches (`/api/...`) |
| `routes[].http.responses` | Document `200` schema + error statuses |
| `routes[].description` | What the route does (operator + LLM context) |
| `routes[].constraints` | Runtime preconditions (Kernel connected, channels present) |
| `routes[].examples` | At least one request/response example with realistic values |
| `routes[].errors` | `ERR_*` strings the controller may throw |
| `routes[].safety` | `"read-only"` unless the route mutates devices |

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

Every field from the table above, together, on one route:

```json
{
  "id": "example.metric",
  "handler": "./controllers/metric.js",
  "auth": false,
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

`mdk create plugin <name>` does all of this: links the package as an npm
workspace member (root `npm install`) and appends it under `mdk.yaml` →
`spec.gateway.plugins[]` → `{ package: <name>, config: {} }`. Scaffolding by
hand instead, do the same two steps yourself, then restart the Gateway.
