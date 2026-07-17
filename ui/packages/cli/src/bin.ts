#!/usr/bin/env node
import { Command } from 'commander'

import { runRegistry } from './commands/registry.js'
import { runDocs } from './commands/docs.js'
import { runDocsBuild } from './commands/docs-build.js'
import { runDocsGenerate } from './commands/docs-generate.js'
import { runExample } from './commands/example.js'
import { runAddPage } from './commands/add-page.js'
import { runAddFeature } from './commands/add-feature.js'
import { runCreate } from './commands/create.js'
import { runRemovePage } from './commands/remove-page.js'
import { listTemplates } from './templates.js'
import { runCheck } from './commands/check.js'
import { runInit } from './commands/init.js'
import { runSync } from './commands/sync.js'
import { runFind } from './commands/find.js'
import { runBlueprint, runBlueprints } from './commands/blueprints.js'
import { runSuggest } from './commands/suggest.js'
import { runHooks } from './commands/hooks.js'
import { runStores } from './commands/stores.js'
import { buildManifest } from './manifest.js'
import { PACKAGES } from './constants.js'

const program = new Command()

program
  .name('mdk-ui')
  .description('Agent-first CLI for the MDK Devkit.')
  .version('0.0.1')
  .option('--package <name>', 'MDK devkit package to read', PACKAGES.devkit)

program
  .command('create [appName]')
  .description(
    'Scaffold a new MDK app from a template (see --list-templates). When run ' +
      'inside the MDK monorepo, defaults to template=mdk-ui-shell, cwd=apps/, ' +
      'no inner install, and rewrites the new package to use the workspace ' +
      'protocol — so `npx mdk-ui create my-app` is all you need.',
  )
  .option(
    '--template <id>',
    'Template id (default: mdk-ui-shell inside the monorepo, starter elsewhere)',
  )
  .option(
    '--cwd <dir>',
    'Parent directory for the new app (default: apps/ inside the monorepo, $PWD elsewhere)',
  )
  .option('--list-templates', 'Print available templates and exit')
  .option('--no-install', 'Skip running npm install after scaffold')
  .option(
    '--ide <ide>',
    'Agent context to seed: cursor | claude | none (default: none inside the monorepo, cursor elsewhere)',
  )
  .action(async (appName, opts) => {
    if (opts.listTemplates) {
      const templates = listTemplates()
      if (templates.length === 0) {
        // eslint-disable-next-line no-console
        console.log('(no templates installed)')
        return
      }
      for (const t of templates) {
        // eslint-disable-next-line no-console
        console.log(`${t.id.padEnd(14)} ${t.description}`)
      }
      return
    }
    if (!appName) {
      throw new Error('App name is required. Run `mdk-ui create --help` for usage.')
    }
    // Commander only lets us see the *resolved* value of `--no-install`,
    // so reach into argv to tell "default" apart from "explicitly true /
    // explicitly false". When neither flag was passed we leave it
    // undefined and let runCreate pick a context-aware default.
    const installFlag = process.argv.includes('--no-install')
      ? false
      : process.argv.includes('--install')
        ? true
        : undefined
    runCreate({
      appName,
      template: opts.template,
      cwd: opts.cwd,
      install: installFlag,
      ide: opts.ide,
    })
  })

program
  .command('registry')
  .description('Print the machine-readable component registry.')
  .option('--filter <kind>', 'components | hooks | all', 'all')
  .option('--format <format>', 'json | table', 'json')
  .option('--tier <tier>', 'agent-ready | advanced — narrow the public surface to a single tier')
  .option('--all', 'Include internal (public: false) entries — returns the full registry')
  .action(async (opts) => {
    await runRegistry({
      packageName: program.opts().package,
      filter: opts.filter,
      format: opts.format,
      tier: opts.tier,
      includeInternal: !!opts.all,
    })
  })

program
  .command('docs <ComponentName>')
  .description('Print the co-located USAGE.md for a component.')
  .action(async (componentName) => {
    await runDocs({
      packageName: program.opts().package,
      componentName,
    })
  })

program
  .command('example <ComponentName>')
  .description('Print a runnable example for a component.')
  .action(async (componentName) => {
    await runExample({
      packageName: program.opts().package,
      componentName,
    })
  })

