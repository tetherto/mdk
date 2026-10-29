import { createRequire } from 'node:module';
import { spawn, type ChildProcess } from 'node:child_process';
import { once, type EventEmitter } from 'node:events';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  DEFAULT_DHT_HOST,
  isLocalPackagePath,
  loadStackDht,
  loadStackSpec,
  unresolvedEnvRef,
  type AppInstance,
  type StackSpec,
  type WorkerInstance,
} from './spec.js';
import { DEFAULT_HOST, findFreePort, isPortFree } from './ports.js';
import { APP_MANIFEST } from './app-package.js';
import { WORKER_CONTRACT } from './worker-package.js';
import { theme, tick, arrow } from './theme.js';
import { appChildFile, appChildPid } from './run-lock.js';
import {
  CLI_ACCOUNT,
  GATEWAY_ACCOUNT,
  MCP_ACCOUNT,
  ensureAgentCredential,
  ensureAppCredential,
  signingCredential,
  stackServiceAccounts,
} from './credentials.js';

const require = createRequire(import.meta.url);

// --- @tetherto/mdk-core runtime -------------------------------------------
// The backend runtime is a typeless CommonJS package. It is `require`d lazily
// (inside the boot functions, never at module top level) so the heavy backend
// deps are only loaded when a `run` target actually boots — not on every CLI
// invocation. These interfaces type just the surface `mdk run` touches.

/** Handle returned by `getKernel`. */
export interface KernelHandle {
  getPublicKey?: () => Buffer | string;
  /** The key the Kernel dials workers with — what a worker must allow. */
  getClientPublicKey?: () => Buffer | null;
  /** Admit an HRPC caller to connect (the Kernel is fail-closed); spec.rbac decides what it may do. */
  allowKey?: (key: Buffer | string) => string;
  /** Hex keys admitted to connect. */
  listAllowedKeys?: () => string[];
  _cleanup: Array<() => unknown>;
  stop: () => Promise<void>;
  [key: string]: unknown;
}

/** Handle returned by `startGateway`. */
export interface GatewayHandle {
  stop: (cb?: () => void) => void;
  [key: string]: unknown;
}

interface GetKernelOpts {
  root?: string;
  keyFile?: string | false;
  discovery?: { mode: 'local' | 'dht'; dir?: string; topic?: string };
  /** spec.rbac to apply at boot; `null` applies deny-all, omitted keeps the stored policy. */
  rbac?: unknown;
  /** The exact set of service accounts to register at boot (apps and agents with a credential here). */
  serviceAccounts?: Array<{ name: string; publicKey: string }>;
  [key: string]: unknown;
}

interface StartGatewayOpts {
  root?: string;
  port?: number;
  kernel?: KernelHandle;
  kernelKey?: unknown;
  keyFile?: string;
  /** The Gateway reads each app's route table and forwards to the runtime whose key is in `keyFile`. */
  apps?: Array<{ name: string; appDir: string; keyFile: string; mount?: string }>;
  /** Where the Gateway publishes its own public key; the app runtimes accept calls from it only. */
  gatewayKeyFile?: string;
  /** Overrides merged into the gateway's `config/common.json`. */
  common?: Record<string, unknown>;
  [key: string]: unknown;
}

/** A running private HyperDHT bootstrap (`startDhtBootstrap`). */
interface DhtBootstrapHandle {
  bootstrap: string[];
  close: () => Promise<void>;
}

interface MdkCore {
  getKernel(opts?: GetKernelOpts): Promise<KernelHandle>;
  startGateway(opts?: StartGatewayOpts): Promise<GatewayHandle>;
  startDhtBootstrap(opts: { host: string; port: number }): Promise<DhtBootstrapHandle>;
  [key: string]: unknown;
}

/** Lazily loads the `@tetherto/mdk-core` runtime (a workspace dependency). */
function mdkCore(): MdkCore {
  return require('@tetherto/mdk-core') as MdkCore;
}

// --- @tetherto/mdk-worker runtime -----------------------------------------
// Same lazy-`require` contract as `mdkCore` above: the WorkerRuntimeV2 host
// lives in the backend and is only loaded when a worker actually boots. `mdk
// run` plays the "caller" role (the way a host process
// would) — it constructs the runtime from the package's directory, seeds
// devices, and owns the lifecycle, while the worker *package* ships only its
// `mdk-contract.json` + handlers and an optional mock.

/** A booted WorkerRuntimeV2 host instance. */
interface WorkerRuntimeV2Instance {
  start(): Promise<{ publicKey: Buffer }>;
  stop(): Promise<void>;
  getPublicKey(): Buffer;
  [key: string]: unknown;
}
interface WorkerRuntimeV2Ctor {
  new (dir: string, opts: Record<string, unknown>): WorkerRuntimeV2Instance;
}
interface MdkWorker {
  WorkerRuntimeV2: WorkerRuntimeV2Ctor;
  [key: string]: unknown;
}

/** Lazily loads the `@tetherto/mdk-worker` runtime host (a workspace dependency). */
function mdkWorker(): MdkWorker {
  return require('@tetherto/mdk-worker') as MdkWorker;
}

/** A persistent caller identity (`callerKeyPair`), in hyperdht's key format. */
export interface CallerKeyPair {
  publicKey: Buffer;
  secretKey: Buffer;
}

/** Local-discovery helpers from mdk-core — how components publish and trust each other's keys. */
interface LocalDiscovery {
  publishWorkerKey(dir: string, workerId: string, rpcKeyHex: string): void;
  publishTrustedKey(dir: string, name: string, key: Buffer | string): string;
  readTrustedKeys(dir: string): Array<{ name: string; key: string }>;
  trustKernel(runtime: WorkerRuntimeV2Instance, kernel: KernelHandle): { stop(): void };
  trustKeysFromDir(runtime: WorkerRuntimeV2Instance, dir: string): { stop(): void };
  callerKeyPair(dir: string): CallerKeyPair;
}
export function localDiscovery(): LocalDiscovery {
  return require('@tetherto/mdk-core/lib/local-discovery') as LocalDiscovery;
}

// --- @tetherto/mdk-mcp runtime ---------------------------------------------
// Same lazy-`require` contract as `mdkCore` above: the standalone MCP server
// is only loaded when `mdk run mcp` actually boots it.

