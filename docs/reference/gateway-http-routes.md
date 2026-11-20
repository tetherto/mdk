---
title: Gateway HTTP routes
description: Where to find the generated references for the routes a Gateway serves
docs@tether_slug: reference/gateway-http-routes
---

## TL;DR

MDK is agnostic about how you describe an API: it doesn't require a client or an app to adopt OpenAPI. The OpenAPI
documents here are one way to describe the HTTP routes a Gateway serves, generated from the code that serves them.

## Overview

The Gateway is MDK's HTTP entry point and this page covers its HTTP routes.

A Gateway serves two kinds of HTTP route: its own sign-in routes under `/auth`, and the routes of each app your stack declares.
Each is declared in code: the Gateway's in the [route objects it registers][gateway-routes], and an app's in its
[route table][app-route-table] (`mdk-plugin.json`).

The references listed on this page are generated from those declarations, showing what the code serves. Each comes as a Markdown
page for people and an OpenAPI 3.1 document. Neither is a reference for MDK as a whole.

## References

| Reference                              | What it covers                           | Generated from |
| -------------------------------------- | ---------------------------------------- | -------------- |
| [Gateway HTTP API][gateway-http-api] ([OpenAPI 3.1][gateway-openapi]) | The sign-in routes: request, response, and the status of every error code | The [route objects the Gateway registers][gateway-auth-routes] |
| [Route-table fields][route-table-fields] | Every field an app's route table can declare | The [route-table schema][route-table-schema] |
| [Route-table schema][route-table-schema] | The JSON Schema `mdk-plugin.json` is checked against | Source; the app runtime's [loader][app-runtime-loader] stays the authoritative check at startup |

## Example apps

Each app documents its own routes.

> [!NOTE]
> An app doesn't have to generate a reference. These generate theirs from their route
> tables, as examples of an app set up this way:

| App                   | Where it lives                                          | Reference       |
| --------------------- | ------------------------------------------------------- | --------------- |
| MVP site's `site` app | The [MVP site example][mvp-site] in the MDK repository | [HTTP reference][mvp-site-http-api] ([OpenAPI 3.1][mvp-site-openapi]) |
| Reporting app         | [External repository][reporting-app]                    | `docs/http-api.md` and `docs/openapi.json` in that repository |

<!-- TODO: once the public repo syncs docs/http-api.md from source, point reporting-app (link and routing comment) at
https://github.com/tetherto/mdk-app-reporting-tool/blob/main/docs/http-api.md -->

The [apps MDK ships][supported-apps] list where each one documents its routes.

## Next steps

- [Declare an app's routes][apps-guide]: the route table, controllers, and how errors reach a caller
- [Configure the Gateway][gateway-readme]: its options, security model, and how it forwards requests to apps

## Links

[gateway-http-api]: ../../backend/core/gateway/docs/http-api.md
<!-- docs@tether.io: gateway-http-api → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/docs/http-api.md -->

[gateway-openapi]: ../../backend/core/gateway/docs/openapi.json
<!-- docs@tether.io: gateway-openapi → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/docs/openapi.json -->

[route-table-fields]: ../../backend/core/app-runtime/docs/route-table-fields.md
<!-- docs@tether.io: route-table-fields → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/docs/route-table-fields.md -->

[route-table-schema]: ../../backend/core/app-runtime/mdk-plugin.schema.json
<!-- docs@tether.io: route-table-schema → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/mdk-plugin.schema.json -->

[mvp-site]: ../../examples/mvp-site/README.md
<!-- docs@tether.io: mvp-site → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/README.md -->

[mvp-site-http-api]: ../../examples/mvp-site/backend/gateway-plugins/site/docs/http-api.md
<!-- docs@tether.io: mvp-site-http-api → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/gateway-plugins/site/docs/http-api.md -->

[mvp-site-openapi]: ../../examples/mvp-site/backend/gateway-plugins/site/docs/openapi.json
<!-- docs@tether.io: mvp-site-openapi → https://github.com/tetherto/mdk/blob/main/examples/mvp-site/backend/gateway-plugins/site/docs/openapi.json -->

[supported-apps]: supported-apps.md
<!-- docs@tether.io: supported-apps → reference/supported-apps -->

[apps-guide]: ../guides/gateway/apps.md
<!-- docs@tether.io: apps-guide → guides/gateway/apps -->

[gateway-auth-routes]: ../../backend/core/gateway/workers/lib/auth-routes.js
<!-- docs@tether.io: gateway-auth-routes → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/workers/lib/auth-routes.js -->

[app-runtime-loader]: ../../backend/core/app-runtime/lib/plugin-loader.js
<!-- docs@tether.io: app-runtime-loader → https://github.com/tetherto/mdk/blob/main/backend/core/app-runtime/lib/plugin-loader.js -->

[gateway-routes]: ../../backend/core/gateway/README.md#http-api-overview
<!-- docs@tether.io: gateway-routes → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#http-api-overview -->

[app-route-table]: ../guides/gateway/apps.md#21-edit-the-route-table
<!-- docs@tether.io: app-route-table → guides/gateway/apps#21-edit-the-route-table -->

[gateway-readme]: ../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[reporting-app]: https://github.com/tetherto/mdk-app-reporting-tool
<!-- docs@tether.io: reporting-app → https://github.com/tetherto/mdk-app-reporting-tool -->
<!-- TODO: once the public repo syncs docs/http-api.md from mdk-app-reporting-tool-prv, point reporting-app (link and routing comment) at
https://github.com/tetherto/mdk-app-reporting-tool/blob/main/docs/http-api.md -->

