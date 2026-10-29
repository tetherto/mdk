import type { Command } from 'commander';
import { stringify as toYaml } from 'yaml';
import { examples } from '../lib/help.js';
import { login, logout, whoami } from '../lib/session-kernel.js';
import { theme, tick } from '../lib/theme.js';
import { readPassword } from './user.js';

function fail(message: string): void {
  process.stderr.write(`${theme.warn('error')}: ${message}\n`);
  process.exitCode = 1;
}

// Group C — Run & manage
export function registerSession(program: Command): void {
  program
    .command('login')
    .argument('<username>', 'Your user name (an email works)')
    .summary('Sign in, so the CLI acts as you')
    .description(
      "Sign in to the Kernel's token issuer. The session is kept for this project in .mdk/session.json (0600) and renewed " +
        'as it is used; while it lasts, `mdk status`, `mdk user`, `mdk sa` and `mdk rbac` act as you, with what spec.rbac binds you to. ' +
        'Without a session the CLI acts as its own service account, mdk-cli.',
    )
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .option('--password-stdin', 'Read the password from stdin')
    .addHelpText('after', examples('mdk login ankit@example.com', 'echo "$PW" | mdk login ci-bot --password-stdin'))
    .action(async (username: string, o: { dir: string; passwordStdin?: boolean }) => {
      try {
        const res = await login(o.dir, username, await readPassword(!!o.passwordStdin));
        if (!res.ok) return fail(res.message ?? 'sign-in failed');
        process.stdout.write(`${tick} Signed in as ${theme.label(username)} ${theme.muted(`(until ${new Date(res.expiresAt!).toISOString()})`)}\n`);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    });

  program
    .command('logout')
    .summary('End your session; the CLI acts as mdk-cli again')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action(async (o: { dir: string }) => {
      const res = await logout(o.dir);
      if (!res.hadSession) return void process.stdout.write('Not signed in.\n');
      process.stdout.write(
        res.revoked
          ? `${tick} Signed out\n`
          : `${tick} Signed out here ${theme.muted(`(the Kernel was not told: ${res.message ?? 'no answer'}; the session expires on its own)`)}\n`,
      );
    });

  program
    .command('whoami')
    .summary('Show who the CLI acts as')
    .option('-d, --dir <path>', 'Project directory containing mdk.yaml', '.')
    .action((o: { dir: string }, cmd: Command) => {
      let me;
      try {
        me = whoami(o.dir);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
      const output = String(cmd.optsWithGlobals().output ?? 'table');
      if (output === 'json') return void process.stdout.write(`${JSON.stringify(me, null, 2)}\n`);
      if (output === 'yaml') return void process.stdout.write(toYaml(me));
      if (me.as === 'serviceaccount') {
        return void process.stdout.write(`${theme.label(me.sub)} ${theme.muted('(service account; `mdk login` to act as a user)')}\n`);
      }
      process.stdout.write(
        `${theme.label(me.sub)}${me.email ? ` ${theme.muted(`<${me.email}>`)}` : ''}${me.groups?.length ? ` ${theme.muted(`[${me.groups.join(', ')}]`)}` : ''}` +
          ` ${theme.muted(`until ${new Date(me.sessionExpiresAt!).toISOString()}`)}\n`,
      );
    });
}
