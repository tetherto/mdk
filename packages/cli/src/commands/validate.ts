import type { Command } from 'commander';
import { resolve } from 'node:path';
import { validateApp } from '../lib/app-package.js';
import { runAppSmoke } from '../lib/app-smoke.js';
import { resolvePackageDir } from '../lib/runtime.js';
import { appGrantProblems } from '../lib/rbac.js';
import { loadStackSpec, STACK_FILE } from '../lib/spec.js';
import { validateWorker } from '../lib/worker-package.js';
import { runWorkerSmoke } from '../lib/worker-smoke.js';
import { examples } from '../lib/help.js';
import { theme, tick } from '../lib/theme.js';

const count = (n: number, noun: string, plural = `${noun}s`): string => `${n} ${n === 1 ? noun : plural}`;

type Kind = 'app' | 'worker';

/**
 * The package directory of the app or worker `mdk.yaml` declares as `name`
 * (`spec.apps[]` / `spec.workers[]`), resolved as `mdk run` resolves it.
 */
function resolveDeclared(kind: Kind, name: string, projectDir: string): string {
  const section = kind === 'app' ? 'apps' : 'workers';
  const entries: Array<{ name: string; package: string }> = loadStackSpec(projectDir).spec[section];
  const entry = entries.find((e) => e.name === name);
  if (!entry) {
    throw new Error(
      `No ${kind} named "${name}" in ${STACK_FILE} (spec.${section}: ${entries.map((e) => e.name).join(', ') || 'none'}). ` +
        `Add it with \`mdk create ${kind}\` or \`mdk add ${kind}\`.`,
    );
  }
  return resolvePackageDir(projectDir, entry.package);
}

/** The problems found, and how to describe the package when there are none. */
interface Outcome {
  errors: string[];
  /** Problems that do not fail the check (a stale or empty UI build). */
  warnings?: string[];
  /** The package's own name, for a package checked by --path rather than by mdk.yaml name. */
  name?: string;
  /** An app's requested Kernel access, for the grant check against mdk.yaml. */
  permissions?: unknown[];
  summary: () => string;
}

function check(kind: Kind, dir: string, strict?: boolean): Outcome {
  if (kind === 'app') {
    // The author's own package: also load the UI to check its exports.
    const { errors, warnings, manifest, routes, ui } = validateApp(dir, { runUiContract: true });
    return {
      errors,
      warnings,
      name: typeof manifest?.id === 'string' ? manifest.id : undefined,
      permissions: manifest?.permissions ?? [],
      summary: () =>
        `${theme.label(manifest.displayName)} ${theme.muted(`(${manifest.id} ${manifest.version})`)} is a valid app: ` +
        `${count(routes, 'route')}, ${count(manifest.permissions?.length ?? 0, 'permission rule')}${ui ? ', UI' : ''}`,
    };
  }
  const { errors, warnings, name, version, telemetry, commands } = validateWorker(dir, { strict });
  return {
    errors,
    warnings,
    name,
    summary: () =>
      `${theme.label(name!)} ${theme.muted(`(${version})`)} is a valid worker: ` +
      `${count(telemetry, 'telemetry entry', 'telemetry entries')}, ${count(commands, 'command')}`,
  };
}

interface ValidateOpts {
  json?: boolean;
  dir?: string;
  path?: string;
  smoke?: boolean;
  smokeConfig?: string;
  timeout?: string;
  strict?: boolean;
}

