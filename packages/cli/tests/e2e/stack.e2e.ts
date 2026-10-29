import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLI, agentAuth, cliRunner, env, freePort, grantE2eAccess, projectDir, waitFor as waitUntil } from './helpers.js';

// Scaffold a worker and an app with the CLI, run the whole stack, and check it from outside:
// over the Gateway's HTTP port, with `mdk status`, and against the app runtime's allow-list.

const require = createRequire(import.meta.url);
const PROJECT = projectDir('e2e');
const run = cliRunner(PROJECT);
const mdk = (...args: string[]) => run(args);

let stack: ChildProcess | undefined;
let output = '';
let gatewayPort = 0;

const waitFor = (condition: () => boolean | Promise<boolean>, what: string, ms?: number) =>
  waitUntil(condition, what, () => output, ms);

beforeAll(async () => {
  rmSync(PROJECT, { recursive: true, force: true });
  mkdirSync(PROJECT, { recursive: true });
  const [kernelPort, gateway] = [await freePort(), await freePort()];
  gatewayPort = gateway;
  writeFileSync(
    join(PROJECT, 'mdk.yaml'),
    [
      'apiVersion: mdk/v1',
      'kind: Stack',
      'metadata:',
      '  name: e2e',
      'spec:',
      `  kernel: { port: ${kernelPort} }`,
      `  gateway: { port: ${gateway} }`,
      '  workers: []',
      '  apps: []',
      '',
    ].join('\n'),
  );

  expect(mdk('create', 'worker', 'rig', '--no-install').status).toBe(0);
  expect(mdk('create', 'app', 'ops', '--no-install').status).toBe(0);
  // What `npm install` does for the `file:` dependencies the scaffold wrote.
  mkdirSync(join(PROJECT, 'node_modules'), { recursive: true });
  symlinkSync(join(PROJECT, 'workers', 'rig'), join(PROJECT, 'node_modules', 'rig'));
  symlinkSync(join(PROJECT, 'apps', 'ops'), join(PROJECT, 'node_modules', 'ops'));
  grantE2eAccess(PROJECT, 'ops');
});

afterAll(async () => {
  if (stack && stack.exitCode === null) {
    stack.kill('SIGKILL');
  }
  rmSync(PROJECT, { recursive: true, force: true });
});

describe('a scaffolded stack, run end to end', () => {
  it('validates what it scaffolded', () => {
    const app = mdk('validate', 'app', 'ops');
    expect(app.status, app.stderr).toBe(0);
    expect(app.stdout).toContain('is a valid app');
    const worker = mdk('validate', 'worker', 'rig');
    expect(worker.status, worker.stderr).toBe(0);
    expect(worker.stdout).toContain('is a valid worker');
  });

  it('boots the Kernel, worker, app runtime and Gateway, and serves the app through the Gateway', async () => {
    stack = spawn(process.execPath, [...CLI, 'run'], { cwd: PROJECT, env });
    for (const stream of [stack.stdout, stack.stderr]) stream?.on('data', (chunk) => (output += chunk));
    await waitFor(() => output.includes('Stack running.'), '`mdk run` to finish booting');

    // Gateway -> HRPC -> app runtime -> Kernel -> worker, as an agent spec.rbac lets read the app.
    const headers = agentAuth(PROJECT);
    let body: { ok?: boolean; kernelConnected?: boolean; workerCount?: number; deviceCount?: number } = {};
    await waitFor(async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/apps/ops/api/ops/summary`, { headers }).catch(() => null);
      if (res?.status !== 200) return false;
      body = (await res.json()) as typeof body;
      return body.workerCount === 1;
    }, 'the app route to answer through the Gateway');
    expect(body).toMatchObject({ ok: true, kernelConnected: true, workerCount: 1, deviceCount: 1 });
  });

  it('shows the running Kernel, Gateway and worker in `mdk status`', () => {
    const result = mdk('status', '-o', 'json');
    const report = JSON.parse(result.stdout) as {
      stack: {
        kernel: { state: string };
        gateway: { state: string };
        workers: { items: Array<{ name: string; registered: boolean }> };
      };
    };
    expect(report.stack.kernel.state).toBe('up');
    expect(report.stack.gateway.state).toBe('up');
    expect(report.stack.workers.items).toMatchObject([{ name: 'rig', registered: true }]);
  });

  it('refuses a caller whose key the app runtime does not allow', async () => {
    const { createRuntimeClient } = require('@tetherto/mdk-app-runtime') as typeof import('@tetherto/mdk-app-runtime');
    const runtimeKey = readFileSync(join(PROJECT, '.mdk', 'apps', 'ops', 'runtime.key'), 'utf8').trim();
    const gatewayKey = readFileSync(join(PROJECT, '.mdk', 'gateway.key'), 'utf8').trim();

    const stranger = createRuntimeClient({});
    expect(stranger.publicKey.toString('hex')).not.toBe(gatewayKey);
    await stranger.connect();
    try {
      await expect(stranger.invoke(runtimeKey, 'ops.summary', {}, { timeoutMs: 20_000 })).rejects.toThrow(
        /ERR_APP_RUNTIME_UNAVAILABLE/,
      );
    } finally {
      await stranger.close();
    }
  });

  it('stops everything on Ctrl+C and frees the Gateway port', async () => {
    const exited = new Promise<number | null>((resolveExit) => stack!.once('exit', (code) => resolveExit(code)));
    stack!.kill('SIGINT');
    // The Kernel and the Gateway each install their own SIGINT handler that stops them and exits 0, so
    // either that or the CLI's own orderly stop (130) may finish first.
    expect([0, 130]).toContain(await exited);
    expect(output).toContain('Stopping (SIGINT)');
    const refused = await fetch(`http://127.0.0.1:${gatewayPort}/`).then(
      () => false,
      () => true,
    );
    expect(refused).toBe(true);
  });
});
