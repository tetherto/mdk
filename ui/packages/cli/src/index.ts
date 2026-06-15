export { runAddPage } from './commands/add-page.js'
export { runCheck } from './commands/check.js'
export { runDocs } from './commands/docs.js'
export { runExample } from './commands/example.js'
export { runInit } from './commands/init.js'
/**
 * Public surface of the `@tetherto/mdk-ui-cli` package. Most consumers will
 * use the `mdk-ui` binary; these exports exist for programmatic use (e.g.
 * embedding the registry reader in an MCP server).
 */
export { runRegistry } from './commands/registry.js'
export { runSync } from './commands/sync.js'
export { loadRegistry, type LoadRegistryOptions } from './registry-loader.js'
