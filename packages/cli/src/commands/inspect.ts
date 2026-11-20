import type { Command } from 'commander';
import { examples } from '../lib/help.js';
import { stringify as toYaml } from 'yaml';
import { collectStatus, type AppReport, type StatusReport, type WorkerReport } from '../lib/status.js';
import { STACK_FILE } from '../lib/spec.js';
import { theme, tick } from '../lib/theme.js';
import { failureText } from '../lib/flags.js';

// Group C — Run & manage (read-only inspection commands)
const OUTPUT_FORMATS = ['table', 'json', 'yaml'];

/** Green when healthy, yellow otherwise — the same convention across sections. */
function flag(ok: boolean, label: string): string {
  return ok ? theme.ok(label) : theme.warn(label);
}

/**
 * Renders a probe failure for humans. Bare error codes (`ERR_MDK_STATUS_TIMEOUT`,
 * `CHANNEL_CLOSED: channel closed`) mean nothing on their own, so they get a
 * plain-English lead-in; anything already written as prose is shown as-is. The
 * untouched value stays in `-o json` for scripts.
 */
function humanError(error: string | null): string | null {
  if (!error) return null;
  const first = error.split('\n')[0] ?? '';
  const code = (first.split(':')[0] ?? '').trim();
  return /^[A-Z][A-Z0-9_]*$/.test(code) ? `unreachable (${code})` : first;
}

/**
 * Left-aligned columns padded to the widest cell, with an optional header row.
 * Padding counts raw string length, so only the last column may carry color.
 */
function columns(headers: string[] | null, rows: string[][]): string {
  const count = Math.max(headers?.length ?? 0, ...rows.map((r) => r.length));
  const widths = Array.from({ length: count }, (_, i) =>
    Math.max(headers?.[i]?.length ?? 0, ...rows.map((r) => (r[i] ?? '').length)),
  );
  const line = (cells: string[]): string =>
    cells
      .map((c, i) => (i === count - 1 ? c : c.padEnd(widths[i] ?? 0)))
      .join('  ')
      .trimEnd();

  const body = rows.map((r) => `  ${line(r)}`);
  return headers ? [`  ${theme.muted(line(headers))}`, ...body].join('\n') : body.join('\n');
}

function workerRows(items: WorkerReport[], checked: boolean): string[][] {
  return items.map((w) => [
    w.name,
    !checked ? '-' : w.registered ? 'yes' : 'no',
    w.state ?? '-',
    w.health ?? '-',
    String(w.devices),
    w.declared ? '' : 'not in spec',
  ]);
}

function appRows(items: AppReport[]): string[][] {
  return items.map((a) => [
    a.name,
    a.running ? 'yes' : 'no',
    a.pid === null ? '-' : String(a.pid),
    a.version ?? '-',
    a.mount,
    a.package,
  ]);
}

