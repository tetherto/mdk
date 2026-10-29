import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isIP } from 'node:net';
import { isAbsolute, resolve } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { findCatalogApp, findCatalogWorker, type CatalogWorker } from './catalog.js';
import { DEFAULT_HOST } from './ports.js';
import { readProjectEnv } from './env-file.js';
import { NAME_RE } from './names.js';
import { rbacProblems, type RbacPolicy } from './rbac.js';

const require = createRequire(import.meta.url);

export interface StackAnswers {
  stackName: string;
  gatewayPort: number;
  kernelPort: number;
  workerBasePort: number;
  workerPackages: string[];
  appPackages: string[];
  /** Gateway-level settings destined for `spec.gateway.config` (see plugin-setup.ts). */
  gatewayConfig?: Record<string, unknown>;
  /** Per-app setup answers, keyed by package, destined for `spec.apps[].config`. */
  pluginConfigs?: Record<string, Record<string, unknown>>;
}

export interface WorkerInstance {
  name: string;
  package: string;
  port: number;
  config: Record<string, unknown>;
  /** Resolved by `loadStackSpec` from `spec.workers[].env` — see `resolveEnvValue`. */
  env?: Record<string, string>;
}

/** One `spec.apps[]` entry: a package with an `mdk-app.yaml`, run as its own runtime behind the Gateway. */
export interface AppInstance {
  /** Matches `APP_NAME_PATTERN`; the Gateway serves the app under `/apps/<name>` unless `mount` is set. */
  name: string;
  package: string;
  config: Record<string, unknown>;
  mount?: string;
  /** The identity the app's runtime calls the Kernel as, always `app:<name>`. Written by `mdk add app`. */
  serviceAccount?: string;
  /** Digest of the mdk-app.yaml `permissions` install last granted (see planAppGrant in rbac.ts). */
  permissionsDigest?: string;
}

const APP_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * The Gateway's own rule for `mount` (startGateway in @tetherto/mdk-core): a
 * leading "/" and literal segments (no `:param`, `*`, `.` or `..`). Checked
 * here so a bad mount fails before anything boots, not in the Gateway last.
 */
function isValidMount(mount: string): boolean {
  return mount.startsWith('/') && mount.split('/').filter(Boolean).every((s) => /^(?!\.\.?$)[A-Za-z0-9._~-]+$/.test(s));
}

/** Coerces a package or folder name into a valid app name. */
export function toAppName(raw: string): string {
  const slug = raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(slug) ? slug : `app-${slug}`;
}

export interface McpSpec {
  port?: number;
  allowWrite?: boolean;
  allowTools?: string[];
}

/**
 * A private HyperDHT network instead of the public `*.hyperdht.org` bootstrap
 * (the local / air-gapped profile). Every component's DHT node joins
 * `bootstrap` and binds `host`. Without `bootstrap`, the process running the
 * Kernel (`mdk run`, `mdk run kernel`) also runs the bootstrap at `host:port`,
 * and every other `mdk run` target joins it there.
 */
export interface DhtSpec {
  /** An existing private bootstrap list (`host:port`). */
  bootstrap?: string[];
  /**
   * Interface every DHT node binds, and where a generated bootstrap is reached.
   * Unset: `127.0.0.1` with a generated bootstrap; every interface when joining
   * a `bootstrap` list.
   */
  host?: string;
  /** UDP port of the generated bootstrap (default 49737). */
  port: number;
}

export const DEFAULT_DHT_HOST = '127.0.0.1';
export const DEFAULT_DHT_PORT = 49737;

export interface StackSpec {
  apiVersion: string;
  kind: string;
  metadata: { name: string };
  spec: {
    kernel: { port: number };
    gateway: {
      port: number;
      /** Merged into the gateway's `common.json` — gateway-wide settings only;
       * an app's own settings belong in its `spec.apps[].config` block. */
      config: Record<string, unknown>;
    };
    /**
     * Optional MCP server settings; `port` defaults to `gateway.port + 100` when
     * the CLI boots it. Every agent signs in with its own service account and
     * sees only the tools spec.rbac lets it call. Write tools stay hidden unless
     * `allowWrite` (or the `--allow-write` flag) is set or they are named in
     * `allowTools`.
     */
    mcp: McpSpec;
    workers: WorkerInstance[];
    apps: AppInstance[];
    /**
     * Who may do what, at the Gateway (users), the MCP server (agents) and the
     * Kernel (apps). Absent means no policy, which denies everything. Validated
     * by @tetherto/mdk-rbac; applied to the Kernel at boot and by `mdk rbac apply`.
     */
    rbac?: RbacPolicy;
    /** Optional network settings; `dht` switches the stack to a private HyperDHT. */
    network?: { dht?: DhtSpec };
  };
}

