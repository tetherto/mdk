import type { Command } from 'commander';
import { addPackage, type AddPackageResult, type PackageKind } from '../lib/add-package.js';
import { grantLine } from '../lib/grant-report.js';
import { examples } from '../lib/help.js';
import { theme, tick, arrow } from '../lib/theme.js';

interface AddOpts {
  dir: string;
  name?: string;
  install: boolean;
  acceptPermissions?: boolean;
  keepPermissions?: boolean;
}

function report(kind: PackageKind, result: AddPackageResult): void {
  if (!result.ok) {
    process.stderr.write(`${theme.warn('error')}: ${result.message}\n`);
    for (const error of result.errors ?? []) process.stderr.write(`  ${error}\n`);
    process.exitCode = 1;
    return;
  }

  const section = kind === 'app' ? 'spec.apps' : 'spec.workers';
  const stack =
    result.stackFile === 'added'
      ? `added under ${theme.key(section)}`
      : result.stackFile === 'exists'
        ? 'already listed (left as is)'
        : `could not be updated; add it under ${theme.key(section)} yourself`;

  let out =
    `${tick} ${result.stackFile === 'exists' ? 'Updated' : 'Added'} ${kind} ${theme.label(result.instanceName!)} ${arrow} ${theme.value(result.reference!)}\n` +
    (result.installed
      ? `  ${theme.muted('package.json')} dependency ${theme.value(result.packageName!)}\n`
      : `  ${theme.muted('package.json')} not changed (--no-install)\n`) +
    `  ${theme.muted('mdk.yaml')} ${stack}\n` +
    (result.grant ? grantLine(result.grant) : '') +
    (result.credential
      ? 'error' in result.credential
        ? `  ${theme.warn('note')}: no credential yet (${result.credential.error}); \`mdk run\` creates it\n`
        : `  ${theme.muted('credential')} ${theme.value(result.credential.file)} ${theme.muted(result.credential.created ? '(new, private to this instance)' : '(kept)')}\n`
      : '');
  if (result.grant?.written && result.grant.action !== 'none') {
    out += `  ${theme.muted('policy')} a running Kernel picks it up on ${theme.cmd('mdk rbac apply')} or its next start\n`;
  }
  if (result.needsDeviceOpts) {
    out += `  ${theme.warn('note')}: this worker has no mock; fill in ${theme.key('config.devices[].opts')} for your hardware.\n`;
  }
  out += `\n${theme.label('Next steps')}\n  ${theme.muted('1.')} Run it: ${theme.cmd('mdk run')} ${theme.muted(`(or \`mdk run ${kind} ${result.instanceName}\`)`)}\n`;
  process.stdout.write(out);
}

const SOURCE_HELP =
  'An npm package (@scope/pkg, pkg@1.2.3, @scope/pkg/<subdir>) or GitHub repo ' +
  '(github:owner/repo#ref, owner/repo, https://github.com/owner/repo).';

const EXAMPLES: Record<PackageKind, string[]> = {
  app: ['mdk add app @your-org/mdk-app-ops-center', 'mdk add app github:me/my-app#v0.2.0 --name ops'],
  worker: ['mdk add worker @your-org/mdk-worker-rig@^1', 'mdk add worker https://github.com/me/rig-worker'],
};

function register(add: Command, kind: PackageKind): void {
  const section = kind === 'app' ? 'spec.apps' : 'spec.workers';
  const cmd = add
    .command(kind)
    .argument('<source>', SOURCE_HELP)
    .summary(`Install ${kind === 'app' ? 'an app' : 'a worker'} from npm or GitHub`)
    .description(
      `Install ${kind === 'app' ? 'an app' : 'a worker'} from npm or GitHub (npm records it in package.json), ` +
        `check it with the same rules as \`mdk validate ${kind}\`, then add it to mdk.yaml under ${section}. ` +
        'Install scripts do not run, and the exact version is recorded. A refused package leaves mdk.yaml and package.json unchanged.' +
        (kind === 'app'
          ? ' The app runs as service account app:<name>; install writes a role in spec.rbac granting it exactly the Kernel access its mdk-app.yaml requests.'
          : ''),
    )
    .option('--dir <path>', 'Project directory (the one holding mdk.yaml)', '.')
    .option('--name <name>', `Name for the ${kind} in mdk.yaml (default: derived from the package name)`)
    .option('--no-install', 'Skip `npm install`: the npm package must already be installed (not for GitHub sources)');
  if (kind === 'app') {
    cmd
      .option('--accept-permissions', "If the app's requested Kernel access changed, replace its role in spec.rbac with the new request")
      .option('--keep-permissions', "If the app's requested Kernel access changed, keep its role in spec.rbac as it is");
  }
  cmd
    .addHelpText('after', examples(...EXAMPLES[kind]))
    .action((source: string, opts: AddOpts) =>
      report(
        kind,
        addPackage({
          kind,
          source,
          dir: opts.dir,
          name: opts.name,
          install: opts.install,
          ...(kind === 'app' ? { acceptPermissions: opts.acceptPermissions, keepPermissions: opts.keepPermissions } : {}),
        }),
      ),
    );
}

// Group B — Add
export function registerAdd(program: Command): void {
  const add = program
    .command('add')
    .usage('<command> [options]')
    .summary('Install an app or worker from npm or GitHub')
    .description('Install an app or worker from npm or GitHub and add it to package.json and mdk.yaml.')
    .addHelpText('after', examples(...EXAMPLES.app.slice(0, 1), ...EXAMPLES.worker.slice(0, 1)));
  register(add, 'app');
  register(add, 'worker');
}