/** Handle returned by `createMcpServer`. */
interface McpServerHandle {
  close: (cb?: () => void) => void;
  [key: string]: unknown;
}
/** `createMcpServer`'s security/lifecycle options (see backend/core/mcp/server.js). */
interface McpServerOptions {
  token?: string;
  allowWrite?: boolean;
  allowTools?: string[];
  identity?: Record<string, unknown>;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  maxOutputLength?: number;
  handleSignals?: boolean;
  keyFile?: string;
}
interface MdkMcp {
  createMcpServer(
    root: string,
    port: number,
    config: Record<string, unknown>,
    pluginDirs: string[],
    apps: ForwardedApp[],
    options?: McpServerOptions,
  ): Promise<McpServerHandle>;
  [key: string]: unknown;
}

/** Lazily loads the `@tetherto/mdk-mcp` runtime (a workspace dependency). */
function mdkMcp(): MdkMcp {
  return require('@tetherto/mdk-mcp') as MdkMcp;
}

// --- @tetherto/mdk-app-runtime ----------------------------------------------
// Same lazy-`require` contract as `mdkCore` above. `mdk run app` creates the
// runtime in-process; `mdk run` spawns the package's `bin/run-app.js` per app.

/** `createAppRuntime` options; a supervised child gets them JSON-encoded in `MDK_APP_RUNTIME_OPTIONS`. */
export interface AppRuntimeOptions {
  /** Private DHT (spec.network.dht): the runtime's own DHT node, and its Kernel client's. */
  bootstrap?: string[];
  dhtHost?: string;
  kernelBootstrap?: string[];
  kernelDhtHost?: string;
  name: string;
  appDir: string;
  config: Record<string, unknown>;
  kernelKey?: string;
  storeDir: string;
  allowedKeyFiles: string[];
  keyFile: string;
  kernelKeyFile: string;
  /** The app's service-account credential (`.mdk/credentials/apps/<name>.json`); the runtime signs in with it. */
  credentialFile: string;
}

interface MdkAppRuntime {
  createAppRuntime(opts: AppRuntimeOptions): {
    start(): Promise<unknown>;
    stop(): Promise<void>;
  };
}

/** Lazily loads the `@tetherto/mdk-app-runtime` package (a workspace dependency). */
function mdkAppRuntime(): MdkAppRuntime {
  return require('@tetherto/mdk-app-runtime') as MdkAppRuntime;
}

// --- project-local runtime state ------------------------------------------
// Everything `mdk run` writes lives under `<project>/.mdk` — gitignored and safe
// to delete. Each component gets its own data root so no two of them share a
// directory, while the two cross-process handoff artifacts sit at the top level
// where either side can find them: `kernel.key` (read by the gateway) and
// `keys/` (written by workers, watched by the kernel). This leaves room for
// `logs/` and `run/` when `mdk logs` and `mdk status` land.

/** Absolute runtime-state root for a project — `<project>/.mdk`. */
export function mdkDir(projectDir: string): string {
  return resolve(projectDir, '.mdk');
}

/** A path under `.mdk`, e.g. `componentDir(dir, 'workers', name)`. */
function componentDir(projectDir: string, ...parts: string[]): string {
  return join(mdkDir(projectDir), ...parts);
}

/** Shared Kernel HRPC key file — how a separate gateway process discovers the Kernel. */
export function kernelKeyFile(projectDir: string): string {
  return componentDir(projectDir, 'kernel.key');
}

/** Where the Gateway publishes its public key; app runtimes accept calls from it and the MCP server's. */
export function gatewayKeyFile(projectDir: string): string {
  return componentDir(projectDir, 'gateway.key');
}

/** Where the MCP server publishes the key it calls app runtimes with. */
export function mcpKeyFile(projectDir: string): string {
  return componentDir(projectDir, 'mcp.key');
}

/** Where an app runtime publishes its public key, for the Gateway to find it. */
export function appKeyFile(projectDir: string, name: string): string {
  return componentDir(projectDir, 'apps', name, 'runtime.key');
}

/** Where every DHT node of a stack joins and binds; empty on the public HyperDHT. */
export interface StackDht {
  bootstrap?: string[];
  dhtHost?: string;
}

/**
 * The stack's private-DHT settings (`spec.network.dht`), from `spec` or else
 * the project's mdk.yaml (throwing when that does not load; see loadStackDht). Without an explicit `bootstrap` list, every component
 * joins the bootstrap the Kernel's process runs at `host:port` and binds `host`
 * (loopback by default); joining a list without a `host`, every interface.
 */
export function projectDht(projectDir: string, spec?: StackSpec): StackDht {
  const dht = spec ? spec.spec.network?.dht : loadStackDht(projectDir);
  if (!dht) return {};
  if (dht.bootstrap) return { bootstrap: dht.bootstrap, ...(dht.host ? { dhtHost: dht.host } : {}) };
  const host = dht.host ?? DEFAULT_DHT_HOST;
  return { bootstrap: [`${host}:${dht.port}`], dhtHost: host };
}

/**
 * Shared worker-key dir for `discovery: { mode: 'local' }`, passed *explicitly*
 * to both sides. mdk-core otherwise defaults it to `<root>/.worker-keys`, which
 * would nest it inside whichever component's data root was passed — the Kernel
 * and its workers must agree on one path independent of their own roots.
 */
export function workerKeysDir(projectDir: string): string {
  return componentDir(projectDir, 'keys');
}

/**
 * Shared trusted-keys dir. The Kernel and every Worker reject unknown RPC
 * callers, so each component publishes the key it dials with here
 * (`kernel.pub`, `gateway.pub`, `mcp.pub`, `app-<name>.pub`): the Kernel admits callers from it
 * and separately-run workers allow what they find in it.
 */
export function trustedKeysDir(projectDir: string): string {
  return componentDir(projectDir, 'trusted-keys');
}

/** Default gap between the Gateway's port and the MCP server's, when `spec.mcp.port` is not set. */
export const DEFAULT_MCP_PORT_OFFSET = 100;

/**
 * Splits a spec `package` into the npm package to resolve and the subdirectory
 * inside it, if any: `@scope/pkg/plugin-a` is one installed package and one
 * directory within it, not a package called `.../plugin-a`.
 *
 * Subpaths exist for packages that ship several plugins as subdirectories of a
 * single package, with no `package.json` of their own.
 */