/** Runs one validation and prints it; sets the exit code to 1 when the package is not valid. */
export async function runValidate(kind: Kind, name: string | undefined, opts: ValidateOpts = {}): Promise<void> {
  let dir: string | null = null;
  let outcome: Outcome;
  try {
    // --path checks the package directory itself — the partner-CI mode, where
    // the repo is the package and there is no mdk.yaml to declare it.
    if (opts.path && name) throw new Error(`Pass a ${STACK_FILE} name or --path, not both.`);
    if (!opts.path && !name) throw new Error(`Pass the ${kind}'s name in ${STACK_FILE}, or --path <dir> to check a package directory.`);
    dir = opts.path ? resolve(opts.path) : resolveDeclared(kind, name!, opts.dir ?? '.');
    outcome = check(kind, dir, opts.strict);
    // An app mdk.yaml declares must also be granted there: a valid package the
    // Kernel refuses is not ready to run. A --path check has no mdk.yaml to ask.
    if (kind === 'app' && name && outcome.errors.length === 0) {
      outcome.errors.push(...appGrantProblems(opts.dir ?? '.', name, outcome.permissions ?? []));
    }
    // Behavioural checks only on a statically valid package — a partner fixes
    // contract problems before behaviour, and smoke needs a loadable contract.
    if (opts.smoke && outcome.errors.length === 0) {
      const smokeOpts = { config: opts.smokeConfig, timeoutMs: Number(opts.timeout) || undefined };
      const smoke = kind === 'worker' ? await runWorkerSmoke(dir, smokeOpts) : await runAppSmoke(dir, smokeOpts);
      outcome.errors.push(...smoke.failures);
      outcome.warnings = [...(outcome.warnings ?? []), ...smoke.warnings];
      const summary = outcome.summary;
      outcome.summary = () => `${summary()}; ${count(smoke.passed, 'smoke check')} passed`;
    }
    // An app has no legacy contract to relax: --strict holds it to every warning,
    // the bar a package is listed at.
    if (kind === 'app' && opts.strict && outcome.warnings?.length) {
      outcome.errors.push(...outcome.warnings);
      outcome.warnings = [];
    }
  } catch (error) {
    outcome = { errors: [error instanceof Error ? error.message : String(error)], summary: () => '' };
  }
  const { errors, summary } = outcome;
  const warnings = outcome.warnings ?? [];
  if (opts.json) {
    const reported = name ?? outcome.name ?? null;
    process.stdout.write(`${JSON.stringify({ ok: errors.length === 0, kind, name: reported, path: dir, errors, warnings })}\n`);
    if (errors.length) process.exitCode = 1;
    return;
  }
  for (const warning of warnings) process.stderr.write(`${theme.warn('warning')}: ${warning}\n`);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`${theme.warn('error')}: ${error}\n`);
  } else {
    process.stdout.write(`${tick} ${summary()}\n`);
  }
  if (errors.length) process.exitCode = 1;
}

// Group B — Validate
export function registerValidate(program: Command): void {
  const validate = program
    .command('validate')
    .usage('<command> [options]')
    .summary('Check an app or worker package')
    .description('Check an app or worker package and list every problem. Exits 1 if it is not valid.')
    .addHelpText('after', examples('mdk validate app ops-center', 'mdk validate worker rig --json'));

  const name = (section: string): string => `Its name in ${STACK_FILE} (${section})`;

  validate
    .command('app')
    .argument('[name]', name('spec.apps'))
    .summary('Check an app package')
    .description(
      'Check an app package: mdk-app.yaml, its version against package.json, the permission rules, ' +
        'the route table, including that every handler file exists, and the UI build with its contract exports. ' +
        'Name an app mdk.yaml declares, and its grant in spec.rbac is checked too; or check any package directory with --path.',
    )
    .option('--dir <path>', 'Project directory (the one holding mdk.yaml)', '.')
    .option('--path <dir>', 'Check this package directory instead of a name declared in mdk.yaml')
    .option('--strict', 'Fail on warnings too (a stale UI build, a route --smoke skipped)', false)
    .option('--smoke', 'Also call every route against a mock Kernel that grants only the declared permissions', false)
    .option('--smoke-config <json|path>', 'Mock fleet and sample requests for --smoke: inline JSON, a .json file, or a module with setup()')
    .option('--timeout <ms>', 'Deadline per smoke route call', '10000')
    .option('--json', 'Print the result as JSON: { ok, kind, name, path, errors, warnings }', false)
    .addHelpText(
      'after',
      examples('mdk validate app ops-center', 'mdk validate app ops-center --json', 'mdk validate app --path . --smoke --strict --json'),
    )
    .action((app: string | undefined, opts: ValidateOpts) => runValidate('app', app, opts));

  validate
    .command('worker')
    .argument('[name]', name('spec.workers'))
    .summary('Check a worker package')
    .description(
      'Check a worker package: package.json and its mdk-contract.json Worker Plugin contract, validated against ' +
        'mdk-contract.schema.json and its semantic rules — unique names, min/max on number params, every handler file ' +
        'on disk (handlers are not run). Name a worker mdk.yaml declares, or check any package directory with --path.',
    )
    .option('--dir <path>', 'Project directory (the one holding mdk.yaml)', '.')
    .option('--path <dir>', 'Check this package directory instead of a name declared in mdk.yaml')
    .option('--strict', 'Hold a legacy contract to the full v1 requirements: strictness warnings become errors', false)
    .option('--smoke', 'Also run behavioural checks against the mock device smoke.config.js sets up', false)
    .option('--smoke-config <json|path>', 'Device spec for --smoke: inline JSON, a .json file, or a module with setup()')
    .option('--timeout <ms>', 'Deadline per smoke handler call', '10000')
    .option('--json', 'Print the result as JSON: { ok, kind, name, path, errors, warnings }', false)
    .addHelpText(
      'after',
      examples(
        'mdk validate worker rig',
        'mdk validate worker rig --json',
        'mdk validate worker --path . --smoke --json',
      ),
    )
    .action((worker: string | undefined, opts: ValidateOpts) => runValidate('worker', worker, opts));
}
