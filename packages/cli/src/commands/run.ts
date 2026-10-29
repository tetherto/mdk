import { Option, type Command } from 'commander';
import { resolve } from 'node:path';
import { examples } from '../lib/help.js';
import { StackSpecError, loadStackSpec } from '../lib/spec.js';
import type { StackSpec } from '../lib/spec.js';
import {
  assertGatewayPortFree,
  declaredMockPorts,
  policyRefusal,
  runApp,
  runGateway,
  runKernel,
  runMcp,
  runWorker,
  superviseApp,
  type GatewayHandle,
} from '../lib/runtime.js';
import { findDashboardDir, runDashboard } from '../lib/dashboard.js';
import { describeDashboardApps } from '../lib/dashboard-apps.js';
import { installShutdown, type Stoppable } from '../lib/shutdown.js';
import { acquireRunLocks, type RunComponent } from '../lib/run-lock.js';
import { theme } from '../lib/theme.js';

type RunTarget = 'all' | 'kernel' | 'gateway' | 'mcp' | 'worker' | 'app' | 'dashboard';
const TARGETS: RunTarget[] = ['all', 'kernel', 'gateway', 'mcp', 'worker', 'app', 'dashboard'];
/** Targets that take a `[name]`; the rest refuse one rather than ignore it. */
const NAMED_TARGETS: RunTarget[] = ['worker', 'app'];

interface RunOptions {
  dir: string;
  detach?: boolean;
  allowWrite?: boolean;
}

function die(message: string): never {
  process.stderr.write(`${theme.warn('error')}: ${message}\n`);
  process.exit(1);
}

/** Loads + validates mdk.yaml, converting a spec error into a clean exit. */
function loadSpecOrDie(dir: string): StackSpec {
  try {
    return loadStackSpec(dir);
  } catch (error) {
    if (error instanceof StackSpecError) die(error.message);
    throw error;
  }
}

/**
 * Boots Kernel + Workers + Gateway together in this process (target `all`).
 * Workers boot before the gateway so they register with the in-process Kernel
 * before the gateway resolves its client; the gateway boots last since it
 * `chdir`s into its own state root. Each app runs as a supervised child
 * process, started before the gateway.
 */