function splitPackageSubpath(pkgName: string): { pkg: string; subpath: string } {
  const parts = pkgName.split('/');
  const nameLength = pkgName.startsWith('@') ? 2 : 1;
  return { pkg: parts.slice(0, nameLength).join('/'), subpath: parts.slice(nameLength).join('/') };
}

/** The spec the project's package.json gives `pkg`, if it lists it. */
function declaredDependency(projectDir: string, pkg: string): string | undefined {
  try {
    const manifest = JSON.parse(readFileSync(join(resolve(projectDir), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return manifest.dependencies?.[pkg] ?? manifest.devDependencies?.[pkg];
  } catch {
    return undefined;
  }
}

/**
 * Resolves an installed package's root directory from the target project's
 * `node_modules` (via its `package.json`), or a subdirectory of one. Throws an
 * actionable error naming the missing package — a package `mdk.yaml` declares
 * must be installed into the project first.
 */
export function resolveProjectPackageDir(projectDir: string, pkgName: string): string {
  const { pkg, subpath } = splitPackageSubpath(pkgName);

  let root: string;
  try {
    root = dirname(require.resolve(`${pkg}/package.json`, { paths: [resolve(projectDir)] }));
  } catch {
    // A dependency package.json already declares (a `file:` app, say) only needs
    // `npm install`; naming it would fetch an unrelated registry package. The
    // install command names the *package*: `npm install @scope/pkg/plugin-a`
    // is not a thing npm can do.
    const declared = declaredDependency(projectDir, pkg);
    throw new Error(
      `Package "${pkgName}" is not installed in ${resolve(projectDir)}.\n` +
        (declared
          ? `package.json declares it ("${declared}"), so run: npm install`
          : `Install it first, e.g.: npm install ${pkg}`),
    );
  }

  if (!subpath) return root;

  // A subpath that is not there is a typo in mdk.yaml, not a missing install, and
  // the two want different fixes. Whether the directory holds a plugin manifest
  // (or a worker contract) is left to whoever loads it — that check belongs with
  // the loader that knows which of the two it wanted.
  const dir = join(root, subpath);
  if (!existsSync(dir)) {
    throw new Error(
      `Package "${pkgName}" is installed as "${pkg}", but it has no "${subpath}" in it (looked in ${dir}).\n` +
        `Check the subpath — e.g. package: "${pkg}/<dir>".`,
    );
  }
  return dir;
}

/**
 * Why the Kernel must not boot on this policy: nobody could administer it. No
 * user or group is bound, and no bound subject may write the policy, so a
 * running Kernel could not be handed another one and `mdk rbac init` would be
 * refused. That is a fresh stack (nothing bound) or one after `mdk create app`
 * (only the app's account bound). A stack that binds a user and keeps
 * `policy: write` out of every role is a choice: it boots, and policy changes
 * go through mdk.yaml and a restart. Undefined when someone can administer.
 */
export function policyRefusal(spec: StackSpec): string | undefined {
  const rbac = spec.spec.rbac;
  const bindings = rbac?.bindings ?? [];
  if (bindings.some((b) => b.subjects.some((s) => s.kind === 'User' || s.kind === 'Group'))) return undefined;
  // Rules scoped by resourceNames never match `policy`, which has no instance.
  const writesPolicy = (role: string): boolean =>
    (rbac?.roles ?? []).some(
      (r) =>
        r.name === role &&
        r.rules.some(
          (rule) =>
            !rule.resourceNames?.length &&
            (rule.resources.includes('policy') || rule.resources.includes('*')) &&
            (rule.verbs.includes('write') || rule.verbs.includes('*')),
        ),
    );
  if (bindings.some((b) => b.subjects.length > 0 && writesPolicy(b.role))) return undefined;
  const who = bindings.some((b) => b.subjects.length > 0) ? 'binds no user, and lets nobody write the policy' : 'binds nobody';
  return (
    `spec.rbac ${who}, so the Kernel would boot with nobody able to administer it: \`mdk rbac init\` would be refused. ` +
    'Run `mdk rbac init` first, then `mdk run`.'
  );
}

/**
 * What will be refused once the Kernel enforces spec.rbac, said at boot rather
 * than discovered one 403 at a time: a policy that binds nobody, a CLI account
 * with no binding, an app with no binding for its service account.
 */
export function policyWarnings(spec: StackSpec): string[] {
  const bindings = spec.spec.rbac?.bindings ?? [];
  const bound = (kind: string, name: string): boolean =>
    bindings.some((b) => b.subjects.some((s) => s.kind === kind && s.name === name));
  if (!bindings.length) {
    return ['spec.rbac binds nobody, so the Kernel refuses every call. Run `mdk rbac init` to bind the CLI and the apps.'];
  }
  const out: string[] = [];
  if (!bound('ServiceAccount', CLI_ACCOUNT)) out.push(`spec.rbac does not bind ${CLI_ACCOUNT}: \`mdk status\`, \`mdk user\` and \`mdk rbac apply\` are refused.`);
  if (!bound('ServiceAccount', MCP_ACCOUNT)) out.push(`spec.rbac does not bind ${MCP_ACCOUNT}: the MCP server (\`mdk run mcp\`) cannot read the policy, so it refuses every agent.`);
  if (!bound('ServiceAccount', GATEWAY_ACCOUNT)) out.push(`spec.rbac does not bind ${GATEWAY_ACCOUNT}: a Gateway started on its own (\`mdk run gateway\`) cannot read the policy, so it refuses every route.`);
  for (const app of spec.spec.apps) {
    if (!bound('ServiceAccount', `app:${app.name}`)) out.push(`app ${app.name} has no binding in spec.rbac: the Kernel refuses its calls. Run \`mdk rbac init\`.`);
  }
  return out;
}

/**
 * Boots the Kernel (local discovery, project-local state), logging its key. With
 * the stack's `spec`, its `spec.rbac` is the policy the Kernel applies at boot (a
 * stack without one applies the empty, deny-all policy), and its apps and this
 * instance's agents are the service accounts it registers; without it, the
 * Kernel keeps the policy and accounts last applied to its store.
 */
export async function runKernel(projectDir: string, spec?: StackSpec): Promise<KernelHandle> {
  const core = mdkCore();
  const root = componentDir(projectDir, 'kernel');
  mkdirSync(root, { recursive: true });

  // Private DHT without a listed bootstrap: this process runs it, for the
  // whole stack, and stops it after the Kernel.
  const dhtSpec = spec ? spec.spec.network?.dht : loadStackDht(projectDir);
  const dht = projectDht(projectDir, spec);
  let dhtBootstrap: DhtBootstrapHandle | undefined;
  if (dhtSpec && !dhtSpec.bootstrap) {
    const host = dhtSpec.host ?? DEFAULT_DHT_HOST;
    try {
      dhtBootstrap = await core.startDhtBootstrap({ host, port: dhtSpec.port });
    } catch (error) {
      throw new Error(
        `Could not start the private DHT bootstrap on ${host}:${dhtSpec.port}: ` +
          `${error instanceof Error ? error.message : String(error)}\n` +
          'Another stack may be using that port — change `spec.network.dht.port` in mdk.yaml.',
      );
    }
    process.stderr.write(`${tick} ${theme.label('dht')} private bootstrap ${theme.value(dhtBootstrap.bootstrap.join(','))}\n`);
  }

  process.stderr.write(`${theme.muted('Starting kernel')} ${arrow} ${theme.value(root)}\n`);
  let kernel: KernelHandle;
  try {
    kernel = await core.getKernel({
      root,
      keyFile: kernelKeyFile(projectDir),
      discovery: { mode: 'local', dir: workerKeysDir(projectDir) },
      trustedKeysDir: trustedKeysDir(projectDir),
      ...(dht.bootstrap ? { hrpc: dht } : {}),
      ...(spec ? { rbac: spec.spec.rbac ?? null, serviceAccounts: stackServiceAccounts(projectDir, spec) } : {}),
    });
  } catch (error) {
    await dhtBootstrap?.close();
    throw error;
  }
  if (dhtBootstrap) {
    const bootstrapNet = dhtBootstrap;
    const stopKernel = kernel.stop.bind(kernel);
    kernel.stop = async () => {
      try {
        await stopKernel();
      } finally {
        await bootstrapNet.close();
      }
    };
  }

  if (spec) for (const warning of policyWarnings(spec)) process.stderr.write(`${theme.warn('warning')}: ${warning}\n`);

  const key = typeof kernel.getPublicKey === 'function' ? kernel.getPublicKey() : undefined;
  const keyHex = key ? key.toString('hex') : '(unknown)';
  process.stderr.write(`${tick} ${theme.label('kernel')} ready ${theme.muted(keyHex)}\n`);
  return kernel;
}

/**
 * Shared by assertGatewayPortFree/assertMcpPortFree below: unlike a mock port,
 * these are published endpoints (the dashboard proxies to the gateway's, agents
 * dial the MCP one directly), so neither is ever relocated behind the
 * operator's back — fail with the fix instead of a bare EADDRINUSE from deep
 * inside the server. One implementation keeps the two messages from drifting
 * apart as the wording around them changes.
 */
async function assertPortFree(port: number, label: string, specKey: string): Promise<void> {
  if (await isPortFree(port)) return;
  throw new Error(
    `${label} port ${port} is already in use.\n` +
      `Another stack is probably running — stop it, or change \`${specKey}\` in mdk.yaml.`,
  );
}

/** Exported so `run all` can check the gateway's port before booting anything. */
export async function assertGatewayPortFree(port: number): Promise<void> {
  return assertPortFree(port, 'Gateway', 'spec.gateway.port');
}

/** An app as the Gateway and the MCP server take it: its route table, and its runtime's key file to forward to. */
interface ForwardedApp {
  name: string;
  appDir: string;
  keyFile: string;
  mount?: string;
}

/** Neither runs app code, so an app's config goes to its runtime only. */
function forwardedApps(projectDir: string, apps: AppInstance[]): ForwardedApp[] {
  return apps.map((a) => ({
    name: a.name,
    appDir: resolveAppPackageDir(projectDir, a.package),
    keyFile: appKeyFile(projectDir, a.name),
    ...(a.mount !== undefined ? { mount: a.mount } : {}),
  }));
}

/**
 * Boots the Gateway. When `kernel` is provided the connection is in-process
 * (target `all`); otherwise the Kernel key is resolved from the shared key
 * file written by a separate `mdk run kernel` process.
 */
export async function runGateway(
  projectDir: string,
  spec: StackSpec,
  kernel?: KernelHandle,
): Promise<GatewayHandle> {
  const core = mdkCore();

  // Resolve every path to an absolute one *before* the chdir below, so nothing
  // depends on the (about-to-change) working directory.
  const keyFile = kernelKeyFile(projectDir);
  const root = componentDir(projectDir, 'gateway');
  const ownKeyFile = gatewayKeyFile(projectDir);
  const trustDir = trustedKeysDir(projectDir);
  const apps = forwardedApps(projectDir, spec.spec.apps);
  // spec.rbac is enforced on every app route: by the in-process Kernel's issuer
  // and policy, or by a Kernel in another process, reached as the Gateway's
  // own service account (it reads the policy).
  const gatewayCredential = kernel ? undefined : signingCredential(ensureAgentCredential(projectDir, GATEWAY_ACCOUNT));

  // Out-of-process gateway: the Kernel must already be running so its HRPC key
  // is on disk. Fail early with an actionable message instead of silently
  // booting a gateway that can never reach a Kernel.
  if (!kernel && !existsSync(keyFile)) {
    throw new Error(
      'Kernel is not running (no key file found).\nStart it first: `mdk run kernel`.',
    );
  }

  await assertGatewayPortFree(spec.spec.gateway.port);

  mkdirSync(root, { recursive: true });

  // The gateway's corestore (`store/http`) is created relative to the working
  // directory (tether-wrk-base convention — the mvp-site example likewise runs
  // each process with its own `cwd`). Run from the gateway state root so that
  // store nests under `.mdk/gateway/` instead of polluting the project.
  process.chdir(root);

  process.stderr.write(
    `${theme.muted('Starting gateway')} ${arrow} ${theme.value(`:${spec.spec.gateway.port}`)}\n`,
  );
  const gateway = await core.startGateway({
    root,
    port: spec.spec.gateway.port,
    ...(kernel ? { kernel } : { keyFile }),
    apps,
    gatewayKeyFile: ownKeyFile,
    // Admits the gateway's client key on the Kernel and on workers in other processes.
    trustedKeysDir: trustDir,
    ...(Object.keys(spec.spec.gateway.config ?? {}).length ? { common: spec.spec.gateway.config } : {}),
    ...(gatewayCredential ? { gatewayCredential } : {}),
    ...projectDht(projectDir, spec),
  });

  process.stderr.write(
    `${tick} ${theme.label('gateway')} listening on ${theme.value(`http://localhost:${spec.spec.gateway.port}`)}\n`,
  );
  return gateway;
}

/** Same reasoning as `assertGatewayPortFree` — see `assertPortFree` above. */
export async function assertMcpPortFree(port: number): Promise<void> {
  return assertPortFree(port, 'MCP', 'spec.mcp.port');
}

/** The Kernel's public key (hex): from an in-process handle, else from the key file `mdk run kernel` wrote. */
function resolveKernelKey(projectDir: string, kernel?: KernelHandle): string | undefined {
  if (kernel) {
    const key = typeof kernel.getPublicKey === 'function' ? kernel.getPublicKey() : undefined;
    return key ? (Buffer.isBuffer(key) ? key.toString('hex') : String(key)) : undefined;
  }
  const keyFile = kernelKeyFile(projectDir);
  if (existsSync(keyFile)) return readFileSync(keyFile, 'utf8').trim();
  throw new Error(
    'Kernel is not running (no key file found).\nStart it first: `mdk run kernel`.',
  );
}

/** A stack's DHT settings as a Kernel client's config (`kernelBootstrap`, `kernelDhtHost`). */
function kernelDhtConfig(dht: StackDht): { kernelBootstrap?: string[]; kernelDhtHost?: string } {
  return {
    ...(dht.bootstrap ? { kernelBootstrap: dht.bootstrap } : {}),
    ...(dht.dhtHost ? { kernelDhtHost: dht.dhtHost } : {}),
  };
}

/** Handle returned by `runMcp`. */
export interface McpHandle {
  stop: () => Promise<void>;
}

/**
 * Boots the standalone MCP server, pointed at the apps `mdk.yaml` declares
 * under `spec.apps` — their routes become MCP
 * tools with no separate mcp-specific plugin authoring required, each call
 * forwarded to the app's runtime, so an app's tools answer once `mdk run` has
 * started it. Requires the
 * Kernel to already be reachable: an in-process `kernel` handle (target
 * `all`, if this is ever wired into it), or the shared key file written by a
 * separately-running `mdk run kernel` — the same contract `runGateway` uses.
 */
export async function runMcp(
  projectDir: string,
  spec: StackSpec,
  kernel?: KernelHandle,
  flags: { allowWrite?: boolean } = {},
): Promise<McpHandle> {
  const mcp = mdkMcp();

  const root = componentDir(projectDir, 'mcp');
  const apps = forwardedApps(projectDir, spec.spec.apps);
  const kernelKey = resolveKernelKey(projectDir, kernel);

  const port = spec.spec.mcp.port ?? spec.spec.gateway.port + DEFAULT_MCP_PORT_OFFSET;
  await assertMcpPortFree(port);
  mkdirSync(root, { recursive: true });

  // A persistent caller identity every tool plugin's client dials with
  // (config.kernelKeyPair), admitted on the in-process Kernel and published
  // for a separately-running Kernel and its workers.
  const discovery = localDiscovery();
  const kernelKeyPair = discovery.callerKeyPair(join(root, 'identity'));
  if (kernel && typeof kernel.allowKey === 'function') kernel.allowKey(kernelKeyPair.publicKey);
  discovery.publishTrustedKey(trustedKeysDir(projectDir), 'mcp', kernelKeyPair.publicKey);

  process.stderr.write(`${theme.muted('Starting mcp')} ${arrow} ${theme.value(`:${port}`)}\n`);
  // Like the Gateway, the MCP server runs no app code: every tool call is
  // forwarded to the app's runtime (started by `mdk run`), bounded by
  // `spec.gateway.config.appTimeoutMs`.
  const server = await mcp.createMcpServer(
    root,
    port,
    { ...(spec.spec.gateway.config ?? {}), kernelKey, kernelKeyPair, ...kernelDhtConfig(projectDht(projectDir, spec)) },
    // `pluginDirs` (native, author-written `mcp-plugin.json` tools) is not yet
    // reachable from `mdk.yaml` — there is no `spec.mcp.plugins` list. App
    // route tools (via `apps` below) are deliberately the only
    // CLI path today: every declared app's routes already become
    // tools with no separate authoring, which covers the common case. Add a
    // `spec.mcp.plugins` list here if native MCP-only plugins need a CLI path.
    [],
    apps,
    {
      // Write tools are opt-in: `--allow-write` or `spec.mcp.allowWrite`.
      allowWrite: flags.allowWrite === true || spec.spec.mcp.allowWrite === true,
      ...(spec.spec.mcp.allowTools ? { allowTools: spec.spec.mcp.allowTools } : {}),
      // Every agent is checked against spec.rbac: through the in-process Kernel's
      // own policy, or as the MCP server's service account, which reads it.
      ...(kernel ? { kernel } : { credential: signingCredential(ensureAgentCredential(projectDir, MCP_ACCOUNT)) }),
      // The CLI owns SIGINT/SIGTERM (installShutdown) and stops via close().
      handleSignals: false,
      // Every app runtime allow-lists this key (resolveAppOptions).
      keyFile: mcpKeyFile(projectDir),
    },
  );
  process.stderr.write(
    `${tick} ${theme.label('mcp')} listening on ${theme.value(`http://localhost:${port}/mcp`)}\n`,
  );

  return { stop: () => new Promise((resolve) => server.close(() => resolve())) };
}

// --- worker boot ----------------------------------------------------------

/** A seed device from a worker's `config.devices` — `opts` is plugin-defined. */
interface SeedDevice {
  id: string;
  opts?: Record<string, unknown>;
}

/** A running mock device server (the shape mvp-site and scaffolded-worker mocks return). */
interface MockServer {
  /**
   * The listening object, whose type depends on the mock's transport: a
   * `net.Server` for the TCP/Modbus mocks, a Fastify instance for the HTTP ones.
   * Only the members both share can be relied on here.
   */
  server?: {
    on?: (event: string, cb: () => void) => void;
    /** Present on a `net.Server`; a Fastify instance nests it under `.server`. */
    listening?: boolean;
    /** Node >= 18.2 — drops lingering keep-alive sockets so the port frees now. */
    closeAllConnections?: () => void;
    /** Fastify's underlying `http.Server`. */
    server?: { closeAllConnections?: () => void };
  };
  /** Resolves once the transport is bound — the mock framework's own signal. */
  ready?: Promise<unknown>;
  exit: () => void;
}
interface MockModule {
  createServer(opts: Record<string, unknown>): MockServer;
}

/**
 * Waits until a freshly created mock is actually accepting connections.
 *
 * The mock framework binds differently per transport, so neither signal alone is
 * enough: HTTP mocks hand back a Fastify instance and expose the bind as a
 * `ready` promise, while TCP mocks hand back a `net.Server` that has already
 * been told to listen and reports it by emitting `'listening'`. Waiting on the
 * event alone would hang forever on a Fastify instance (it never emits it), and
 * waiting on `ready` alone would return before a TCP mock is bound.
 */
async function awaitMockReady(mock: MockServer): Promise<void> {
  if (mock.ready) await mock.ready;

  const server = mock.server;
  // `listening` is the tell for a real net.Server; guarding on it also avoids
  // waiting for an event that has already fired.
  if (server?.on && server.listening === false) {
    await once(server as unknown as EventEmitter, 'listening');
  }
}

/** Frees the listener now, whether the mock is Fastify-shaped or net.Server-shaped. */
function dropMockConnections(mock: MockServer): void {
  mock.server?.closeAllConnections?.();
  mock.server?.server?.closeAllConnections?.();
}

/**
 * Resolves each seed device's mock port to one that is actually bindable.
 *
 * A mock port is a private contract between the simulator this CLI starts and
 * the plugin that dials it — nothing outside the process cares which number it
 * is. So when the configured port is taken (a second stack on the machine, a
 * worker left running, two devices sharing a port), relocating beats refusing to
 * boot. The configured port is always tried first, so a free one stays stable
 * and matches mdk.yaml. Real (non-mock) devices are never touched: their port
 * belongs to the hardware.
 */
async function resolveMockPorts(
  workerName: string,
  seeds: SeedDevice[],
  reserved?: Iterable<number>,
): Promise<Array<Record<string, unknown>>> {
  // Seeded with the ports later workers have declared but not yet bound, so one
  // squatter cannot cascade: a relocated worker steps over its neighbours'
  // ports instead of pushing each of them along in turn.
  const claimed = new Set<number>(reserved ?? []);
  const resolved: Array<Record<string, unknown>> = [];

  for (const d of seeds) {
    const opts = { ...(d.opts ?? {}) };
    const wanted = opts.port;
    if (typeof wanted === 'number') {
      const host = typeof opts.host === 'string' ? opts.host : DEFAULT_HOST;
      const available = !claimed.has(wanted) && (await isPortFree(wanted, host));
      const port = available ? wanted : await findFreePort({ start: wanted + 1, host, taken: claimed });
      if (port !== wanted) {
        process.stderr.write(
          theme.muted(
            `  mock port ${wanted} is in use — device "${d.id}" of "${workerName}" moved to ${port}\n`,
          ),
        );
      }
      opts.port = port;
      claimed.add(port);
    }
    resolved.push(opts);
  }

  return resolved;
}

/** Mock ports a worker's seed devices ask for — what a later boot must avoid. */
export function declaredMockPorts(worker: WorkerInstance): number[] {
  const config = worker.config as { mock?: boolean; devices?: SeedDevice[] };
  if (!config.mock || !Array.isArray(config.devices)) return [];
  return config.devices
    .map((d) => d.opts?.port)
    .filter((port): port is number => typeof port === 'number');
}

/** A handle over a booted worker: its runtime plus any mock servers it owns. */
export interface WorkerHandle {
  runtime: WorkerRuntimeV2Instance;
  mocks: MockServer[];
  stop: () => Promise<void>;
}

/**
 * Resolves a spec `package` to its directory, the one way `run`, `status` and
 * `add` all do it: a **local path** (`./…`, `../…` or absolute, resolved against
 * the project dir) or an installed package, optionally with a subpath (see
 * `resolveProjectPackageDir`). Throws naming the fix when it does not resolve.
 */
export function resolvePackageDir(projectDir: string, pkg: string): string {
  if (!isLocalPackagePath(pkg)) return resolveProjectPackageDir(projectDir, pkg);
  const dir = resolve(projectDir, pkg);
  if (!existsSync(dir)) {
    throw new Error(`Package path "${pkg}" does not exist (looked in ${dir}).`);
  }
  return dir;
}

/**
 * Resolves a worker package to its directory, and confirms it is a
 * contract-first Worker Plugin (an `mdk-contract.json` at its root) — the only
 * shape `mdk run worker` supports. Checked here, rather than left to surface
 * as `WorkerRuntimeV2`'s own `ERR_CONTRACT_NOT_FOUND`/`ERR_WORKER_DIR_REQUIRED`,
 * so a misshapen package gets a message that names the fix.
 */
function resolveWorkerContractDir(projectDir: string, pkg: string): string {
  const dir = resolvePackageDir(projectDir, pkg);
  if (!existsSync(join(dir, WORKER_CONTRACT))) {
    throw new Error(
      `Worker package "${pkg}" has no ${WORKER_CONTRACT} — mdk run only supports contract-first ` +
        'Worker Plugins (a directory with mdk-contract.json at its root; `mdk create worker` scaffolds one).',
    );
  }
  return dir;
}

/**
 * Boots one worker on WorkerRuntimeV2, exactly the way the mvp-site example
 * does: start a mock device server per seed device (so the plugin talks to a
 * simulator instead of hardware), build the runtime's device set from
 * `config.devices`, then register with the Kernel.
 *
 * Discovery follows the same contract as the rest of MDK: an in-process
 * `kernel` handle registers the worker by key (target `all`); otherwise the
 * worker publishes its RPC key to the shared keys dir for a separately-running
 * local-mode Kernel to pick up.
 */
export async function runWorker(
  projectDir: string,
  worker: WorkerInstance,
  kernel?: KernelHandle,
  opts: { reservedPorts?: Iterable<number>; spec?: StackSpec } = {},
): Promise<WorkerHandle> {
  const dir = resolveWorkerContractDir(projectDir, worker.package);

  const config = worker.config as {
    devices?: SeedDevice[];
    mock?: boolean;
  };
  const seeds = Array.isArray(config.devices) ? config.devices : [];
  if (seeds.length === 0) {
    throw new Error(
      `Worker "${worker.name}" has no \`config.devices\` in mdk.yaml — nothing to run.`,
    );
  }

  // Per-worker persistent state: plugin SQLite under storeDir, DHT/RPC seeds
  // under storeDir/identity so the worker's public key survives restarts.
  const storeDir = componentDir(projectDir, 'workers', worker.name);
  mkdirSync(storeDir, { recursive: true });
  const dbPath = join(storeDir, 'data.db');
  const identityDir = join(storeDir, 'identity');
  // Holds the worker's key seeds: owner-only, also for a dir an older CLI made.
  mkdirSync(identityDir, { recursive: true, mode: 0o700 });
  chmodSync(identityDir, 0o700);

  process.stderr.write(
    `${theme.muted('Starting worker')} ${arrow} ${theme.value(worker.name)} ` +
      `${theme.muted(`(${seeds.length} device${seeds.length === 1 ? '' : 's'})`)}\n`,
  );

  // Per-device options, with mock ports resolved to something actually bindable
  // before anything starts. Both the mock and the plugin read from this same
  // list, so they cannot disagree about which port the device is on.
  const deviceOpts = config.mock
    ? await resolveMockPorts(worker.name, seeds, opts.reservedPorts)
    : seeds.map((d) => ({ ...(d.opts ?? {}) }));

  // Mock device servers — one per seed device, from `<pkg>/mock/server`.
  const mocks: MockServer[] = [];
  if (config.mock) {
    const mockPath = join(dir, 'mock', 'server.js');
    if (!existsSync(mockPath)) {
      throw new Error(`config.mock is set but ${worker.package} has no mock/server.js.`);
    }
    const mockMod = require(mockPath) as MockModule;
    for (const [i, d] of seeds.entries()) {
      const opts = deviceOpts[i];
      try {
        const m = mockMod.createServer(opts);
        mocks.push(m);
        // Wait until the mock is actually listening — the plugin's connect()
        // probes the device on boot, so a not-yet-bound port would fail startup.
        await awaitMockReady(m);
      } catch (error) {
        throw new Error(
          `Could not start the mock device for worker "${worker.name}", device "${d.id}" ` +
            `on ${String(opts.host ?? DEFAULT_HOST)}:${String(opts.port)}: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  // Device set: `config.devices[].opts` is the plugin's own per-device config;
  // dbPath is threaded through for the sample plugin's SQLite persistence.
  const devices = seeds.map((d, i) => ({ deviceId: d.id, config: { ...deviceOpts[i], dbPath } }));

  // Worker RPC is fail-closed and admits the Kernel's client key only (in
  // process, or kernel.pub in the trusted-keys dir), so every device call goes
  // through the Kernel's spec.rbac check and write-command log.
  const discovery = localDiscovery();
  const trustDir = trustedKeysDir(projectDir);
  let allowedKeys: Array<Buffer | string>;
  if (kernel) {
    const client = typeof kernel.getClientPublicKey === 'function' ? kernel.getClientPublicKey() : null;
    if (!client) throw new Error('Kernel has no client key (is HRPC enabled?) — cannot admit it on the worker.');
    allowedKeys = [client];
  } else {
    const trusted = discovery.readTrustedKeys(trustDir).filter((k) => k.name === 'kernel');
    if (!trusted.length) {
      throw new Error(
        'Kernel is not running (no kernel key in the trusted-keys dir).\nStart it first: `mdk run kernel`.',
      );
    }
    allowedKeys = trusted.filter((k) => k.name === 'kernel').map((k) => k.key);
  }

  const { WorkerRuntimeV2 } = mdkWorker();
  const runtime = new WorkerRuntimeV2(dir, {
    workerId: worker.name,
    devices,
    env: worker.env ?? {},
    storeDir: identityDir,
    allowedKeys,
    ...projectDht(projectDir, opts.spec),
  });
  const trust = kernel ? discovery.trustKernel(runtime, kernel) : discovery.trustKeysFromDir(runtime, trustDir);
  try {
    await runtime.start();
  } catch (error) {
    trust.stop();
    throw error;
  }

  const rpcKeyHex = runtime.getPublicKey().toString('hex');
  if (kernel) {
    await (kernel as unknown as { registerWorker: (k: Buffer) => Promise<void> }).registerWorker(
      runtime.getPublicKey(),
    );
    if (Array.isArray(kernel._cleanup)) {
      kernel._cleanup.push(() => {
        trust.stop();
        return runtime.stop();
      });
    }
  } else {
    discovery.publishWorkerKey(workerKeysDir(projectDir), worker.name, rpcKeyHex);
  }

  process.stderr.write(
    `${tick} ${theme.label('worker')} ${theme.value(worker.name)} ready ${theme.muted(rpcKeyHex.slice(0, 16))}\n`,
  );

  // Signals are owned by the `run` command (see lib/shutdown.ts), which stops
  // every component in reverse boot order and exits even if one of them wedges.
  const stop = async (): Promise<void> => {
    trust.stop();
    await runtime.stop();
    for (const m of mocks) {
      try {
        m.exit();
        // `server.close()` only stops new connections; a keep-alive socket from
        // the plugin's poller would hold the listener (and its port) open.
        dropMockConnections(m);
      } catch {
        /* best-effort */
      }
    }
  };

  return { runtime, mocks, stop };
}

// --- app runtimes ---------------------------------------------------------

/**
 * Resolves an app package's directory — a local path (resolved against the
 * project dir) or an installed package, optionally with a subpath — and
 * confirms it holds an `mdk-app.yaml`.
 */
export function resolveAppPackageDir(projectDir: string, pkg: string): string {
  const dir = resolvePackageDir(projectDir, pkg);
  if (!existsSync(join(dir, APP_MANIFEST))) {
    throw new Error(`App package "${pkg}" has no ${APP_MANIFEST} (looked in ${dir}).`);
  }
  return dir;
}

/** The `createAppRuntime` options for one `spec.apps[]` entry. */
export function resolveAppOptions(
  projectDir: string,
  app: AppInstance,
  kernel?: KernelHandle,
  spec?: StackSpec,
): AppRuntimeOptions {
  const dht = projectDht(projectDir, spec);
  return {
    name: app.name,
    appDir: resolveAppPackageDir(projectDir, app.package),
    config: app.config,
    kernelKey: resolveKernelKey(projectDir, kernel),
    storeDir: componentDir(projectDir, 'apps', app.name, 'store'),
    // Read per connection by the runtime, so the Gateway and MCP server may start after the app.
    allowedKeyFiles: [gatewayKeyFile(projectDir), mcpKeyFile(projectDir)],
    keyFile: appKeyFile(projectDir, app.name),
    // The Kernel is fail-closed and admits every `<name>.pub` in the trusted-keys dir.
    kernelKeyFile: join(trustedKeysDir(projectDir), `app-${app.name}.pub`),
    credentialFile: ensureAppCredential(projectDir, app.name).file,
    ...dht,
    ...kernelDhtConfig(dht),
  };
}

/** Boots one app runtime in this process (`mdk run app <name>`); the Kernel must already be running. */
export async function runApp(
  projectDir: string,
  app: AppInstance,
  spec?: StackSpec,
): Promise<{ stop: () => Promise<void> }> {
  const options = resolveAppOptions(projectDir, app, undefined, spec);
  mkdirSync(options.storeDir, { recursive: true });

  process.stderr.write(`${theme.muted('Starting app')} ${arrow} ${theme.value(app.name)}\n`);
  const runtime = mdkAppRuntime().createAppRuntime(options);
  await runtime.start();
  process.stderr.write(`${tick} ${theme.label('app')} ${theme.value(app.name)} ready\n`);
  return { stop: () => runtime.stop() };
}

const APP_STARTUP_TIMEOUT_MS = 30_000;
/** First restart delay; doubled after each crash, up to the max. */
const APP_RESTART_DELAY_MS = 1000;
const APP_RESTART_MAX_MS = 30_000;
/** A child that ran this long before exiting was healthy: its restart starts the backoff over. */
const APP_STABLE_MS = 60_000;
const APP_STOP_GRACE_MS = 3000;

/**
 * Runs one app runtime as a child process (`mdk run`). Resolves once the child
 * reports `ready`; rejects if it reports an `error`, exits first, or stays
 * silent past the startup timeout. An exit `stop()` did not ask for is
 * restarted, with a delay that doubles while the app keeps crashing. `entry`
 * defaults to the runtime's `bin/run-app.js`.
 */
export async function superviseApp(
  projectDir: string,
  app: AppInstance,
  kernel?: KernelHandle,
  entry = require.resolve('@tetherto/mdk-app-runtime/bin/run-app.js'),
  spec?: StackSpec,
): Promise<{ stop: () => Promise<void> }> {
  const options = resolveAppOptions(projectDir, app, kernel, spec);
  mkdirSync(options.storeDir, { recursive: true });
  // Resolved now: a restart runs after the CLI has chdir'd into the Gateway's state root.
  const cwd = resolve(projectDir);
  // The options carry the app's config, so they go in the environment, not argv.
  const env = { ...process.env, MDK_APP_RUNTIME_OPTIONS: JSON.stringify(options) };
  const log = (line: string): boolean => process.stderr.write(`${line}\n`);
  const childFile = appChildFile(projectDir, app.name);

  let child: ChildProcess | undefined;
  let stopped = false;
  let restartTimer: NodeJS.Timeout | undefined;
  let restartDelay = APP_RESTART_DELAY_MS;
  let readyAt = 0;

  const launch = (): Promise<void> =>
    new Promise((resolveReady, rejectReady) => {
      // `cwd` is pinned because the CLI later chdirs into the Gateway's state
      // root. `detached` keeps a terminal Ctrl+C from reaching the child: the
      // CLI stops it, and the child exits by itself when its IPC channel closes.
      const proc = spawn(process.execPath, [entry], {
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        env,
        cwd,
        // On Windows `detached` opens a console window per child instead.
        detached: process.platform !== 'win32',
      });
      child = proc;
      let ready = false;
      const fail = (error: Error): void => {
        clearTimeout(timer);
        proc.kill('SIGKILL');
        rejectReady(error);
      };
      const timer = setTimeout(
        () => fail(new Error(`App "${app.name}" did not report ready within ${APP_STARTUP_TIMEOUT_MS}ms.`)),
        APP_STARTUP_TIMEOUT_MS,
      );

      proc.on('message', (raw) => {
        const msg = (raw ?? {}) as { type?: string; message?: string };
        if (ready) return;
        if (msg.type === 'ready') {
          ready = true;
          readyAt = Date.now();
          clearTimeout(timer);
          mkdirSync(dirname(childFile), { recursive: true });
          writeFileSync(childFile, String(proc.pid));
          resolveReady();
        } else if (msg.type === 'error') {
          fail(new Error(msg.message ?? 'unknown error'));
        }
      });
      proc.on('error', fail);
      proc.on('exit', (code, signal) => {
        clearTimeout(timer);
        if (child === proc) child = undefined;
        if (appChildPid(projectDir, app.name) === proc.pid) rmSync(childFile, { force: true });
        const how = signal ? `signal ${signal}` : `code ${code}`;
        if (!ready) {
          rejectReady(new Error(`App "${app.name}" exited before it was ready (${how}).`));
        } else if (!stopped) {
          if (Date.now() - readyAt >= APP_STABLE_MS) restartDelay = APP_RESTART_DELAY_MS;
          log(
            `${theme.warn('!')} app ${theme.value(app.name)} exited unexpectedly (${how}); ` +
              `restarting in ${Math.round(restartDelay / 1000)}s`,
          );
          scheduleRestart();
        }
      });
    });

  const scheduleRestart = (): void => {
    const delay = restartDelay;
    restartDelay = Math.min(restartDelay * 2, APP_RESTART_MAX_MS);
    restartTimer = setTimeout(() => {
      launch().then(
        () => log(`${tick} ${theme.label('app')} ${theme.value(app.name)} restarted`),
        (error: Error) => {
          if (stopped) return;
          log(`${theme.warn('!')} app ${theme.value(app.name)} failed to restart: ${error.message}`);
          scheduleRestart();
        },
      );
    }, delay);
  };

  log(`${theme.muted('Starting app')} ${arrow} ${theme.value(app.name)}`);
  await launch();
  log(`${tick} ${theme.label('app')} ${theme.value(app.name)} ready`);

  return {
    stop: async () => {
      stopped = true;
      clearTimeout(restartTimer);
      const proc = child;
      if (!proc) return;
      const killTimer = setTimeout(() => proc.kill('SIGKILL'), APP_STOP_GRACE_MS);
      const exited = once(proc, 'exit');
      proc.kill('SIGTERM');
      await exited;
      clearTimeout(killTimer);
    },
  };
}