/**
 * Whether a spec's `package` names a directory on disk rather than an npm
 * package — relative or absolute either way. Scaffolded components are written
 * as paths, so they are resolved from disk and never handed to `npm install`.
 */
export function isLocalPackagePath(pkg: string): boolean {
  return pkg.startsWith('.') || isAbsolute(pkg);
}

const ENV_REF_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Resolves one string from `mdk.yaml` (`spec.workers[].env`, and every string in
 * `spec.gateway.config` / `spec.apps[].config`): `${NAME}` is
 * replaced with `process.env.NAME`, else the project's `.env`, falling back to
 * the literal text when the variable is unset — enough to keep secrets out of
 * mdk.yaml without a templating engine.
 */
function resolveEnvValue(value: string, vars: Record<string, string | undefined>): string {
  return value.replace(ENV_REF_RE, (match, name: string) => vars[name] ?? match);
}

/**
 * The first `${NAME}` that `resolveEnvValue` left in `value` because NAME was
 * unset, or undefined. For a secret, where keeping the literal text would turn
 * a missing variable into a guessable value.
 */
export function unresolvedEnvRef(value: string): string | undefined {
  return value.match(new RegExp(ENV_REF_RE.source))?.[1];
}

/** `resolveEnvValue` applied to every string inside a config block. */
function resolveEnvDeep(value: unknown, vars: Record<string, string | undefined>): unknown {
  if (typeof value === 'string') return resolveEnvValue(value, vars);
  if (Array.isArray(value)) return value.map((item) => resolveEnvDeep(item, vars));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveEnvDeep(item, vars)]),
    );
  }
  return value;
}

export function shortName(pkg: string): string {
  const base = pkg.split('/').pop() ?? pkg;
  return base.replace(/^mdk-(worker-|plugin-|app-)?/, '') || base;
}

/** First port a seeded mock device server is offered. */
export const MOCK_PORT_BASE = 18080;

/** Stack-unique id for a worker's seed device (worker names are unique). */
export function deviceId(workerName: string): string {
  return `${workerName}-0`;
}

/** Matching serial for the seed device, in the shape device firmware reports. */
export function deviceSerial(workerName: string): string {
  return deviceId(workerName).toUpperCase();
}

/**
 * Config block for one selected worker.
 *
 * Worker config is plugin-defined and otherwise opaque to the CLI, so this can
 * only be filled in for catalog entries whose device shape we know. Those get a
 * seed device and `mock: true`, which is the whole difference between a spec
 * that boots and one the user has to finish by hand.
 */
function workerConfig(
  entry: CatalogWorker | undefined,
  name: string,
  mockPort: number,
): Record<string, unknown> {
  // Nothing known about this package's devices — leave an editable starter value
  // and let `mdk run` name what is still missing.
  if (!entry?.deviceOpts && !entry?.mock) return { pollIntervalMs: 2000 };

  return {
    ...(entry.config ?? {}),
    ...(entry.mock ? { mock: true } : {}),
    devices: [
      {
        id: deviceId(name),
        opts: {
          host: DEFAULT_HOST,
          port: mockPort,
          serial: deviceSerial(name),
          ...entry.deviceOpts,
        },
      },
    ],
  };
}

function pluginConfig(pkg: string): Record<string, unknown> {
  if (pkg.includes('summary')) return { refreshIntervalMs: 5000 };
  if (pkg.includes('alerts')) return { evaluateIntervalMs: 10000 };
  return {};
}

/**
 * Builds the declarative stack spec (`mdk.yaml`) purely from the onboarding
 * answers. One worker instance is created per selected worker plugin, and each
 * selected app is added under `spec.apps`.
 */