program
  .command('docs:build')
  .description(
    'Generate the docs-site dataset (catalog + usage + examples + cli) from the ' +
      'registry. Point --docs-repo at a local mdk-docs checkout to write into it, ' +
      'install the rendering components, and print a coverage report; or use --out ' +
      'for a plain dataset. Public surface only; a leak guard blocks private references.',
  )
  .option('--devkit-dir <dir>', 'Built devkit checkout (contains dist/registry.json)')
  .option('--adapter-dir <dir>', 'Built react-adapter checkout (contains dist/hooks.json)')
  .option('--core-dir <dir>', 'Built ui-foundation checkout (contains dist/stores.json)')
  .option('--fonts-dir <dir>', 'Fonts package checkout (contains package.json + dist/fonts)')
  .option('--adapter <name>', 'react-adapter package to read', PACKAGES.adapter)
  .option('--core <name>', 'ui-foundation package to read', PACKAGES.core)
  .option('--fonts <name>', 'fonts package to read', PACKAGES.fonts)
  .option('--out <dir>', 'Plain dataset output directory (mutually exclusive with --docs-repo)')
  .option('--docs-repo <path>', 'Local mdk-docs checkout; writes src/data/<version>/generated')
  .option('--version-label <id>', 'Version segment + meta stamp', '0.2.0')
  .option('--report-only', 'Diff against the committed tree, write nothing, exit 1 on drift')
  .option('--no-scaffold', 'Skip MDX page + nav scaffolding (dataset only) for --docs-repo')
  .option('--include-internal', 'Include public:false entries (debug only — never commit)')
  .option('--cli-manifest <file>', 'Path to a cli-manifest.json to embed as cli.json')
  .action(async (opts) => {
    const result = await runDocsBuild({
      packageName: program.opts().package,
      devkitDir: opts.devkitDir,
      adapterPackage: opts.adapter,
      adapterDir: opts.adapterDir,
      corePackage: opts.core,
      coreDir: opts.coreDir,
      fontsPackage: opts.fonts,
      fontsDir: opts.fontsDir,
      outDir: opts.out,
      docsRepo: opts.docsRepo,
      versionLabel: opts.versionLabel,
      reportOnly: !!opts.reportOnly,
      scaffold: opts.scaffold,
      includeInternal: !!opts.includeInternal,
      cliManifestPath: opts.cliManifest,
    })
    // Drift is only a failure signal in the CI-style --report-only lane.
    if (opts.reportOnly && result.drift?.hasDrift) process.exitCode = 1
  })

program
  .command('docs:generate')
  .description(
    'One-command orchestration around docs:build. Locates the MDK monorepo, ' +
      'builds it so every package manifest (registry / hooks / stores / fonts) is ' +
      'fresh, then generates the reference dataset + pages + report into a docs repo. ' +
      'This is the reusable core the docs site wraps with its own config + prose sync.',
  )
  .option('--repo <dir>', 'Monorepo root (auto-detected by walking up from cwd if omitted)')
  .option('--docs-repo <path>', 'Local mdk-docs checkout; writes src/data/<version>/generated')
  .option('--out <dir>', 'Plain dataset output directory (mutually exclusive with --docs-repo)')
  .option('--version-label <id>', 'Version segment + meta stamp', '0.2.0')
  .option('--skip-build', 'Reuse existing dist/ instead of rebuilding (faster; can be stale)')
  .option('--report-only', 'Diff against the committed tree, write nothing, exit 1 on drift')
  .option('--no-scaffold', 'Skip MDX page + nav scaffolding (dataset only)')
  .option('--include-internal', 'Include public:false entries (debug only — never commit)')
  .action(async (opts) => {
    const result = await runDocsGenerate({
      repo: opts.repo,
      docsRepo: opts.docsRepo,
      outDir: opts.out,
      versionLabel: opts.versionLabel,
      skipBuild: !!opts.skipBuild,
      reportOnly: !!opts.reportOnly,
      scaffold: opts.scaffold,
      includeInternal: !!opts.includeInternal,
    })
    if (opts.reportOnly && result.drift?.hasDrift) process.exitCode = 1
  })

const add = program.command('add').description('Scaffolding helpers.')

add
  .command('page <name>')
  .description(
    'Generate src/pages/<Name>.tsx. Component is auto-resolved from <name> unless --component is set.',
  )
  .option('-c, --component <ComponentName>', 'MDK component to import (skips auto-resolution)')
  .option('--out-dir <dir>', 'Output directory', 'src/pages')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .option('--force', 'Overwrite if the file exists')
  .option('--shell', 'Force placeholder shell even when a runnable example exists')
  .action(async (name, opts) => {
    await runAddPage({
      packageName: program.opts().package,
      pageName: name,
      componentName: opts.component,
      outDir: opts.outDir,
      cwd: opts.cwd,
      force: !!opts.force,
      shell: !!opts.shell,
    })
  })

add
  .command('feature <blueprintId>')
  .description('Scaffold a working page from a curated blueprint (see `mdk-ui blueprints`).')
  .option('--out-dir <dir>', 'Output directory', 'src/pages')
  .option('--route <path>', 'Override the URL path registered in routes.ts')
  .option('--name <PascalCase>', 'Override the generated page name')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .option('--force', 'Overwrite if the file exists')
  .action(async (blueprintId, opts) => {
    runAddFeature({
      packageName: program.opts().package,
      blueprintId,
      cwd: opts.cwd,
      outDir: opts.outDir,
      routePath: opts.route,
      pageName: opts.name,
      force: !!opts.force,
    })
  })

