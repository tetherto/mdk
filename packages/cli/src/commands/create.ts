import type { Command } from 'commander';
import { examples } from '../lib/help.js';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createDashboard, dashboardNameFromStack, defaultTemplateRef } from '../lib/dashboard.js';
import { NAME_RE } from '../lib/names.js';
import { createWorker } from '../lib/worker-scaffold.js';
import { deviceId, deviceSerial } from '../lib/spec.js';
import { createApp } from '../lib/app-scaffold.js';
import { grantLine } from '../lib/grant-report.js';
import { DIRS } from '../lib/project.js';
import { theme, tick, arrow } from '../lib/theme.js';

/**
 * Resolves the dashboard's package name and its location.
 *
 * With no name the app takes the canonical `apps/dashboard` path and a
 * `<stack>-dashboard` package name read from mdk.yaml — so the path never churns
 * when the stack is renamed. An explicit name gets its own `apps/<name>` slot,
 * which is how a project ends up with more than one dashboard.
 */
function resolveDashboard(
  explicit: string | undefined,
  parentDir: string,
): { name: string; subdir: string } | { error: string } | null {
  if (explicit) {
    const name = explicit.trim();
    if (!NAME_RE.test(name)) {
      return { error: `invalid dashboard name "${explicit}". Use lowercase letters, digits, '.', '_' or '-'.` };
    }
    return { name, subdir: join(DIRS.apps, name) };
  }

  const specPath = resolve(parentDir, 'mdk.yaml');
  if (!existsSync(specPath)) return null;
  let stack: string | undefined;
  try {
    const doc = parseYaml(readFileSync(specPath, 'utf8')) as { metadata?: { name?: unknown } };
    stack = typeof doc.metadata?.name === 'string' ? doc.metadata.name.trim() : undefined;
  } catch {
    return null;
  }
  if (!stack) return null;
  const name = dashboardNameFromStack(stack);
  if (!NAME_RE.test(name)) {
    return {
      error: `mdk.yaml metadata.name "${stack}" is not a valid name. Use lowercase letters, digits, '.', '_' or '-', or pass a dashboard name.`,
    };
  }
  return { name, subdir: DIRS.dashboard };
}