/** Human-readable report: environment first, then the running stack. */
function renderTable(report: StatusReport): string {
  const { environment: env, stack } = report;
  const out: string[] = [];

  const title = [
    theme.brand('MDK status'),
    env.spec.stack ? theme.value(env.spec.stack) : theme.muted('(no stack)'),
  ]
    .filter(Boolean)
    .join('  ');
  // The project path goes on its own line so it cannot stretch the table below.
  out.push('', title, theme.muted(report.project), '');

  out.push(theme.label('Environment'));
  out.push(
    columns(null, [
      [
        'Node',
        `v${env.node.version}`,
        flag(env.node.ok, env.node.ok ? 'ok' : `need ${env.node.required}`),
      ],
      ['Package manager', env.packageManager, ''],
      [
        'Spec',
        STACK_FILE,
        env.spec.valid ? theme.ok('ok') : theme.warn(env.spec.found ? 'invalid' : 'missing'),
      ],
      [
        'Dependencies',
        `${env.dependencies.checked} declared`,
        flag(
          env.dependencies.ok,
          env.dependencies.ok ? 'ok' : `${env.dependencies.missing.length} not installed`,
        ),
      ],
    ]),
  );
  if (env.spec.error) {
    for (const line of env.spec.error.split('\n')) out.push(theme.muted(`    ${line}`));
  }
  for (const pkg of env.dependencies.missing) {
    out.push(theme.muted(`    not installed: ${pkg}`));
  }

  // Only the trailing cell is colored, so the columns stay aligned.
  const detail = (component: { state: string; error: string | null }, upDetail: string): string => {
    const note =
      component.state === 'up' ? upDetail : humanError(component.error) ?? 'not running';
    return `${flag(component.state === 'up', component.state.padEnd(4))}  ${theme.muted(note)}`;
  };

  // A Kernel that is up but refused the CLI's session or permission: say why under its row.
  const refusal = stack.kernel.refused ? [['', theme.warn(stack.kernel.error ?? '')]] : [];
  const workersUnchecked = !stack.workers.checked && stack.kernel.state === 'up';

  out.push('', theme.label('Stack'));
  out.push(
    columns(null, [
      ['Kernel', detail(stack.kernel, stack.kernel.key?.slice(0, 16) ?? '')],
      ...refusal,
      ['Gateway', detail(stack.gateway, stack.gateway.url ?? '')],
      [
        'Workers',
        workersUnchecked
          ? theme.warn('not checked')
          : `${stack.workers.registered}/${stack.workers.declared} registered  ` +
            theme.muted(
              `${stack.workers.totalDevices} device${stack.workers.totalDevices === 1 ? '' : 's'}`,
            ),
      ],
      ['Apps', `${stack.apps.running}/${stack.apps.declared} running`],
    ]),
  );

  if (stack.workers.items.length) {
    out.push(
      '',
      columns(
        ['WORKER', 'REGISTERED', 'STATE', 'HEALTH', 'DEVICES', ''],
        workerRows(stack.workers.items, !workersUnchecked),
      ),
    );
  }
  if (stack.apps.items.length) {
    out.push('', columns(['APP', 'RUNNING', 'PID', 'VERSION', 'MOUNT', 'PACKAGE'], appRows(stack.apps.items)));
  }

  const health =
    report.health === 'healthy'
      ? theme.ok('healthy')
      : report.health === 'degraded'
        ? theme.warn('degraded')
        : theme.warn('down');
  out.push('', `${report.ok ? tick : theme.warn('!')} Health: ${health}`, '');

  return out.join('\n');
}

/**
 * Exit codes are part of the CLI contract (see the HLD §3.3):
 *   4 — precondition not met (old Node, missing/invalid spec, packages not installed)
 *   5 — stack not fully up (Kernel/Gateway unreachable, a declared worker is
 *       not registered/serving, or a declared app is not running)
 */
function exitCodeFor(report: StatusReport): number {
  const env = report.environment;
  if (!env.node.ok || !env.spec.valid || !env.dependencies.ok) return 4;
  return report.health === 'healthy' ? 0 : 5;
}

export function registerStatus(program: Command): void {
  program
    .command('status')
    .summary('Check the environment and every component')
    .description(
      'One-shot check of the environment and every component (Kernel, Gateway, workers and their device ' +
        'counts, apps). Starts, stops and repairs nothing; its only write is the CLI key it publishes to ' +
        '.mdk/trusted-keys so the Kernel answers it. Use the global -o json | yaml for machine-readable output.',
    )
    .addHelpText('after', examples('mdk status', 'mdk status -o json'))
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action(async (options: { dir: string }, cmd: Command) => {
      const output = String(cmd.optsWithGlobals().output ?? 'table');
      if (!OUTPUT_FORMATS.includes(output)) {
        process.stderr.write(
          `${theme.warn('error')}: unknown --output "${output}". Use one of: ${OUTPUT_FORMATS.join(' | ')}.\n`,
        );
        process.exit(2);
      }

      let report: StatusReport;
      try {
        report = await collectStatus(options.dir);
      } catch (error) {
        process.stderr.write(
          `${theme.warn('error')}: ${failureText(error)}\n`,
        );
        process.exit(1);
      }

      if (output === 'json') process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      else if (output === 'yaml') process.stdout.write(toYaml(report));
      else process.stdout.write(`${renderTable(report)}\n`);

      process.exitCode = exitCodeFor(report);
    });
}