const remove = program.command('remove').description('Remove scaffolded artifacts.')

remove
  .command('page <name>')
  .description('Delete src/pages/<Name>.tsx and remove its route from routes.ts.')
  .option('--out-dir <dir>', 'Directory that holds the page file', 'src/pages')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .option('--force', 'Delete even if the file was modified after generation')
  .action(async (name, opts) => {
    runRemovePage({
      pageName: name,
      outDir: opts.outDir,
      cwd: opts.cwd,
      force: !!opts.force,
    })
  })

program
  .command('find')
  .description('Filter the registry by capability / domain / category / tier.')
  .option('--capability <id>', 'Kernel capability identifier (e.g. hashrate-monitoring)')
  .option('--domain <id>', 'mining-operations | financial-reporting | device-management | generic')
  .option('--category <id>', 'Category bucket (charts, cards, tables, ...)')
  .option('--tier <tier>', 'agent-ready | advanced | all (defaults to agent-ready)')
  .option('--kind <kind>', 'components | hooks | all', 'all')
  .option('--format <format>', 'json | table', 'json')
  .action(async (opts) => {
    await runFind({
      packageName: program.opts().package,
      capability: opts.capability,
      domain: opts.domain,
      category: opts.category,
      tier: opts.tier,
      kind: opts.kind,
      format: opts.format,
    })
  })

program
  .command('stores')
  .description('Print the Zustand stores + query helpers manifest from the ui-foundation package.')
  .option('--core <name>', 'ui-foundation package to read', PACKAGES.core)
  .option(
    '--category <category>',
    'Filter by category (auth | devices | notifications | timezone | actions)',
  )
  .option('--format <format>', 'json | table', 'json')
  .action(async (opts) => {
    await runStores({
      packageName: opts.core,
      category: opts.category,
      format: opts.format,
    })
  })

program
  .command('hooks')
  .description('Print the React hooks manifest published by the adapter package.')
  .option('--adapter <name>', 'Adapter package to read', PACKAGES.adapter)
  .option(
    '--category <category>',
    'Filter by category (store | utility | permission | ui | external)',
  )
  .option('--format <format>', 'json | table', 'json')
  .action(async (opts) => {
    await runHooks({
      packageName: opts.adapter,
      category: opts.category,
      format: opts.format,
    })
  })

program
  .command('blueprints')
  .description('List curated blueprints (intent → recipe).')
  .option('--format <format>', 'json | table', 'json')
  .action(async (opts) => {
    await runBlueprints({
      packageName: program.opts().package,
      format: opts.format,
    })
  })

program
  .command('blueprint <id>')
  .description('Print a single blueprint (markdown body, ready to feed an LLM).')
  .action(async (id) => {
    await runBlueprint({
      packageName: program.opts().package,
      id,
    })
  })

program
  .command('suggest <query...>')
  .description('Score components, hooks and blueprints by keyword overlap with a free-text intent.')
  .option('--limit <n>', 'Top N per group', '5')
  .action(async (queryWords, opts) => {
    await runSuggest({
      packageName: program.opts().package,
      query: queryWords.join(' '),
      limit: Number.parseInt(opts.limit, 10) || 5,
    })
  })

program
  .command('check <file>')
  .description('Run tsc --noEmit on a single file and emit JSON errors.')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .action(async (file, opts) => {
    await runCheck({ file, cwd: opts.cwd })
  })

program
  .command('init')
  .description('Generate .mdk/context.md in the consuming project.')
  .option('--ide <ide>', 'cursor | claude | none', 'none')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .option('--force', 'Overwrite existing files')
  .action(async (opts) => {
    await runInit({
      packageName: program.opts().package,
      ide: opts.ide,
      cwd: opts.cwd,
      force: !!opts.force,
    })
  })

program
  .command('sync')
  .description('Refresh existing-pages / existing-hooks sections in .mdk/context.md.')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .action(async (opts) => {
    await runSync({ cwd: opts.cwd })
  })

/**
 * `--json-help` short-circuits parsing: emit the structured CLI manifest
 * and exit cleanly. This is what `dist/cli-manifest.json` is built from,
 * and what agents call to discover the full command surface in one read.
 */
if (process.argv.includes('--json-help')) {
  process.stdout.write(`${JSON.stringify(buildManifest(program), null, 2)}\n`)
  process.exit(0)
}

const parseAsync = async () => {
  try {
    await program.parseAsync(process.argv)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

void parseAsync()
