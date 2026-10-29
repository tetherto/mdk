import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLI, agentAuth, cliRunner, env, freePort, grantE2eAccess, npm, projectDir, waitFor as waitUntil, type Running } from './helpers.js';

// The backend and the UI scaffolded by the one CLI, then used together: a worker and an app (with
// its starter UI built), the dashboard from the local UI shell template, `mdk run dashboard` serving
// the app's UI, and the dashboard reaching the running stack through its Gateway proxy.
//
// The dashboard and the starter UI link the MDK UI packages from this checkout, so `ui/` must be
// built first (`npm --prefix ui ci && npm --prefix ui run build`). Their other dependencies come from
// the npm registry.

const PROJECT = projectDir('e2e-scaffold');
const run = cliRunner(PROJECT);
const mdk = (...args: string[]) => run(args);
// npm installs and Vite builds: the limit for each of those commands, and for the test running it.
const INSTALL_TIMEOUT = 300_000;

const stripAnsi = (text: string): string => text.replace(/\u001b\[[0-9;]*m/g, '');

const running: Running[] = [];

const waitFor = (condition: () => boolean | Promise<boolean>, what: string) =>
  waitUntil(condition, what, () => running.map((r) => r.output()).join('\n---\n'));

/**
 * Starts `mdk run <args>` in its own process group: `mdk run dashboard` runs npm, which runs Vite, so
 * stopping only the CLI could leave the dev server behind.
 */
function start(...args: string[]): Running {
  const proc = spawn(process.execPath, [...CLI, 'run', ...args], { cwd: PROJECT, env, detached: true });
  let out = '';
  for (const stream of [proc.stdout, proc.stderr]) stream?.on('data', (chunk) => (out += chunk));
  const handle = { proc, output: () => stripAnsi(out) };
  running.push(handle);
  return handle;
}

async function stop({ proc }: Running): Promise<void> {
  if (proc.exitCode !== null || proc.signalCode !== null || proc.pid === undefined) return;
  const exited = new Promise((resolveExit) => proc.once('exit', resolveExit));
  const signalGroup = (signal: NodeJS.Signals) => {
    try {
      process.kill(-proc.pid!, signal);
    } catch {
      // The group is already gone.
    }
  };
  signalGroup('SIGINT');
  await Promise.race([exited, new Promise((r) => setTimeout(r, 8000))]);
  signalGroup('SIGKILL');
}

let gatewayPort = 0;
let dashboardUrl = '';

beforeAll(async () => {
  rmSync(PROJECT, { recursive: true, force: true });
  mkdirSync(PROJECT, { recursive: true });
  gatewayPort = await freePort();
  writeFileSync(
    join(PROJECT, 'mdk.yaml'),
    [
      'apiVersion: mdk/v1',
      'kind: Stack',
      'metadata:',
      '  name: e2e',
      'spec:',
      `  kernel: { port: ${await freePort()} }`,
      `  gateway: { port: ${gatewayPort} }`,
      '  workers: []',
      '  apps: []',
      '',
    ].join('\n'),
  );
});

afterAll(async () => {
  for (const handle of running.reverse()) await stop(handle);
  rmSync(PROJECT, { recursive: true, force: true });
});

describe('backend and UI scaffolded by one CLI', () => {
  it(
    'scaffolds a worker and an app, builds the app\'s starter UI and adds both to mdk.yaml',
    () => {
      const worker = mdk('create', 'worker', 'rig', '--no-install');
      expect(worker.status, worker.stderr).toBe(0);

      // With install: the project-level `npm install` links the worker and the app into node_modules
      // (their MDK backend dependencies point at this checkout), and the app's starter UI gets its
      // own `npm install` and is built into ui/.
      const app = run(['create', 'app', 'ops'], INSTALL_TIMEOUT);
      expect(app.status, app.stderr).toBe(0);
      expect(app.stderr).not.toContain('warning:');
      expect(app.stdout).toContain('Built the starter UI');
      expect(existsSync(join(PROJECT, 'apps', 'ops', 'ui', 'index.js'))).toBe(true);

      const stack = parseYaml(readFileSync(join(PROJECT, 'mdk.yaml'), 'utf8')) as {
        spec: { workers: Array<{ name: string }>; apps: Array<{ name: string }> };
      };
      expect(stack.spec.workers.map((w) => w.name)).toEqual(['rig']);
      expect(stack.spec.apps.map((a) => a.name)).toEqual(['ops']);
      for (const name of ['rig', 'ops']) expect(existsSync(join(PROJECT, 'node_modules', name))).toBe(true);
    },
    INSTALL_TIMEOUT,
  );

  it('validates the scaffolded worker and app', () => {
    const app = mdk('validate', 'app', 'ops');
    expect(app.status, app.stderr).toBe(0);
    expect(app.stdout).toContain('is a valid app');
    const worker = mdk('validate', 'worker', 'rig');
    expect(worker.status, worker.stderr).toBe(0);
    expect(worker.stdout).toContain('is a valid worker');
  });

  it(
    'typechecks the app\'s starter UI',
    () => {
      const result = npm(join(PROJECT, 'apps', 'ops'), ['run', 'typecheck:ui'], INSTALL_TIMEOUT);
      expect(result.status, result.stdout + result.stderr).toBe(0);
    },
    INSTALL_TIMEOUT,
  );

  it(
    'scaffolds the dashboard from the local UI shell template, pointed at the stack\'s Gateway',
    () => {
      const result = run(['create', 'dashboard'], INSTALL_TIMEOUT);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('local monorepo template');

      const dir = join(PROJECT, 'apps', 'dashboard');
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string };
      expect(pkg.name).toBe('e2e-dashboard');
      expect(readFileSync(join(dir, '.env'), 'utf8')).toContain(
        `VITE_GATEWAY_URL=http://localhost:${gatewayPort}`,
      );
      expect(existsSync(join(dir, 'node_modules', '@tetherto', 'mdk-react-devkit'))).toBe(true);
    },
    INSTALL_TIMEOUT,
  );

  it(
    'typechecks and builds the scaffolded dashboard',
    () => {
      const dir = join(PROJECT, 'apps', 'dashboard');
      const typecheck = npm(dir, ['run', 'typecheck'], INSTALL_TIMEOUT);
      expect(typecheck.status, typecheck.stdout + typecheck.stderr).toBe(0);
      const build = npm(dir, ['run', 'build'], INSTALL_TIMEOUT);
      expect(build.status, build.stdout + build.stderr).toBe(0);
      expect(existsSync(join(dir, 'dist', 'index.html'))).toBe(true);
    },
    INSTALL_TIMEOUT,
  );

  it('serves the shell and the app\'s UI with `mdk run dashboard`', async () => {
    const dashboard = start('dashboard');
    await waitFor(
      () => /Local:\s+http:\/\/localhost:\d+/.test(dashboard.output()) || dashboard.proc.exitCode !== null,
      '`mdk run dashboard` to start the dev server',
    );
    dashboardUrl = /Local:\s+(http:\/\/localhost:\d+)/.exec(dashboard.output())?.[1] ?? '';
    expect(dashboardUrl, dashboard.output()).not.toBe('');

    const shell = await fetch(`${dashboardUrl}/`);
    expect(shell.status).toBe(200);
    expect(await shell.text()).toContain('id="root"');

    const listing = (await (await fetch(`${dashboardUrl}/app-ui.json`)).json()) as {
      apps: Array<{ name: string; apiBase: string; ui: { entry: string } }>;
    };
    expect(listing.apps).toMatchObject([{ name: 'ops', apiBase: '/apps/ops' }]);

    const entry = await fetch(`${dashboardUrl}${listing.apps[0]!.ui.entry}`);
    expect(entry.status).toBe(200);
    expect(await entry.text()).toBe(readFileSync(join(PROJECT, 'apps', 'ops', 'ui', 'index.js'), 'utf8'));
  });

  it('reaches the running stack through the dashboard\'s Gateway proxy', async () => {
    expect(dashboardUrl, 'the dashboard is running').not.toBe('');
    grantE2eAccess(PROJECT, 'ops');
    const stack = start();
    await waitFor(
      () => stack.output().includes('Stack running.') || stack.proc.exitCode !== null,
      '`mdk run` to finish booting',
    );
    expect(stack.output()).toContain('Stack running.');

    // Browser origin -> Vite proxy -> Gateway -> app runtime -> Kernel -> worker, as an agent
    // spec.rbac lets read the app.
    const headers = agentAuth(PROJECT);
    let body: { ok?: boolean; kernelConnected?: boolean; workerCount?: number } = {};
    await waitFor(async () => {
      const res = await fetch(`${dashboardUrl}/apps/ops/api/ops/summary`, { headers }).catch(() => null);
      if (res?.status !== 200) return false;
      body = (await res.json()) as typeof body;
      return body.workerCount === 1;
    }, 'the app route to answer through the dashboard');
    expect(body).toMatchObject({ ok: true, kernelConnected: true, workerCount: 1 });
  });
});