export function buildStackSpec(answers: StackAnswers): StackSpec {
  const workers: WorkerInstance[] = answers.workerPackages.map((pkg, i) => {
    const entry = findCatalogWorker(pkg);
    const name = `${shortName(pkg)}-a`;
    return {
      name,
      // Always the package name: a bundled worker is `file:`-linked into the
      // project's node_modules under this name (see addFileDependency), so the
      // spec stays portable and does not hard-code anyone's checkout path.
      package: pkg,
      port: answers.workerBasePort + i * 2,
      // One mock port per worker, so selecting several cannot collide.
      config: workerConfig(entry, name, MOCK_PORT_BASE + i),
    };
  });

  return {
    apiVersion: 'mdk/v1',
    kind: 'Stack',
    metadata: { name: answers.stackName },
    spec: {
      kernel: { port: answers.kernelPort },
      gateway: {
        port: answers.gatewayPort,
        config: answers.gatewayConfig ?? {},
      },
      // Onboarding never asks about MCP settings; `loadStackSpec` defaults
      // this the same way when the section is absent from mdk.yaml entirely.
      mcp: {},
      workers,
      apps: answers.appPackages.map((pkg) => {
        const mount = findCatalogApp(pkg)?.mount;
        return {
          name: toAppName(shortName(pkg)),
          package: pkg,
          config: answers.pluginConfigs?.[pkg] ?? pluginConfig(pkg),
          ...(mount !== undefined ? { mount } : {}),
        };
      }),
      // The CLI's own account gets full access through an ordinary role, so a new
      // stack can be administered; narrow or remove it like any other binding.
      rbac: {
        enforcement: 'deny',
        roles: [
          { name: 'admin', rules: [{ resources: ['*'], verbs: ['*'] }] },
          { name: 'gateway', rules: [{ resources: ['policy'], verbs: ['read'] }] },
        ],
        bindings: [
          { role: 'admin', subjects: [{ kind: 'ServiceAccount', name: 'mdk-cli' }] },
          {
            role: 'gateway',
            subjects: [
              { kind: 'ServiceAccount', name: 'mdk-gateway' },
              { kind: 'ServiceAccount', name: 'mdk-mcp' },
            ],
          },
        ],
      },
    },
  };
}

/** File name of the declarative stack spec, relative to a project directory. */
export const STACK_FILE = 'mdk.yaml';

class StackSpecError extends Error {}

function fail(message: string): never {
  throw new StackSpecError(message);
}

/**
 * Rejects worker names and device ids that repeat across the stack.
 *
 * The Kernel registers both globally, so a duplicate does not error — the second
 * registration is simply dropped, and the stack comes up looking fine while a
 * worker is missing from the fleet. Catching it here turns a silent, confusing
 * runtime failure into a spec error that names both offenders.
 */
function assertUniqueIdentities(file: string, workers: WorkerInstance[]): void {
  const workerNames = new Set<string>();
  const deviceOwners = new Map<string, string>();

  for (const worker of workers) {
    if (workerNames.has(worker.name)) {
      fail(`${file}: duplicate worker name "${worker.name}" in \`spec.workers\`.`);
    }
    workerNames.add(worker.name);

    const devices = (worker.config as { devices?: Array<{ id?: unknown }> }).devices;
    if (!Array.isArray(devices)) continue;

    for (const device of devices) {
      const id = device?.id;
      if (typeof id !== 'string' || !id) continue;

      const owner = deviceOwners.get(id);
      if (owner) {
        fail(
          `${file}: duplicate device id "${id}" — used by workers "${owner}" and "${worker.name}".\n` +
            'Device ids must be unique across the stack, or only one of them will register.',
        );
      }
      deviceOwners.set(id, worker.name);
    }
  }
}

/**
 * Reads and validates `<projectDir>/mdk.yaml` into a `StackSpec`.
 *
 * Throws a `StackSpecError` with an actionable message (pointing at
 * `mdk onboard`) when the file is missing, unparseable, or structurally
 * invalid. Only the fields `mdk run` relies on are validated here; plugin/worker
 * `config` blocks stay opaque (plugin-defined).
 */
