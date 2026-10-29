import type { Command } from 'commander';
import { stringify as toYaml } from 'yaml';
import { examples } from '../lib/help.js';
import { addAgent, listAccounts, removeAgent, rotateAccount, serviceAccountToken, type AccountChange } from '../lib/identity-kernel.js';
import { theme, tick } from '../lib/theme.js';

function fail(message: string): void {
  process.stderr.write(`${theme.warn('error')}: ${message}\n`);
  process.exitCode = 1;
}

async function guarded(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function registration(change: AccountChange): string {
  return change.registered
    ? `  ${theme.muted('kernel')} registered\n`
    : `  ${theme.warn('note')}: ${change.message}\n`;
}

// Group C — Run & manage
export function registerSa(program: Command): void {
  const sa = program
    .command('serviceaccount')
    .alias('sa')
    .usage('<command> [options]')
    .summary('Manage service accounts: apps and AI agents')
    .description(
      'A service account signs in with its own key: app:<name> for each app (created by `mdk add app`) and a ' +
        'named account per AI agent. The private key stays in this instance (.mdk/credentials) and never ships in a package; ' +
        'the Kernel registers the public keys at every start. What an account may do is set by spec.rbac bindings.',
    )
    .addHelpText('after', examples('mdk sa add operator-agent', 'mdk sa rotate app:ops-center', 'mdk sa list -o json'));

  sa.command('add')
    .argument('<name>', 'Agent name: lowercase letters, digits and dashes')
    .summary('Create a credential for an AI agent')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((name: string, o: { dir: string }) =>
      guarded(async () => {
        const change = await addAgent(o.dir, name);
        process.stdout.write(
          `${tick} Created service account ${theme.label(name)}\n` +
            `  ${theme.muted('credential')} ${theme.value(change.credential!.file)} ${theme.muted('(private to this instance)')}\n` +
            registration(change) +
            `  ${theme.muted('next')} bind it to a role in spec.rbac: ${theme.cmd(`{ kind: ServiceAccount, name: ${name} }`)}\n`,
        );
      }),
    );

  sa.command('rotate')
    .argument('<name>', 'app:<app> or an agent name')
    .summary('Replace a credential with a new key (ends the old key\'s sessions)')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((name: string, o: { dir: string }) =>
      guarded(async () => {
        const change = await rotateAccount(o.dir, name);
        process.stdout.write(`${tick} Rotated ${theme.label(name)}\n${registration(change)}`);
      }),
    );

  sa.command('remove')
    .argument('<name>', 'Agent name')
    .summary("Delete an agent's credential and registration")
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((name: string, o: { dir: string }) =>
      guarded(async () => {
        const change = await removeAgent(o.dir, name);
        if (!change.removed && !change.registered) return fail(`No service account named "${name}".`);
        process.stdout.write(`${tick} Removed ${theme.label(name)}\n${registration(change)}`);
      }),
    );

  sa.command('token')
    .argument('<name>', 'An agent (or app:<app>) with a credential here')
    .summary('Print a short-lived access token for a service account')
    .description(
      'Sign in as the service account with its own key and print its access token, for an HTTP client such as an MCP ' +
        'client (`Authorization: Bearer <token>`). It lasts minutes; a long-running agent signs in itself (ServiceAccountTokenSource ' +
        'with gatewayTokenRequest from @tetherto/mdk-identity). `-o json` prints the refresh token too.',
    )
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((name: string, o: { dir: string }, cmd: Command) =>
      guarded(async () => {
        const res = await serviceAccountToken(o.dir, name);
        if (!res.ok) return fail(res.message ?? 'sign-in failed');
        const output = String(cmd.optsWithGlobals().output ?? 'table');
        if (output === 'json') return void process.stdout.write(`${JSON.stringify(res.value, null, 2)}\n`);
        if (output === 'yaml') return void process.stdout.write(toYaml(res.value));
        process.stdout.write(`${res.value!.accessToken}\n`);
        process.stderr.write(`${theme.muted(`expires in ${res.value!.expiresIn}s`)}\n`);
      }),
    );

  sa.command('list')
    .summary('List service accounts, here and in the running Kernel')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((o: { dir: string }, cmd: Command) =>
      guarded(async () => {
        const res = await listAccounts(o.dir);
        const output = String(cmd.optsWithGlobals().output ?? 'table');
        if (output === 'json') return void process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
        if (output === 'yaml') return void process.stdout.write(toYaml(res));
        if (!res.rows.length) process.stdout.write('No service accounts.\n');
        for (const r of res.rows) {
          const state =
            r.registered === null ? '' : r.registered ? (r.stale ? theme.warn('key differs; restart or rotate') : theme.ok('registered')) : theme.warn('not registered');
          process.stdout.write(`  ${r.name.padEnd(28)} ${r.kind.padEnd(6)} ${r.local ? 'local' : theme.warn('no local credential')}  ${state}\n`);
        }
        if (res.kernel === 'down') process.stdout.write(`  ${theme.muted(`kernel down: ${res.message ?? ''}`)}\n`);
      }),
    );
}
