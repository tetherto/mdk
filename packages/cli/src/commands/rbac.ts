import type { Command } from 'commander';
import { stringify as toYaml } from 'yaml';
import { examples } from '../lib/help.js';
import { applyStackRbac, showStackRbac, type RbacApplyResult, type RbacShowResult } from '../lib/rbac-kernel.js';
import { initPolicy, type InitResult } from '../lib/rbac-init.js';
import { StackSpecError } from '../lib/spec.js';
import { theme, tick, arrow } from '../lib/theme.js';

const OUTPUT_FORMATS = ['table', 'json', 'yaml'];

function outputFormat(cmd: Command): string {
  const output = String(cmd.optsWithGlobals().output ?? 'table');
  if (!OUTPUT_FORMATS.includes(output)) {
    process.stderr.write(`${theme.warn('error')}: unknown --output "${output}". Use one of: ${OUTPUT_FORMATS.join(' | ')}.\n`);
    process.exit(2);
  }
  return output;
}

/** Runs a subcommand: spec errors (an invalid spec.rbac lists every problem) exit 1. */
async function run<T>(cmd: Command, collect: () => Promise<T>, render: (value: T) => string, ok: (value: T) => boolean): Promise<void> {
  const output = outputFormat(cmd);
  let value: T;
  try {
    value = await collect();
  } catch (error) {
    if (!(error instanceof StackSpecError)) throw error;
    process.stderr.write(`${theme.warn('error')}: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  if (output === 'json') process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  else if (output === 'yaml') process.stdout.write(toYaml(value));
  else process.stdout.write(render(value));
  if (!ok(value)) process.exitCode = 1;
}

const policy = (p: RbacApplyResult['local']): string =>
  `${theme.value(p.version)} ${theme.muted(`(${p.roles} roles, ${p.bindings} bindings)`)}`;

function renderApply(r: RbacApplyResult): string {
  if (!r.ok) {
    return `${theme.warn('error')}: ${r.message}\n` + (r.errors ?? []).map((e) => `  ${e}\n`).join('');
  }
  if (!r.changed) return `${tick} The Kernel already enforces spec.rbac ${policy(r.local)}\n`;
  return `${tick} Applied spec.rbac ${theme.muted(r.previous ?? 'none')} ${arrow} ${policy(r.local)}\n`;
}

function renderShow(r: RbacShowResult): string {
  const lines = [`  ${theme.muted('mdk.yaml')}  ${policy(r.local)}`];
  if (r.kernel === 'down') lines.push(`  ${theme.muted('kernel')}    ${theme.warn('down')} ${theme.muted(r.message ?? '')}`);
  else if (!r.applied) lines.push(`  ${theme.muted('kernel')}    ${r.message ? theme.warn(r.message) : 'no policy applied (denies everything)'}`);
  else {
    lines.push(
      `  ${theme.muted('kernel')}    ${theme.value(r.applied.version)} ${theme.muted(`applied ${r.applied.appliedAt} by ${r.applied.source}`)}`,
    );
  }
  if (r.kernel === 'up') {
    lines.push(r.inSync ? `${tick} in sync` : `${theme.warn('differs')}: run ${theme.cmd('mdk rbac apply')} to enforce mdk.yaml`);
  }
  return `${lines.join('\n')}\n`;
}

function renderInit(r: InitResult): string {
  const lines: string[] = [];
  if (r.cli.roleCreated) lines.push(`  ${theme.muted('mdk.yaml')} added role ${theme.key('admin')} (resources ["*"], verbs ["*"])`);
  lines.push(`  ${theme.muted('mdk.yaml')} ${r.cli.bound ? 'bound' : 'already bound'} ${theme.label('mdk-cli')} to ${theme.key('admin')}`);
  lines.push(`  ${theme.muted('mdk.yaml')} ${r.gateway.bound ? 'bound' : 'already bound'} ${theme.label('mdk-gateway')} to ${theme.key('gateway')} (policy: read)`);
  lines.push(`  ${theme.muted('mdk.yaml')} ${r.mcp.bound ? 'bound' : 'already bound'} ${theme.label('mdk-mcp')} to ${theme.key('gateway')} (policy: read)`);
  for (const a of r.apps) {
    const what =
      a.action === 'add' ? 'granted its requested Kernel access'
        : a.action === 'none' ? 'requests no Kernel access'
          : a.action === 'error' || a.action === 'conflict' ? theme.warn(a.message ?? a.action)
            : 'grant already in place';
    lines.push(`  ${theme.muted('app')} ${theme.label(a.app)} ${what}`);
  }
  lines.push(
    r.applied.ok
      ? `${tick} The Kernel enforces ${theme.value(r.applied.local.version)}`
      : r.applied.kernel === 'down'
        ? `  ${theme.muted('policy')} ${r.applied.message}`
        : `  ${theme.muted('policy')} ${r.applied.message}. Restart the Kernel (\`mdk run\`) and it applies mdk.yaml at boot.`,
  );
  return `${lines.join('\n')}\n`;
}

// Group C — Run & manage
export function registerRbac(program: Command): void {
  const rbac = program
    .command('rbac')
    .usage('<command> [options]')
    .summary('Apply and inspect the stack\'s access policy (spec.rbac)')
    .description(
      'spec.rbac in mdk.yaml is the only place policy is written. The Kernel applies it at every start; ' +
        '`apply` hands an edited policy to a running Kernel, and `show` compares the two. No matching rule means denied.',
    )
    .addHelpText('after', examples('mdk rbac apply', 'mdk rbac show -o json'));

  rbac
    .command('init')
    .summary('Bind the CLI to admin and grant every app its requested Kernel access')
    .description(
      'Writes ordinary roles and bindings into spec.rbac: the CLI\'s account (mdk-cli) bound to an admin role holding ' +
        'wildcards, and each app\'s grant from its mdk-app.yaml, as `mdk add app` writes it. A role you changed is left alone. ' +
        'Then applies the policy to a running Kernel; if that Kernel refuses, it applies mdk.yaml when it next starts.',
    )
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((options: { dir: string }, cmd: Command) =>
      run(cmd, () => initPolicy(options.dir), renderInit, (r) => r.apps.every((a) => a.action !== 'error')),
    );

  rbac
    .command('apply')
    .summary('Validate spec.rbac and apply it to the running Kernel')
    .description(
      'Validate spec.rbac in mdk.yaml (every problem is listed) and apply it to the running Kernel, which switches ' +
        'to it at once. A refused policy leaves the one in force untouched.',
    )
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((options: { dir: string }, cmd: Command) =>
      run(cmd, () => applyStackRbac(options.dir), renderApply, (r) => r.ok),
    );

  rbac
    .command('show')
    .summary('Compare spec.rbac with the policy the Kernel enforces')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((options: { dir: string }, cmd: Command) =>
      run(cmd, () => showStackRbac(options.dir), renderShow, (r) => r.kernel === 'up'),
    );
}