export function loadStackSpec(projectDir: string): StackSpec {
  const file = resolve(projectDir, STACK_FILE);
  if (!existsSync(file)) {
    fail(`No ${STACK_FILE} found in ${resolve(projectDir)}.\nRun \`mdk onboard\` to create one.`);
  }
  const doc = readStackDocument(file);

  if (doc.kind !== 'Stack') {
    fail(`${file}: expected \`kind: Stack\`, got ${JSON.stringify(doc.kind ?? null)}.`);
  }
  if (typeof doc.apiVersion !== 'string' || !doc.apiVersion) {
    fail(`${file}: missing \`apiVersion\`.`);
  }

  const spec = doc.spec;
  if (spec === null || typeof spec !== 'object') {
    fail(`${file}: missing \`spec\` mapping.`);
  }
  const s = spec as Record<string, unknown>;

  const gateway = s.gateway;
  if (gateway === null || typeof gateway !== 'object') {
    fail(`${file}: missing \`spec.gateway\` mapping.`);
  }
  const g = gateway as Record<string, unknown>;
  if (typeof g.port !== 'number') {
    fail(`${file}: \`spec.gateway.port\` must be a number.`);
  }

  if (g.config != null && (typeof g.config !== 'object' || Array.isArray(g.config))) {
    fail(`${file}: \`spec.gateway.config\` must be a mapping.`);
  }
  if (g.config != null && (g.config as Record<string, unknown>).authVerifier !== undefined) {
    fail(
      `${file}: \`spec.gateway.config.authVerifier\` is no longer supported: spec.rbac governs every app route ` +
        '(users sign in at /auth/login). Remove it, and bind users to roles in spec.rbac.',
    );
  }
  // The process environment wins over the project's `.env`, as with dotenv.
  const vars: Record<string, string | undefined> = { ...readProjectEnv(resolve(projectDir)), ...process.env };
  const gatewayConfig = resolveEnvDeep(g.config ?? {}, vars) as Record<string, unknown>;

  const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
  const name = typeof metadata.name === 'string' ? metadata.name : 'mdk-stack';

  if (g.plugins != null) fail(unsupportedPluginsMessage(file, g.plugins));

  const kernel = (s.kernel ?? {}) as Record<string, unknown>;

  if (s.mcp != null && (typeof s.mcp !== 'object' || Array.isArray(s.mcp))) {
    fail(`${file}: \`spec.mcp\` must be a mapping.`);
  }
  const rawMcp = (s.mcp ?? {}) as Record<string, unknown>;
  if (rawMcp.port != null && typeof rawMcp.port !== 'number') {
    fail(`${file}: \`spec.mcp.port\` must be a number.`);
  }
  const mcp: McpSpec = typeof rawMcp.port === 'number' ? { port: rawMcp.port } : {};
  if (rawMcp.allowWrite != null) {
    if (typeof rawMcp.allowWrite !== 'boolean') fail(`${file}: \`spec.mcp.allowWrite\` must be a boolean.`);
    mcp.allowWrite = rawMcp.allowWrite;
  }
  if (rawMcp.allowTools != null) {
    if (!Array.isArray(rawMcp.allowTools) || !rawMcp.allowTools.every((t) => typeof t === 'string' && t)) {
      fail(`${file}: \`spec.mcp.allowTools\` must be a list of tool ids.`);
    }
    mcp.allowTools = rawMcp.allowTools as string[];
  }
  // One shared bearer and one static identity for every agent would sit outside
  // spec.rbac: each agent now signs in with its own service account instead.
  for (const key of ['token', 'identity'] as const) {
    if (rawMcp[key] != null) {
      fail(
        `${file}: \`spec.mcp.${key}\` is no longer supported: each AI agent signs in with its own service account ` +
          '(`mdk sa add <agent>`), and spec.rbac decides what it may call. Remove it, and bind the agent to a role.',
      );
    }
  }

  const workers = Array.isArray(s.workers)
    ? (s.workers as Array<Record<string, unknown>>).map((w, i) => {
        if (typeof w?.name !== 'string' || !w.name) {
          fail(`${file}: \`spec.workers[${i}].name\` must be a non-empty string.`);
        }
        // The name becomes a state directory under `.mdk/` (and an identity
        // dir), so it must be a single safe path segment.
        if (!NAME_RE.test(w.name as string)) {
          fail(
            `${file}: \`spec.workers[${i}].name\` "${w.name as string}" is invalid. ` +
              "Use lowercase letters, digits, '.', '_' or '-'.",
          );
        }
        if (typeof w?.package !== 'string' || !w.package) {
          fail(`${file}: \`spec.workers[${i}].package\` must be a non-empty string.`);
        }
        const rawEnv = w.env as Record<string, unknown> | undefined;
        const env: Record<string, string> = {};
        if (rawEnv && typeof rawEnv === 'object') {
          for (const [key, value] of Object.entries(rawEnv)) {
            if (typeof value === 'string') env[key] = resolveEnvValue(value, vars);
          }
        }
        return {
          name: w.name as string,
          package: w.package as string,
          port: typeof w.port === 'number' ? (w.port as number) : 0,
          config: (w.config ?? {}) as Record<string, unknown>,
          env,
        };
      })
    : [];

  assertUniqueIdentities(file, workers);

  if (s.apps != null && !Array.isArray(s.apps)) {
    fail(`${file}: \`spec.apps\` must be a list.`);
  }
  const appNames = new Set<string>();
  const apps = ((s.apps ?? []) as Array<Record<string, unknown>>).map((a, i): AppInstance => {
    const at = `\`spec.apps[${i}]`;
    if (typeof a?.name !== 'string' || !APP_NAME_PATTERN.test(a.name)) {
      fail(`${file}: ${at}.name\` must be lowercase letters, digits and dashes, starting with a letter.`);
    }
    if (appNames.has(a.name)) fail(`${file}: duplicate app name "${a.name}" in \`spec.apps\`.`);
    appNames.add(a.name);
    if (typeof a.package !== 'string' || !a.package) {
      fail(`${file}: ${at}.package\` must be a non-empty string.`);
    }
    if (a.config != null && (typeof a.config !== 'object' || Array.isArray(a.config))) {
      fail(`${file}: ${at}.config\` must be a mapping.`);
    }
    if (a.mount != null && (typeof a.mount !== 'string' || !isValidMount(a.mount))) {
      fail(`${file}: ${at}.mount\` must be a path of literal segments starting with "/", e.g. / or /ops.`);
    }
    if (a.serviceAccount != null && a.serviceAccount !== `app:${a.name}`) {
      fail(`${file}: ${at}.serviceAccount\` must be "app:${a.name}" (an app always runs as its own service account).`);
    }
    if (a.permissionsDigest != null && (typeof a.permissionsDigest !== 'string' || !/^[0-9a-f]{16}$/.test(a.permissionsDigest))) {
      fail(`${file}: ${at}.permissionsDigest\` is written by \`mdk add app\`; remove it rather than editing it.`);
    }
    return {
      name: a.name,
      package: a.package,
      config: resolveEnvDeep(a.config ?? {}, vars) as Record<string, unknown>,
      ...(typeof a.mount === 'string' ? { mount: a.mount } : {}),
      ...(typeof a.serviceAccount === 'string' ? { serviceAccount: a.serviceAccount } : {}),
      ...(typeof a.permissionsDigest === 'string' ? { permissionsDigest: a.permissionsDigest } : {}),
    };
  });

  const network = parseNetwork(file, s.network);

  // Policy is never env-resolved: who may do what is written out in full.
  const problems = rbacProblems(s.rbac);
  if (problems.length) {
    fail(`${file}: \`spec.rbac\` is invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }

  return {
    apiVersion: doc.apiVersion,
    kind: 'Stack',
    metadata: { name },
    spec: {
      kernel: { port: typeof kernel.port === 'number' ? (kernel.port as number) : 0 },
      gateway: { port: g.port, config: gatewayConfig },
      mcp,
      workers,
      apps,
      ...(s.rbac != null ? { rbac: s.rbac as RbacPolicy } : {}),
      ...(network ? { network } : {}),
    },
  };
}

/** `file` parsed as a YAML mapping; throws a `StackSpecError` otherwise. */
function readStackDocument(file: string): Record<string, unknown> {
  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (raw === null || typeof raw !== 'object') {
    fail(`${file} is empty or not a mapping. Run \`mdk onboard\` to recreate it.`);
  }
  return raw as Record<string, unknown>;
}

