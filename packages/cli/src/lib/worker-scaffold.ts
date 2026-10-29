import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import type { Document, YAMLMap } from 'yaml';
import { installScaffold } from './npm.js';
import { DIRS } from './project.js';
import {
  appendToStackList,
  copyTemplate,
  linkCheckoutBackend,
  linkIntoProject,
  updateJson,
  type StackFileUpdate,
} from './scaffold.js';
import { deviceId, deviceSerial, MOCK_PORT_BASE } from './spec.js';
import { NAME_RE, parseOrg } from './names.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Placeholder baked into `templates/worker/**`, replaced at scaffold time. */
const NAME_TOKEN = '__WORKER_NAME__';

/**
 * Absolute path to the bundled worker template (`templates/worker`). Resolves the same from
 * `dist/lib` (built) and `src/lib` (tsx dev) since both sit one level under the
 * package root.
 */
function templateDir(): string {
  return resolve(__dirname, '..', '..', 'templates', 'worker');
}

export interface WorkerScaffoldOptions {
  /** Worker name — used for the folder, the mdk.yaml entry, and the package name. */
  name: string;
  /** Project directory; the worker is created under `<parentDir>/workers/<name>`. */
  parentDir: string;
  /** npm scope/org for the generated package name (e.g. `demo` → `@demo/<name>`). */
  org?: string;
  /** Overwrite the target if it already exists (default: false). */
  force?: boolean;
  /** Run `npm install` in the scaffolded worker (default: true). */
  install?: boolean;
  /** Add the worker entry to `<parentDir>/mdk.yaml` under `spec.workers` (default: true). */
  updateStackFile?: boolean;
}

export interface WorkerScaffoldResult {
  ok: boolean;
  message?: string;
  detail?: string;
  /** Absolute path of the scaffolded worker. */
  workerPath?: string;
  /** Local path to reference in mdk.yaml (`./workers/<name>`). */
  relPackage?: string;
  /** Resolved package.json `name`. */
  packageName?: string;
  /** Warning surfaced when `npm install` could not complete (scaffold still ok). */
  installWarning?: string;
  /** Directory `npm install` ran in (the workspace root for a linked worker). */
  installDir?: string;
  /** How the `mdk.yaml` update went (so the caller can guide the user). */
  stackFile?: StackFileUpdate;
  /** Mock port the seed device was given — so a printed snippet matches the file. */
  mockPort?: number;
}

/**
 * Lowest mock port from `MOCK_PORT_BASE` up that no device in this project's
 * spec already claims, so scaffolding a second worker cannot collide with the
 * first. Only covers *this* project — a port taken by another stack on the
 * machine is resolved at boot (see `resolveMockPorts` in runtime.ts).
 */
function nextMockPort(doc: Document): number {
  const spec = doc.toJS() as {
    spec?: { workers?: Array<{ config?: { devices?: Array<{ opts?: { port?: unknown } }> } }> };
  };

  const used = new Set<number>();
  for (const worker of spec?.spec?.workers ?? []) {
    for (const device of worker?.config?.devices ?? []) {
      const port = device?.opts?.port;
      if (typeof port === 'number') used.add(port);
    }
  }

  let port = MOCK_PORT_BASE;
  while (used.has(port)) port++;
  return port;
}

/** Outcome of the `mdk.yaml` edit, plus the mock port the entry was given. */
export interface StackFileResult {
  update: StackFileUpdate;
  port: number;
}

/**
 * Appends a worker to `spec.workers` in `<parentDir>/mdk.yaml`. With `mock` (the
 * default) it seeds a `mock: true` config with one sample device on an unclaimed port
 * so the entry is runnable immediately; without, the device options are the
 * operator's to fill in. No-ops (`'exists'`) when this worker is listed already;
 * `'name-taken'` when the name belongs to a worker running another package.
 */
export function addWorkerToStackFile(
  parentDir: string,
  name: string,
  relPackage: string,
  { mock = true }: { mock?: boolean } = {},
): StackFileResult {
  let port = MOCK_PORT_BASE;
  const update = appendToStackList(
    parentDir,
    'workers',
    name,
    (entry) => entry.get('name') === name && entry.get('package') === relPackage,
    (doc) => {
      port = nextMockPort(doc);
      // Flow-style opts to match the compact form the scaffold documents. The
      // device identity is derived from the (project-unique) worker name: the
      // Kernel registers device ids globally, so a shared `dev-0` would leave the
      // second worker silently unregistered.
      const opts = doc.createNode(mock ? { host: '127.0.0.1', port, serial: deviceSerial(name) } : {});
      (opts as unknown as { flow: boolean }).flow = true;
      const worker = doc.createNode({
        name,
        package: relPackage,
        config: { ...(mock ? { mock: true } : {}), devices: [{ id: deviceId(name) }] },
      }) as YAMLMap;
      worker.setIn(['config', 'devices', 0, 'opts'], opts);
      return worker;
    },
  );
  return { update, port };
}

/**
 * Scaffolds a new Worker Plugin package from the bundled worker template
 * into `<parentDir>/workers/<name>` — the local-path layout `mdk run worker`
 * expects. Substitutes the name token and sets the package.json `name`.
 */
export function createWorker(opts: WorkerScaffoldOptions): WorkerScaffoldResult {
  const name = opts.name.trim();
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      message: `Invalid worker name "${opts.name}". Use lowercase letters, digits, '.', '_' or '-'.`,
    };
  }

  const org = parseOrg(opts.org);
  if (!org.ok) return { ok: false, message: org.message };

  const src = templateDir();
  if (!existsSync(src)) {
    return { ok: false, message: `Worker template not found at ${src}.` };
  }

  const workerPath = resolve(opts.parentDir, DIRS.workers, name);
  if (existsSync(workerPath) && !opts.force) {
    return { ok: false, message: `${workerPath} already exists (use --force to overwrite).` };
  }

  try {
    mkdirSync(resolve(opts.parentDir, DIRS.workers), { recursive: true });
    copyTemplate(src, workerPath, { [NAME_TOKEN]: name });

    const packageName = org.org ? `@${org.org}/${name}` : name;
    updateJson(join(workerPath, 'package.json'), { name: packageName });
    linkCheckoutBackend(join(workerPath, 'package.json'));

    const linkWarning = linkIntoProject(opts.parentDir, packageName, workerPath);
    const install = installScaffold(opts.parentDir, workerPath, opts.install !== false);

    const relPackage = `./${DIRS.workers}/${name}`;
    const stackFile =
      opts.updateStackFile === false
        ? undefined
        : addWorkerToStackFile(opts.parentDir, name, relPackage);

    return {
      ok: true,
      workerPath,
      relPackage,
      packageName,
      installWarning: linkWarning ?? (install.ok ? undefined : install.message),
      installDir: install.dir,
      stackFile: stackFile?.update,
      mockPort: stackFile?.port ?? MOCK_PORT_BASE,
    };
  } catch (error) {
    return {
      ok: false,
      message: 'Could not scaffold the worker.',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
