import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLI, agentAuth, cliRunner, env, freePort, grantE2eAccess, projectDir, waitFor as waitUntil, type Running } from './helpers.js';

// The same scaffolded stack as stack.e2e.ts, but every component in its own `mdk run <target>`
// process, the way an operator splits them across terminals. Nothing is shared in memory, so the
// components only find and admit each other through the files under .mdk/.

const PROJECT = projectDir('e2e-split');
const run = cliRunner(PROJECT);
const mdk = (...args: string[]) => run(args);

const running: Running[] = [];

const waitFor = (condition: () => boolean | Promise<boolean>, what: string) =>
  waitUntil(condition, what, () => running.map((r) => r.output()).join('\n---\n'));

/** Starts `mdk run <args>` and resolves once it prints `<ready>`. */
async function start(ready: string, ...args: string[]): Promise<Running> {
  const proc = spawn(process.execPath, [...CLI, 'run', ...args], { cwd: PROJECT, env });
  let out = '';
  for (const stream of [proc.stdout, proc.stderr]) stream?.on('data', (chunk) => (out += chunk));
  const handle = { proc, output: () => out };
  running.push(handle);
  await waitFor(() => out.includes(ready) || proc.exitCode !== null, `\`mdk run ${args.join(' ')}\``);
  expect(out, out).toContain(ready);
  return handle;
}

/** One JSON-RPC call to the MCP server, as the e2e agent; it answers as a single SSE message. */
async function mcpCall(port: number, id: number, method: string, params: object = {}): Promise<Record<string, any>> {
  const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await res.text();
  const data = text.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(data ? data.slice(6) : text);
}

let gatewayPort = 0;
let mcpPort = 0;
/** The e2e agent's `Authorization` header, once the Kernel is up to sign it in. */
let headers: { authorization: string } = { authorization: '' };

beforeAll(async () => {
  rmSync(PROJECT, { recursive: true, force: true });
  mkdirSync(PROJECT, { recursive: true });
  [gatewayPort, mcpPort] = [await freePort(), await freePort()];
  writeFileSync(
    join(PROJECT, 'mdk.yaml'),
    [
      'apiVersion: mdk/v1',
      'kind: Stack',
      'metadata:',
      '  name: split',
      'spec:',
      `  kernel: { port: ${await freePort()} }`,
      `  gateway: { port: ${gatewayPort} }`,
      `  mcp: { port: ${mcpPort} }`,
      '  workers: []',
      '  apps: []',
      '',
    ].join('\n'),
  );
  expect(mdk('create', 'worker', 'rig', '--no-install').status).toBe(0);
  expect(mdk('create', 'app', 'ops', '--no-install').status).toBe(0);
  mkdirSync(join(PROJECT, 'node_modules'), { recursive: true });
  symlinkSync(join(PROJECT, 'workers', 'rig'), join(PROJECT, 'node_modules', 'rig'));
  symlinkSync(join(PROJECT, 'apps', 'ops'), join(PROJECT, 'node_modules', 'ops'));
  grantE2eAccess(PROJECT, 'ops');
});

afterAll(async () => {
  for (const { proc } of running.reverse()) {
    if (proc.exitCode !== null) continue;
    const exited = new Promise((resolveExit) => proc.once('exit', resolveExit));
    proc.kill('SIGINT');
    await Promise.race([exited, new Promise((r) => setTimeout(r, 8000))]);
    if (proc.exitCode === null) proc.kill('SIGKILL');
  }
  rmSync(PROJECT, { recursive: true, force: true });
});

describe('a stack run as one process per component', () => {
  it('serves the app through the Gateway, with every component in its own process', async () => {
    await start('Kernel running.', 'kernel');
    await start('Worker running.', 'worker', 'rig');
    await start('App running.', 'app', 'ops');
    await start('Gateway running.', 'gateway');
    headers = agentAuth(PROJECT);

    let body: { kernelConnected?: boolean; workerCount?: number } = {};
    await waitFor(async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/apps/ops/api/ops/summary`, { headers }).catch(() => null);
      if (res?.status !== 200) return false;
      body = (await res.json()) as typeof body;
      return body.workerCount === 1;
    }, 'the app route to answer through the Gateway');
    expect(body).toMatchObject({ kernelConnected: true, workerCount: 1 });
  });

  it('publishes every caller key in the one trusted-keys dir the Kernel and workers read', () => {
    const keys = readdirSync(join(PROJECT, '.mdk', 'trusted-keys')).sort();
    expect(keys).toEqual(expect.arrayContaining(['app-ops.pub', 'gateway.pub', 'kernel.pub']));
  });

  it('refuses a second copy of a running app or worker instead of breaking the first', async () => {
    for (const [target, name, label] of [['app', 'ops', 'App "ops"'], ['worker', 'rig', 'Worker "rig"']]) {
      const second = mdk('run', target!, name!);
      expect(second.status).toBe(1);
      expect(second.stderr).toContain(`${label} is already running for this project`);
    }
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/apps/ops/api/ops/summary`, { headers });
    expect(res.status, 'the first app still answers').toBe(200);
  });

  it('reports the Kernel, Gateway, worker and app as up in `mdk status`', () => {
    const result = mdk('status', '-o', 'json');
    const report = JSON.parse(result.stdout) as {
      health: string;
      stack: {
        kernel: { state: string };
        gateway: { state: string };
        workers: { registered: number };
        apps: { running: number; declared: number };
      };
    };
    expect(report.stack).toMatchObject({
      kernel: { state: 'up' },
      gateway: { state: 'up' },
      workers: { registered: 1 },
      apps: { running: 1, declared: 1 },
    });
    expect(report.health).toBe('healthy');
    expect(result.status).toBe(0);
  });

  it('exposes the scaffolded app\'s read route as an MCP tool and runs it', async () => {
    await start('MCP server running.', 'mcp');
    await mcpCall(mcpPort, 1, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'e2e', version: '1' },
    });
    const list = await mcpCall(mcpPort, 2, 'tools/list');
    expect(list.result?.tools?.map((t: { name: string }) => t.name)).toContain('ops_summary');

    const call = await mcpCall(mcpPort, 3, 'tools/call', { name: 'ops_summary', arguments: {} });
    const text = call.result?.content?.[0]?.text ?? '';
    expect(text).toContain('"workerCount": 1');
  });
});