/**
 * `spec.network.dht` of `<projectDir>/mdk.yaml`, validated on its own: undefined
 * without the file or the section. A file that does not parse, or a `dht`
 * section that is invalid, throws — a component that skipped a private profile
 * would join the public DHT instead. Errors elsewhere in the file do not, so
 * the CLI can still reach a Kernel to fix them.
 */
export function loadStackDht(projectDir: string): DhtSpec | undefined {
  const file = resolve(projectDir, STACK_FILE);
  if (!existsSync(file)) return undefined;
  const spec = readStackDocument(file).spec;
  const network = spec && typeof spec === 'object' ? (spec as Record<string, unknown>).network : undefined;
  return parseNetwork(file, network)?.dht;
}

/** mdk-core's bootstrap-list checks: the one copy of hyperdht's public node set. */
interface DhtBootstrapModule {
  parseBootstrap(value: string[]): string[] | null;
  resolveDhtHost(host: string | null, bootstrap: string[] | null): string | null;
}

function dhtBootstrapModule(): DhtBootstrapModule {
  return require('@tetherto/mdk-core/lib/dht-bootstrap') as DhtBootstrapModule;
}

/** An mdk-core error message without its `ERR_…: ` code. */
const withoutCode = (error: unknown): string => (error instanceof Error ? error.message : String(error)).replace(/^ERR_[A-Z_]+: /, '');

