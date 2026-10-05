Do not document

- Support for Gateway plugin sets `autoGenerateMcp: true` has been removed — do not document it.
MCP is a separate process, away from the Gateway, so no MCP-related config belongs in the Gateway.

- Do not expose `createRawMdkClient` it is not an option for "When to use which client path". While `createWorkerClient` wraps createRawMdkClient, it's not user facing.
