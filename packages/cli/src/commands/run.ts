import type { Command } from 'commander';
import { StackSpecError, loadStackSpec } from '../lib/spec.js';
import type { StackSpec } from '../lib/spec.js';
import {
  assertGatewayPortFree,
  declaredMockPorts,
  runGateway,
  runKernel,
  runMcp,
  runWorker,
  type GatewayHandle,
} from '../lib/runtime.js';
import { findDashboardDir, runDashboard } from '../lib/dashboard.js';
import { installShutdown, type Stoppable } from '../lib/shutdown.js';
import { theme } from '../lib/theme.js';

type RunTarget = 'all' | 'kernel' | 'gateway' | 'mcp' | 'worker' | 'dashboard';
const TARGETS: RunTarget[] = ['all', 'kernel', 'gateway', 'mcp', 'worker', 'dashboard'];

interface RunOptions {
  dir: string;
  detach?: boolean;
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
 * `chdir`s into its own state root.
 */
async function runAll(dir: string, spec: StackSpec): Promise<Stoppable[]> {
  // Checked up front: the gateway boots last, and booting a Kernel and every
  // worker only to die on a taken port would leave the user to clean up state
  // for a failure that was knowable in the first millisecond.
  await assertGatewayPortFree(spec.spec.gateway.port);

  const kernel = await runKernel(dir);

  // Each worker avoids the ports its not-yet-booted neighbours asked for; the
  // ones already booted are detected as bound, so this covers the whole set.
  const declared = spec.spec.workers;
  const workers: Stoppable[] = [];
  for (const [i, w] of declared.entries()) {
    const reservedPorts = new Set(declared.slice(i + 1).flatMap(declaredMockPorts));
    const handle = await runWorker(dir, w, kernel, { reservedPorts });
    workers.push({ label: `worker ${w.name}`, stop: () => handle.stop() });
  }

  const gateway = await runGateway(dir, spec, kernel);
  process.stderr.write(`\n${theme.ok('Stack running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);

  // Reverse boot order: stop serving requests, then the workers behind them,
  // then the Kernel they were registered with.
  return [
    { label: 'gateway', stop: () => stopGateway(gateway) },
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

async function runTarget(
  target: RunTarget,
  name: string | undefined,
  dir: string,
  spec: StackSpec,
): Promise<Stoppable[]> {
  try {
    switch (target) {
      case 'all':
        return await runAll(dir, spec);

      case 'kernel': {
        const kernel = await runKernel(dir);
        process.stderr.write(`\n${theme.ok('Kernel running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: 'kernel', stop: () => kernel.stop() }];
      }

      case 'gateway': {
        const gateway = await runGateway(dir, spec);
        process.stderr.write(`\n${theme.ok('Gateway running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: 'gateway', stop: () => stopGateway(gateway) }];
      }

      case 'mcp': {
        const mcp = await runMcp(dir, spec);
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
        const handle = await runWorker(dir, worker);
        process.stderr.write(`\n${theme.ok('Worker running.')} ${theme.muted('Press Ctrl+C to stop.')}\n`);
        return [{ label: `worker ${worker.name}`, stop: () => handle.stop() }];
      }

      case 'dashboard': {
        const dashboardDir = findDashboardDir(dir);
        if (!dashboardDir) {
          die(
            `No dashboard app found under ${dir}. Scaffold one first: ${theme.cmd('mdk create dashboard')}`,
          );
        }
        const handle = await runDashboard(dashboardDir);
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
    .command('run [target] [name]')
    .description(
      'Start the stack from mdk.yaml. target: all | kernel | gateway | mcp | worker <name> | dashboard',
    )
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .option('--detach', 'Run in the background (not implemented yet)', false)
    .action(async (target: string | undefined, name: string | undefined, opts: RunOptions) => {
      if (opts.detach) {
        die('`--detach` is not implemented yet. Run in the foreground (omit --detach).');
      }

      if (target && !TARGETS.includes(target as RunTarget)) {
        die(`Unknown target "${target}". Use one of: ${TARGETS.join(' | ')}.`);
      }

      const spec = loadSpecOrDie(opts.dir);

      // No explicit target: boot everything together. Components can always be
      // run separately instead — `mdk run kernel` / `gateway` / `worker <name>`
      // — that choice is just which command(s) you type, not a spec setting.
      const resolved = (target as RunTarget | undefined) ?? 'all';

      const running = await runTarget(resolved, name, opts.dir, spec);

      // Registered only once everything is up: a boot that fails exits on its
      // own, and until then the default signal behavior is the right one.
      installShutdown(running);
    });
}
