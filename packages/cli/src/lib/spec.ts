import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { findCatalogWorker, type CatalogWorker } from './catalog.js';
import { DEFAULT_HOST } from './ports.js';

export interface StackAnswers {
  stackName: string;
  gatewayPort: number;
  kernelPort: number;
  workerBasePort: number;
  workerPackages: string[];
  gatewayPackages: string[];
  /** Gateway-level settings destined for `spec.gateway.config` (see plugin-setup.ts). */
  gatewayConfig?: Record<string, unknown>;
  /** Per-plugin setup answers, keyed by package, destined for `spec.gateway.plugins[].config`. */
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

export interface StackSpec {
  apiVersion: string;
  kind: string;
  metadata: { name: string };
  spec: {
    kernel: { port: number };
    gateway: {
      port: number;
      /** Merged into the gateway's `common.json` — gateway-wide settings only;
       * a plugin's own settings belong in its `plugins[].config` block. */
      config: Record<string, unknown>;
      /** Each plugin's `config` is handed to that plugin alone (merged over the
       * gateway conf in its ambient context). */
      plugins: Array<{ package: string; config: Record<string, unknown> }>;
    };
    /** Optional MCP server settings; `port` defaults to `gateway.port + 100` when the CLI boots it. */
    mcp: { port?: number };
    workers: WorkerInstance[];
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

/**
 * Resolves one `spec.workers[].env` value: `${NAME}` is replaced with
 * `process.env.NAME`, falling back to the literal text when the variable is
 * unset — enough to keep secrets out of mdk.yaml without a templating engine.
 */
function resolveEnvValue(value: string): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => process.env[name] ?? match);
}

export function shortName(pkg: string): string {
  const base = pkg.split('/').pop() ?? pkg;
  return (
    base.replace(/^mdk-worker-/, '').replace(/^mdk-plugin-/, '').replace(/^mdk-/, '') || base
  );
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
 * selected gateway plugin is added under `gateway.plugins`.
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
        plugins: answers.gatewayPackages.map((pkg) => ({
          package: pkg,
          config: answers.pluginConfigs?.[pkg] ?? pluginConfig(pkg),
        })),
      },
      // Onboarding never asks about MCP settings; `loadStackSpec` defaults
      // this the same way when the section is absent from mdk.yaml entirely.
      mcp: {},
      workers,
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

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (raw === null || typeof raw !== 'object') {
    fail(`${file} is empty or not a mapping. Run \`mdk onboard\` to recreate it.`);
  }
  const doc = raw as Record<string, unknown>;

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
  const gatewayConfig = (g.config ?? {}) as Record<string, unknown>;

  const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
  const name = typeof metadata.name === 'string' ? metadata.name : 'mdk-stack';

  const plugins = Array.isArray(g.plugins)
    ? (g.plugins as Array<Record<string, unknown>>).map((p, i) => {
        if (typeof p?.package !== 'string' || !p.package) {
          fail(`${file}: \`spec.gateway.plugins[${i}].package\` must be a non-empty string.`);
        }
        return {
          package: p.package as string,
          config: (p.config ?? {}) as Record<string, unknown>,
        };
      })
    : [];

  const kernel = (s.kernel ?? {}) as Record<string, unknown>;

  if (s.mcp != null && (typeof s.mcp !== 'object' || Array.isArray(s.mcp))) {
    fail(`${file}: \`spec.mcp\` must be a mapping.`);
  }
  const rawMcp = (s.mcp ?? {}) as Record<string, unknown>;
  if (rawMcp.port != null && typeof rawMcp.port !== 'number') {
    fail(`${file}: \`spec.mcp.port\` must be a number.`);
  }
  const mcp = typeof rawMcp.port === 'number' ? { port: rawMcp.port } : {};

  const workers = Array.isArray(s.workers)
    ? (s.workers as Array<Record<string, unknown>>).map((w, i) => {
        if (typeof w?.name !== 'string' || !w.name) {
          fail(`${file}: \`spec.workers[${i}].name\` must be a non-empty string.`);
        }
        if (typeof w?.package !== 'string' || !w.package) {
          fail(`${file}: \`spec.workers[${i}].package\` must be a non-empty string.`);
        }
        const rawEnv = w.env as Record<string, unknown> | undefined;
        const env: Record<string, string> = {};
        if (rawEnv && typeof rawEnv === 'object') {
          for (const [key, value] of Object.entries(rawEnv)) {
            if (typeof value === 'string') env[key] = resolveEnvValue(value);
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

  return {
    apiVersion: doc.apiVersion,
    kind: 'Stack',
    metadata: { name },
    spec: {
      kernel: { port: typeof kernel.port === 'number' ? (kernel.port as number) : 0 },
      gateway: { port: g.port, config: gatewayConfig, plugins },
      mcp,
      workers,
    },
  };
}

export { StackSpecError };