/** `spec.network`: only `dht` so far. */
function parseNetwork(file: string, raw: unknown): { dht?: DhtSpec } | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) fail(`${file}: \`spec.network\` must be a mapping.`);
  const n = raw as Record<string, unknown>;
  if (n.dht == null) return {};
  if (typeof n.dht !== 'object' || Array.isArray(n.dht)) fail(`${file}: \`spec.network.dht\` must be a mapping.`);
  const d = n.dht as Record<string, unknown>;
  const core = dhtBootstrapModule();

  const host = d.host;
  if (host != null && (typeof host !== 'string' || !isIP(host))) {
    fail(`${file}: \`spec.network.dht.host\` must be an IP address (e.g. 127.0.0.1, or this machine's LAN address).`);
  }
  const port = d.port ?? DEFAULT_DHT_PORT;
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`${file}: \`spec.network.dht.port\` must be a UDP port number.`);
  }
  const dht: DhtSpec = { ...(host != null ? { host: host as string } : {}), port };
  if (d.bootstrap != null) {
    const list = d.bootstrap;
    const entriesMsg = `${file}: \`spec.network.dht.bootstrap\` must be a list of host:port entries.`;
    if (!Array.isArray(list) || !list.length || !list.every((b) => typeof b === 'string')) fail(entriesMsg);
    try {
      dht.bootstrap = core.parseBootstrap(list as string[]) ?? undefined;
    } catch (error) {
      if (/^ERR_MDK_DHT_BOOTSTRAP_PUBLIC\b/.test(error instanceof Error ? error.message : '')) {
        fail(`${file}: \`spec.network.dht.bootstrap\`: ${withoutCode(error)}.`);
      }
      fail(entriesMsg);
    }
    if (!dht.bootstrap) fail(entriesMsg);
  }
  try {
    core.resolveDhtHost(dht.host ?? null, dht.bootstrap ?? null);
  } catch (error) {
    fail(`${file}: \`spec.network.dht.host\`: ${withoutCode(error)}.`);
  }
  return { dht };
}

/**
 * The error for a spec with `spec.gateway.plugins`: names the `spec.apps`
 * entries for the packages it lists, ready to paste.
 */
function unsupportedPluginsMessage(file: string, plugins: unknown): string {
  const apps = (Array.isArray(plugins) ? plugins : [])
    .filter((p): p is Record<string, unknown> => typeof p?.package === 'string' && p.package !== '')
    .map((p) => {
      const pkg = p.package as string;
      const config = p.config && typeof p.config === 'object' && !Array.isArray(p.config) ? p.config : undefined;
      return { name: toAppName(shortName(pkg)), package: pkg, ...(config ? { config } : {}) };
    });
  const lines = [
    `${file}: \`spec.gateway.plugins\` is not supported. Apps are declared under \`spec.apps\`; each runs in its own process behind the Gateway.`,
  ];
  if (apps.length) {
    const snippet = stringifyYaml({ apps }).trimEnd().split('\n').map((line) => `    ${line}`).join('\n');
    lines.push('For the packages listed there, under `spec`:', '', snippet, '');
  }
  lines.push(
    'Each package also needs an mdk-app.yaml; once it is listed, check it with `mdk validate app <name>`. Add `mount: /` to an app whose',
    'clients call its routes at the Gateway root (the bundled agent, for one); otherwise they are served under /apps/<name>.',
  );
  return lines.join('\n');
}

export { StackSpecError };
