import { spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

// Shared by the end-to-end suites: how to run the CLI, pick ports and wait for a stack.

export const CLI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * A scratch project inside the package, so scaffolded apps and workers resolve @tetherto/* from
 * the monorepo's node_modules (no registry needed). Matches the package's `mdk-try-*` ignore rule.
 */
export const projectDir = (suite: string): string => join(CLI_ROOT, `mdk-try-${suite}-${process.pid}`);

// `node --import tsx` runs the CLI source directly, in one process (a `tsx` wrapper would sit between
// us and the CLI and swallow its exit status).
export const CLI = ['--import', 'tsx', join(CLI_ROOT, 'src', 'index.ts')];

export const env = { ...process.env, NO_COLOR: '1' };

/** Default limit for one synchronous command: long enough for the CLI, short of a hung suite. */
export const COMMAND_TIMEOUT = 30_000;

export function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolvePort(port));
    });
  });
}

/**
 * Runs `mdk <args>` in `cwd` and waits for it. `spawnSync` blocks the event loop, so Vitest's own
 * test timeout cannot interrupt it: the `timeout` + SIGKILL turns a command that hangs (a refused
 * duplicate, a stuck install) into a failure instead.
 */
export const cliRunner =
  (cwd: string) =>
  (args: string[], timeout = COMMAND_TIMEOUT): SpawnSyncReturns<string> =>
    spawnSync(process.execPath, [...CLI, ...args], { cwd, encoding: 'utf8', env, timeout, killSignal: 'SIGKILL' });

/** Runs `npm <args>` in `cwd`, with the same timeout rule as {@link cliRunner}. */
export const npm = (cwd: string, args: string[], timeout = COMMAND_TIMEOUT): SpawnSyncReturns<string> =>
  spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd,
    encoding: 'utf8',
    env,
    timeout,
    killSignal: 'SIGKILL',
    shell: process.platform === 'win32',
  });

/** A long-running `mdk run …` and everything it has printed so far. */
export interface Running {
  proc: ChildProcess;
  output: () => string;
}

/**
 * Polls `condition` until it holds or `ms` passes. On a timeout the error carries `diagnostics()`,
 * typically the output of the processes under test.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  what: string,
  diagnostics: () => string = () => '',
  ms = 90_000,
): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Timed out waiting for ${what}.\n${diagnostics()}`);
}

/** The service account the suites call the Gateway and the MCP server as. */
export const E2E_AGENT = 'e2e-agent';

/**
 * The stack is fail-closed: with nobody bound in spec.rbac, the Kernel refuses every call and the
 * Gateway every request without a token. `mdk rbac init` binds the CLI (so `mdk status` can ask the
 * Kernel), the Gateway, the MCP server and each app's grant; then the suites' own agent gets a
 * service account bound to read the app's routes, and nothing else. Run it once the apps are in
 * mdk.yaml and before `mdk run`, which registers the agent's key and applies the policy.
 */
export function grantE2eAccess(projectDir: string, app: string): void {
  const run = cliRunner(projectDir);
  for (const args of [['rbac', 'init'], ['sa', 'add', E2E_AGENT]]) {
    const result = run(args);
    if (result.status !== 0) throw new Error(`mdk ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`);
  }
  const file = join(projectDir, 'mdk.yaml');
  const doc = parseDocument(readFileSync(file, 'utf8'));
  const role = `${app}-reader`;
  doc.addIn(['spec', 'rbac', 'roles'], doc.createNode({ name: role, rules: [{ resources: [`${app}/*`], verbs: ['get', 'list'] }] }));
  doc.addIn(['spec', 'rbac', 'bindings'], doc.createNode({ role, subjects: [{ kind: 'ServiceAccount', name: E2E_AGENT }] }));
  writeFileSync(file, doc.toString(), 'utf8');
}

/** `Authorization` headers for {@link E2E_AGENT}, signed in against the running Kernel. */
export function agentAuth(projectDir: string): { authorization: string } {
  const result = cliRunner(projectDir)(['sa', 'token', E2E_AGENT]);
  const token = result.stdout.trim();
  if (result.status !== 0 || !token) throw new Error(`mdk sa token ${E2E_AGENT} failed:\n${result.stdout}${result.stderr}`);
  return { authorization: `Bearer ${token}` };
}