// Group B — Scaffold
export function registerCreate(program: Command): void {
  const create = program
    .command('create')
    .usage('<command> [options]')
    .summary('Scaffold a worker, app or dashboard')
    .description('Scaffold a new worker, app or dashboard from the bundled templates and register it in mdk.yaml.')
    .addHelpText(
      'after',
      examples('mdk create worker rig', 'mdk create app ops-center --org your-org', 'mdk create dashboard'),
    );

  create
    .command('worker')
    .argument('<name>', "Worker name: lowercase letters, digits, '.', '_' or '-'")
    .summary('Scaffold a Worker Plugin into workers/<name>')
    .description(
      'Scaffold a Worker Plugin (mdk-contract.json, handlers and a mock device) into <dir>/workers/<name>, ' +
        'link it into package.json and add it to mdk.yaml under spec.workers with a mock device.',
    )
    .option('--org <scope>', 'npm scope for the package name, e.g. your-org -> @your-org/<name>')
    .option('--dir <path>', 'Project directory', '.')
    .option('--force', 'Overwrite the target if it already exists', false)
    .option('--no-install', 'Skip `npm install`')
    .option('--no-stack-entry', 'Do not add the worker to mdk.yaml')
    .addHelpText('after', examples('mdk create worker rig', 'mdk create worker rig --org your-org --no-install'))
    .action(
      (
        name: string,
        opts: { org?: string; dir: string; force: boolean; install: boolean; stackEntry: boolean },
      ) => {
        const result = createWorker({
          name,
          parentDir: opts.dir,
          org: opts.org,
          force: opts.force,
          install: opts.install,
          updateStackFile: opts.stackEntry,
        });
        if (!result.ok) {
          process.stderr.write(`${theme.warn('error')}: ${result.message}\n`);
          if (result.detail) process.stderr.write(`${result.detail}\n`);
          process.exitCode = 1;
          return;
        }

        if (result.installWarning) {
          process.stderr.write(
            `${theme.warn('warning')}: ${result.installWarning} ` +
              `${theme.muted(`(run \`npm install\` in ${result.installDir})`)}\n`,
          );
        }

        let out =
          `${tick} Scaffolded worker ${theme.label(name)} ${arrow} ${theme.value(result.workerPath!)}\n` +
          `  ${theme.muted('package')} ${theme.value(result.packageName!)}\n`;

        // Report how mdk.yaml was touched, and fall back to the manual snippet
        // when it could not be updated automatically.
        const manualSnippet =
          `${theme.cmd(
            `    - name: ${name}\n` +
              `      package: ${result.relPackage}\n` +
              `      config:\n` +
              `        mock: true\n` +
              `        devices:\n` +
              `          - id: ${deviceId(name)}\n` +
              `            opts: { host: 127.0.0.1, port: ${result.mockPort}, serial: ${deviceSerial(name)} }`,
          )}\n`;

        switch (result.stackFile) {
          case 'added':
            out += `  ${tick} Added to ${theme.value('mdk.yaml')} under ${theme.key('spec.workers')}\n`;
            break;
          case 'exists':
            out += `  ${theme.muted(`spec.workers already has "${name}" in mdk.yaml — left unchanged`)}\n`;
            break;
          case 'name-taken':
            out += `  ${theme.warn('!')} spec.workers already has a worker named "${name}" with another package; mdk.yaml was not changed\n`;
            process.exitCode = 1;
            break;
          case 'no-file':
            out +=
              `\n${theme.warn('No mdk.yaml found')} in ${theme.value(opts.dir)}. Start a project with ${theme.cmd('mdk onboard')}, ` +
              `or add this under ${theme.key('spec.workers')} of an existing one:\n\n` +
              manualSnippet;
            break;
          case 'error':
            out +=
              `\n${theme.warn('Could not update mdk.yaml automatically')}. Add this under ${theme.key('spec.workers')}:\n\n` +
              manualSnippet;
            break;
          default:
            // --no-stack-entry
            out +=
              `\n${theme.muted('Add this to')} ${theme.value('mdk.yaml')} under ${theme.key('spec.workers')}:\n\n` +
              manualSnippet;
        }

        out +=
          `\n${theme.label('Next steps')}\n` +
          `  ${theme.muted('1.')} Customize ${theme.value('mdk-contract.json')}, ${theme.value('src/')} + ${theme.value('mock/server.js')} for your device.\n` +
          `  ${theme.muted('2.')} Run it: ${theme.cmd(`mdk run worker ${name}`)}\n`;

        process.stdout.write(out);
      },
    );

  create
    .command('app')
    .argument('<name>', "App name: lowercase letters, digits, '.', '_' or '-'")
    .summary(`Scaffold an app into ${DIRS.apps}/<name>`)
    .description(
      `Scaffold an app (mdk-app.yaml, plugin/ route table and controllers, and a starter UI built into ui/) ` +
        `into <dir>/${DIRS.apps}/<name>, link it into package.json and add it to mdk.yaml under spec.apps.`,
    )
    .option('--org <scope>', 'npm scope for the package name, e.g. your-org -> @your-org/<name>')
    .option('--dir <path>', 'Project directory', '.')
    .option('--force', 'Overwrite the target if it already exists', false)
    .option('--no-install', 'Skip `npm install` and building the starter UI')
    .option('--no-stack-entry', 'Do not add the app to mdk.yaml')
    .addHelpText('after', examples('mdk create app ops-center', 'mdk create app ops-center --org your-org'))
    .action(
      (
        name: string,
        opts: { org?: string; dir: string; force: boolean; install: boolean; stackEntry: boolean },
      ) => {
        const result = createApp({
          name,
          parentDir: opts.dir,
          org: opts.org,
          force: opts.force,
          install: opts.install,
          updateStackFile: opts.stackEntry,
        });
        if (!result.ok) {
          process.stderr.write(`${theme.warn('error')}: ${result.message}\n`);
          if (result.detail) process.stderr.write(`${result.detail}\n`);
          process.exitCode = 1;
          return;
        }

        if (result.installWarning) {
          process.stderr.write(
            `${theme.warn('warning')}: ${result.installWarning} ` +
              `${theme.muted(`(run \`npm install\` in ${result.installDir})`)}\n`,
          );
        }

        let out =
          `${tick} Scaffolded app ${theme.label(name)} ${arrow} ${theme.value(result.appPath!)}\n` +
          `  ${theme.muted('package')} ${theme.value(result.packageName!)}\n` +
          (result.uiBuilt
            ? `  ${tick} Built the starter UI ${arrow} ${theme.value('ui/index.js')} ${theme.muted('(source in ui-src/)')}\n`
            : `  ${theme.warn('!')} Starter UI not built: ${result.uiWarning}\n` +
              `    ${theme.muted('Build it yourself:')} ${theme.cmd(`cd ${result.appPath} && npm --prefix ui-src install && npm run build:ui`)}\n`);

        // Apps are referenced by package name (resolved via the `file:` link),
        // so the manual snippet uses the package name too.
        const manualSnippet =
          `${theme.cmd(`    - name: ${result.appName}\n      package: ${result.packageName}\n      config: {}`)}\n`;

        const grant = result.grant
          ? 'error' in result.grant
            ? `  ${theme.warn('note')}: not granted in ${theme.key('spec.rbac')} (${result.grant.error}); fix that, then run ${theme.cmd('mdk rbac init')}\n`
            : grantLine(result.grant)
          : '';
        switch (result.stackFile) {
          case 'added':
            out += `  ${tick} Added to ${theme.value('mdk.yaml')} under ${theme.key('spec.apps')}\n${grant}`;
            break;
          case 'exists':
            out += `  ${theme.muted(`spec.apps already lists "${result.packageName}" — left unchanged`)}\n${grant}`;
            break;
          case 'name-taken':
            out += `  ${theme.warn('!')} spec.apps already has an app named "${result.appName}" with another package; mdk.yaml was not changed\n`;
            process.exitCode = 1;
            break;
          case 'no-file':
            out +=
              `\n${theme.warn('No mdk.yaml found')} in ${theme.value(opts.dir)}. Start a project with ${theme.cmd('mdk onboard')}, ` +
              `or add this under ${theme.key('spec.apps')} of an existing one:\n\n` +
              manualSnippet;
            break;
          case 'error':
            out +=
              `\n${theme.warn('Could not update mdk.yaml automatically')}. Add this under ${theme.key('spec.apps')}:\n\n` +
              manualSnippet;
            break;
          default:
            // --no-stack-entry
            out +=
              `\n${theme.muted('Add this to')} ${theme.value('mdk.yaml')} under ${theme.key('spec.apps')}:\n\n` +
              manualSnippet;
        }

        out +=
          `\n${theme.label('Next steps')}\n` +
          `  ${theme.muted('1.')} Add routes in ${theme.value('plugin/mdk-plugin.json')} + ${theme.value('plugin/controllers/')}.\n` +
          `  ${theme.muted('2.')} Set ${theme.key('id')} and ${theme.key('permissions')} in ${theme.value('mdk-app.yaml')} (${theme.cmd('mdk rbac init')} updates ${theme.key('spec.rbac')} after a change), then check it: ${theme.cmd(`mdk validate app ${result.appName}`)}\n` +
          `  ${theme.muted('3.')} Run it: ${theme.cmd('mdk run')} ${theme.muted(`(or \`mdk run app ${result.appName}\` + \`mdk run gateway\`)`)}, then ${theme.cmd('mdk run dashboard')} to see its UI\n` +
          `  ${theme.muted('4.')} Edit the UI in ${theme.value('ui-src/')}; rebuild with ${theme.cmd('npm run build:ui')} (or ${theme.cmd('npm run dev:ui')} to rebuild on save).\n`;

        process.stdout.write(out);
      },
    );

  create
    .command('dashboard')
    .argument('[name]', `Dashboard name (default: <stack>-dashboard in ${DIRS.dashboard})`)
    .summary(`Scaffold the UI dashboard into ${DIRS.dashboard}`)
    .description(
      `Scaffold the MDK UI shell into <dir>/${DIRS.dashboard}, named <stack>-dashboard from mdk.yaml. ` +
        `With a name it goes to <dir>/${DIRS.apps}/<name> instead.`,
    )
    .option('--dir <path>', 'Project directory', '.')
    .option('--ref <git-ref>', 'Branch, tag or SHA to fetch the UI shell from', defaultTemplateRef())
    .option('--force', 'Overwrite the target if it already exists', false)
    .option('--no-install', 'Skip `npm install`')
    .addHelpText('after', examples('mdk create dashboard', 'mdk create dashboard ops-ui --ref v0.10.0'))
    .action(
      async (
        name: string | undefined,
        opts: { dir: string; ref: string; force: boolean; install: boolean },
      ) => {
        const app = resolveDashboard(name, opts.dir);
        if (!app) {
          process.stderr.write(
            'mdk create dashboard: pass a name, or run from a directory with mdk.yaml (uses <stack>-dashboard).\n',
          );
          process.exitCode = 1;
          return;
        }
        if ('error' in app) {
          process.stderr.write(`mdk create dashboard: ${app.error}\n`);
          process.exitCode = 1;
          return;
        }
        const result = await createDashboard({
          name: app.name,
          subdir: app.subdir,
          parentDir: opts.dir,
          ref: opts.ref,
          force: opts.force,
          install: opts.install,
        });
        if (result.ok) {
          if (result.installWarning) {
            process.stderr.write(
              `${theme.warn('warning')}: ${result.installWarning} ` +
                `${theme.muted(`(run \`npm install\` in ${result.appPath})`)}\n`,
            );
          }
          const from =
            result.source === 'monorepo' ? 'local monorepo template' : 'GitHub template';
          const out =
            `Scaffolded ${result.appPath} ${theme.muted(`(${from})`)}\n` +
            `\n${theme.label('Next steps')}\n` +
            `  ${theme.muted('1.')} Edit ${theme.value(`${result.appPath}/.env`)} if you need a different Gateway/OAuth URL.\n` +
            `  ${theme.muted('2.')} Run it: ${theme.cmd(`mdk run dashboard --dir ${opts.dir}`)}\n`;
          process.stdout.write(out);
          return;
        }
        process.stderr.write(`mdk create dashboard: ${result.message}\n`);
        if (result.detail) process.stderr.write(`${result.detail}\n`);
        process.exitCode = 1;
      },
    );
}
