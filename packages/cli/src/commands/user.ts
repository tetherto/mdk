import type { Command } from 'commander';
import { isCancel, password as promptPassword } from '@clack/prompts';
import { stringify as toYaml } from 'yaml';
import { examples } from '../lib/help.js';
import { addUser, listUsers, removeUser, setDisabled, setPassword, type Outcome } from '../lib/identity-kernel.js';
import { theme, tick } from '../lib/theme.js';

/**
 * Where a password comes from: stdin with --password-stdin (scripts), else an
 * interactive prompt typed twice. Never a flag value, which would land in shell
 * history and the process list.
 */
export async function readPassword(fromStdin: boolean, stdin: NodeJS.ReadableStream = process.stdin, interactive = !!process.stdin.isTTY): Promise<string> {
  if (fromStdin) {
    let data = '';
    for await (const chunk of stdin) data += String(chunk);
    return data.replace(/\r?\n$/, '');
  }
  if (!interactive) throw new Error('No terminal to prompt for a password: pipe it in with --password-stdin.');
  const first = await promptPassword({ message: 'Password' });
  if (isCancel(first)) throw new Error('Cancelled.');
  const again = await promptPassword({ message: 'Password again' });
  if (isCancel(again)) throw new Error('Cancelled.');
  if (first !== again) throw new Error('The passwords do not match.');
  return first;
}

function fail(message: string, errors: string[] = []): void {
  process.stderr.write(`${theme.warn('error')}: ${message}\n${errors.map((e) => `  ${e}\n`).join('')}`);
  process.exitCode = 1;
}

/** Prints a failed outcome and returns true, or returns false. */
function failedOutcome(res: Outcome<unknown>): boolean {
  if (res.ok) return false;
  fail(res.message ?? 'failed', res.errors);
  return true;
}

async function guarded(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

const collect = (value: string, previous: string[] = []): string[] => [...previous, value];

// Group C — Run & manage
export function registerUser(program: Command): void {
  const user = program
    .command('user')
    .usage('<command> [options]')
    .summary('Manage the users who sign in to the stack')
    .description(
      "Users live in the Kernel's token issuer, so these commands need the Kernel running (`mdk run`). What a user " +
        'may do is set by spec.rbac bindings in mdk.yaml; `--admin` writes the first one.',
    )
    .addHelpText('after', examples('mdk user add ankit@example.com --admin', 'echo "$PW" | mdk user add ci-bot --password-stdin --group ops-team', 'mdk user list -o json'));

  user
    .command('add')
    .argument('<name>', 'User name (an email works), the `sub` of their tokens')
    .summary('Create or update a user and set their password')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .option('--email <email>', 'Email, also matched by User bindings')
    .option('--group <group>', 'Group, matched by Group bindings (repeatable; replaces the current groups)', collect)
    .option('--admin', 'Bind the user to the admin role in spec.rbac (written if missing) and apply it')
    .option('--no-password', 'Create the user without a password (they cannot sign in until `mdk user passwd`)')
    .option('--password-stdin', 'Read the password from stdin')
    .action((name: string, o: { dir: string; email?: string; group?: string[]; admin?: boolean; password: boolean; passwordStdin?: boolean }) =>
      guarded(async () => {
        const pw = o.password ? await readPassword(!!o.passwordStdin) : undefined;
        const res = await addUser(o.dir, { name, email: o.email, groups: o.group, password: pw, admin: o.admin });
        if (res.value) {
          const { created, binding, applied } = res.value;
          process.stdout.write(`${tick} ${created ? 'Created' : 'Updated'} user ${theme.label(name)}\n`);
          if (binding) {
            if (binding.roleCreated) process.stdout.write(`  ${theme.muted('mdk.yaml')} added role ${theme.key('admin')} (resources ["*"], verbs ["*"])\n`);
            process.stdout.write(`  ${theme.muted('mdk.yaml')} ${binding.bound ? 'bound' : 'already bound'} ${theme.label(name)} to ${theme.key('admin')}\n`);
          }
          if (applied?.ok) process.stdout.write(`  ${theme.muted('policy')} the Kernel enforces ${theme.value(applied.local.version)}\n`);
        }
        failedOutcome(res);
      }),
    );

  user
    .command('passwd')
    .argument('<name>')
    .summary("Set a user's password (ends their sessions)")
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .option('--password-stdin', 'Read the password from stdin')
    .action((name: string, o: { dir: string; passwordStdin?: boolean }) =>
      guarded(async () => {
        const res = await setPassword(o.dir, name, await readPassword(!!o.passwordStdin));
        if (!failedOutcome(res)) process.stdout.write(`${tick} Password set for ${theme.label(name)}; their sessions ended\n`);
      }),
    );

  for (const [cmd, disabled] of [['disable', true], ['enable', false]] as const) {
    user
      .command(cmd)
      .argument('<name>')
      .summary(disabled ? 'Stop a user signing in (ends their sessions)' : 'Let a disabled user sign in again')
      .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
      .action((name: string, o: { dir: string }) =>
        guarded(async () => {
          const res = await setDisabled(o.dir, name, disabled);
          if (!failedOutcome(res)) process.stdout.write(`${tick} ${disabled ? 'Disabled' : 'Enabled'} ${theme.label(name)}\n`);
        }),
      );
  }

  user
    .command('remove')
    .argument('<name>')
    .summary('Delete a user (their bindings in spec.rbac stay until you remove them)')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((name: string, o: { dir: string }) =>
      guarded(async () => {
        const res = await removeUser(o.dir, name);
        if (failedOutcome(res)) return;
        if (res.value?.deleted) process.stdout.write(`${tick} Removed user ${theme.label(name)}\n`);
        else fail(`No user named "${name}".`);
      }),
    );

  user
    .command('list')
    .summary('List users')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((o: { dir: string }, cmd: Command) =>
      guarded(async () => {
        const res = await listUsers(o.dir);
        if (failedOutcome(res)) return;
        const users = res.value!.users;
        const output = String(cmd.optsWithGlobals().output ?? 'table');
        if (output === 'json') return void process.stdout.write(`${JSON.stringify(users, null, 2)}\n`);
        if (output === 'yaml') return void process.stdout.write(toYaml(users));
        if (!users.length) return void process.stdout.write(`No users. Create the first with ${theme.cmd('mdk user add <name> --admin')}\n`);
        for (const u of users) {
          const flags = [u.disabled ? theme.warn('disabled') : '', u.hasPassword ? '' : theme.warn('no password')].filter(Boolean).join(' ');
          process.stdout.write(`  ${u.name}${u.email ? ` ${theme.muted(`<${u.email}>`)}` : ''}${u.groups.length ? ` ${theme.muted(`[${u.groups.join(', ')}]`)}` : ''} ${flags}\n`);
        }
      }),
    );
}