async function runAll(dir: string, spec: StackSpec): Promise<Stoppable[]> {
  // Checked up front: the gateway boots last, and booting a Kernel and every
  // worker only to die on a taken port would leave the user to clean up state
  // for a failure that was knowable in the first millisecond.
  await assertGatewayPortFree(spec.spec.gateway.port);

  const kernel = await runKernel(dir, spec);

  // Each worker avoids the ports its not-yet-booted neighbours asked for; the
  // ones already booted are detected as bound, so this covers the whole set.
  const declared = spec.spec.workers;
  const workers: Stoppable[] = [];
  for (const [i, w] of declared.entries()) {
    const reservedPorts = new Set(declared.slice(i + 1).flatMap(declaredMockPorts));
    const handle = await runWorker(dir, w, kernel, { reservedPorts, spec });
    workers.push({ label: `worker ${w.name}`, stop: () => handle.stop() });
  }

  const apps: Stoppable[] = [];
  for (const a of spec.spec.apps) {
    const handle = await superviseApp(dir, a, kernel, undefined, spec);
    apps.push({ label: `app ${a.name}`, stop: () => handle.stop() });
  }

  const gateway = await runGateway(dir, spec, kernel);
  process.stderr.write(`\n${theme.ok('Stack running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);

  // Reverse boot order: stop serving requests, then the apps and workers behind
  // them, then the Kernel they were registered with.
  return [
    { label: 'gateway', stop: () => stopGateway(gateway) },
    ...apps,
    ...workers,
    { label: 'kernel', stop: () => kernel.stop() },
  ];
}

/** Promisifies the Gateway's callback-style `stop`. */
function stopGateway(gateway: GatewayHandle): Promise<void> {
  return new Promise((resolve) => {
    try {
      gateway.stop(() => resolve());
    } catch {
      resolve();
    }
  });
}

/**
 * The components a target runs in this process. The Gateway and the MCP server
 * are not listed: their port check already refuses a second copy.
 */
function lockedComponents(target: RunTarget, name: string | undefined, spec: StackSpec): RunComponent[] {
  switch (target) {
    case 'all':
      return [
        { kind: 'kernel' },
        ...spec.spec.workers.map((w): RunComponent => ({ kind: 'worker', name: w.name })),
        ...spec.spec.apps.map((a): RunComponent => ({ kind: 'app', name: a.name })),
      ];
    case 'kernel':
      return [{ kind: 'kernel' }];
    case 'worker':
    case 'app': {
      // Only a declared name: an unknown one is refused below, before it can
      // name a lock file.
      const declared = target === 'worker' ? spec.spec.workers : spec.spec.apps;
      return declared.some((c) => c.name === name) ? [{ kind: target, name }] : [];
    }
    default:
      return [];
  }
}

async function runTarget(
  target: RunTarget,
  name: string | undefined,
  dir: string,
  spec: StackSpec,
  opts: { allowWrite?: boolean } = {},
): Promise<Stoppable[]> {
  try {
    acquireRunLocks(dir, lockedComponents(target, name, spec));
    switch (target) {
      case 'all':
        return await runAll(dir, spec);

      case 'kernel': {
        const kernel = await runKernel(dir, spec);
        process.stderr.write(`\n${theme.ok('Kernel running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: 'kernel', stop: () => kernel.stop() }];
      }

      case 'gateway': {
        const gateway = await runGateway(dir, spec);
        process.stderr.write(`\n${theme.ok('Gateway running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: 'gateway', stop: () => stopGateway(gateway) }];
      }

      case 'mcp': {
        const mcp = await runMcp(dir, spec, undefined, { allowWrite: opts.allowWrite });
        process.stderr.write(`\n${theme.ok('MCP server running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: 'mcp', stop: () => mcp.stop() }];
      }

      case 'worker': {
        if (!name) die('`mdk run worker` requires a worker <name> (see spec.workers in mdk.yaml).');
        const worker = spec.spec.workers.find((w) => w.name === name);
        if (!worker) {
          const known = spec.spec.workers.map((w) => w.name).join(', ') || '(none)';
          die(`No worker named "${name}" in mdk.yaml. Known workers: ${known}.`);
        }
        const handle = await runWorker(dir, worker, undefined, { spec });
        process.stderr.write(`\n${theme.ok('Worker running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: `worker ${worker.name}`, stop: () => handle.stop() }];
      }

      case 'app': {
        if (!name) die('`mdk run app` requires an app <name> (see spec.apps in mdk.yaml).');
        const app = spec.spec.apps.find((a) => a.name === name);
        if (!app) {
          const known = spec.spec.apps.map((a) => a.name).join(', ') || '(none)';
          die(`No app named "${name}" in mdk.yaml. Known apps: ${known}.`);
        }
        const handle = await runApp(dir, app, spec);
        process.stderr.write(`\n${theme.ok('App running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: `app ${app.name}`, stop: () => handle.stop() }];
      }

      case 'dashboard': {
        const dashboardDir = findDashboardDir(dir);
        if (!dashboardDir) {
          die(
            `No dashboard app found under ${resolve(dir)}. Scaffold one first: ${theme.cmd('mdk create dashboard')}`,
          );
        }
        // Installed apps are found here, from mdk.yaml, and handed to the
        // dashboard: it serves their UIs itself, so no Gateway is involved.
        const apps = describeDashboardApps(dir, spec.spec.apps ?? []);
        if (apps.length) {
          process.stderr.write(`${theme.muted('Apps:')} ${apps.map((a) => `${a.displayName} (${a.name})`).join(', ')}\n`);
        }
        const handle = await runDashboard(dashboardDir, apps);
        process.stderr.write(
          `\n${theme.ok('Dashboard running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`,
        );
        return [{ label: 'dashboard', stop: () => handle.stop() }];
      }
    }
  } catch (error) {
    die(error instanceof Error ? error.message : String(error));
  }
}

// Group C — Run & manage
export function registerRun(program: Command): void {
  program
    .command('run')
    .argument('[target]', `What to start: ${TARGETS.join(' | ')} (default: all)`)
    .argument('[name]', 'The worker or app to start (worker and app targets only)')
    .summary('Start the stack, or one component of it')
    .description(
      'Start the Kernel, workers, app runtimes and Gateway from mdk.yaml (target all), or one component. ' +
        'mcp and dashboard are never part of all; start them on their own. Runs in the foreground; Ctrl+C stops it.',
    )
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .addOption(new Option('--detach', 'Run in the background (not implemented yet)').default(false).hideHelp())
    .option('--allow-write', 'mcp: expose write tools (hidden by default; or set spec.mcp.allowWrite)', false)
    .addHelpText(
      'after',
      examples('mdk run', 'mdk run kernel', 'mdk run worker rig', 'mdk run app ops-center', 'mdk run gateway --dir ./my-stack'),
    )
    .action(async (target: string | undefined, name: string | undefined, opts: RunOptions) => {
      if (opts.detach) {
        die('`--detach` is not implemented yet. Run in the foreground (omit --detach).');
      }

      if (target && !TARGETS.includes(target as RunTarget)) {
        die(`Unknown target "${target}". Use one of: ${TARGETS.join(' | ')}.`);
      }

      const resolvedTarget = (target as RunTarget | undefined) ?? 'all';
      if (name !== undefined && !NAMED_TARGETS.includes(resolvedTarget)) {
        die(`\`mdk run ${resolvedTarget}\` takes no name (got "${name}"); only worker and app do.`);
      }

      const spec = loadSpecOrDie(opts.dir);

      // A Kernel booted on a policy that binds nobody cannot be handed one in
      // place, so the first run of a fresh stack is refused here, with the fix.
      if (resolvedTarget === 'all' || resolvedTarget === 'kernel') {
        const refusal = policyRefusal(spec);
        if (refusal) die(refusal);
      }

      // No explicit target: boot everything together. Components can always be
      // run separately instead — `mdk run kernel` / `gateway` / `worker <name>`
      // — that choice is just which command(s) you type, not a spec setting.
      const running = await runTarget(resolvedTarget, name, opts.dir, spec, { allowWrite: opts.allowWrite });

      // Registered only once everything is up: a boot that fails exits on its
      // own, and until then the default signal behavior is the right one.
      installShutdown(running);
    });
}
