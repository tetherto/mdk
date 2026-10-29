import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { APP_MANIFEST, isMapping, message } from './app-package.js';

const require = createRequire(import.meta.url);

/** What a route handler is called with: the app runtime's `req`, minus the HRPC envelope. */
interface SmokeRequest {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, unknown>;
}

/** One mock device the mock Kernel serves. */
interface MockDevice {
  id: string;
  /** Replies to `pullTelemetry(id, type)`, by query type. Default `{ metrics: {} }`. */
  telemetry?: Record<string, unknown>;
  /** Reply to `pullState(id)`. Default `{ status: 'OK' }`. */
  state?: unknown;
  /** Reply to `getCapabilities(id)`. Default `{}`. */
  capabilities?: unknown;
}

/** One mock worker: its devices are named `<family>/<brand>/<workerId>/<device>` for RBAC, as the Kernel names them. */
interface MockWorker {
  workerId: string;
  family?: string;
  brand?: string;
  devices: MockDevice[];
}

/** What an app's smoke.config.js `setup()` resolves to. */
interface AppSmokeSpec {
  /** Operator config the app runs with, over the manifest's `config` defaults (as `spec.apps[].config`). */
  config?: Record<string, unknown>;
  /** The fleet the mock Kernel serves. Default: one worker `smoke` with one device `smoke-0`. */
  workers?: MockWorker[];
  /** A sample request per route id, for routes that take params or a body. */
  requests?: Record<string, SmokeRequest>;
  /** Stops whatever setup() started. */
  teardown?: () => unknown;
}

interface Route {
  id: string;
  method: string;
  path: string;
  stream?: boolean;
  safety?: string;
  verb?: string;
  schema?: Record<string, { required?: string[] } | undefined>;
  http?: { requestBody?: { required?: boolean } };
  _handler: (req: unknown) => unknown;
}

interface PluginLoader {
  loadPlugin(
    dir: string,
    context: object,
  ): { routes: Route[]; load: (spec: string) => unknown };
}

interface MdkRbacKernel {
  appGrant(appName: string, permissions: unknown[]): { serviceAccount: string; role: object | null; binding: object | null };
  compilePolicy(rbac: unknown): { evaluate: (identity: object, request: object) => { allowed: boolean } };
  kernelRequest(action: string, resourceName?: string): { resource: string; verb: string } | null;
  KERNEL_ACTIONS: Record<string, { resource: string; verb: string; name: 'device' | 'command' | 'worker' | null }>;
  PUBLIC_KERNEL_ACTIONS: readonly string[];
  routeAccess(appName: string, route: { method: string; path: string; verb?: string }): { verb: string };
  deviceName(parts: { family: string; brand: string; worker: string; device: string }): string;
  workerName(parts: { family: string; brand: string; worker: string }): string;
  brandSlug(brand: string): string | null;
}

interface Envelope {
  action: string;
  deviceId: string | null;
  payload: Record<string, unknown>;
}

export interface AppSmokeOutcome {
  passed: number;
  failures: string[];
  warnings: string[];
}

/** The handle the app runs under in the smoke pass: its service account is `app:smoke`. */
const SMOKE_APP = 'smoke';

const DEFAULT_WORKERS: MockWorker[] = [
  { workerId: 'smoke', family: 'miner', brand: 'mock', devices: [{ id: 'smoke-0' }] },
];

function withDeadline<T>(run: () => T | Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolvePromise, rejectPromise) => {
    // Not unref'd: against a hung handler this timer is all that keeps node alive.
    const timer = setTimeout(() => rejectPromise(new Error(`ERR_SMOKE_TIMEOUT: ${label} did not settle within ${ms}ms`)), ms);
    Promise.resolve()
      .then(run)
      .then(resolvePromise, rejectPromise)
      .finally(() => clearTimeout(timer));
  });
}

const isErrCode = (text: string): boolean => /^ERR_[A-Z0-9_]+/.test(text) && !text.startsWith('ERR_SMOKE_TIMEOUT');

async function resolveSpec(appDir: string, config: string | undefined): Promise<AppSmokeSpec> {
  const requireFromApp = createRequire(join(appDir, 'noop.js'));
  if (config) {
    if (config.trim().startsWith('{')) return JSON.parse(config) as AppSmokeSpec;
    const file = isAbsolute(config) ? config : resolve(config);
    if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8')) as AppSmokeSpec;
    const mod = requireFromApp(file);
    return mod.setup ? mod.setup() : mod;
  }
  // Optional for an app: the default fleet and no samples exercise every route that takes no input.
  const smokeConfig = join(appDir, 'smoke.config.js');
  return existsSync(smokeConfig) ? requireFromApp(smokeConfig).setup() : {};
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value !== '';

/**
 * The mock fleet's shape, so a typo in smoke.config.js reads as one, not as a
 * TypeError from inside the mock Kernel. Names are checked again, by the
 * Kernel's own rules, when the mock Kernel names each device.
 */
function checkWorkers(workers: unknown): MockWorker[] {
  const fail = (at: string, what: string): never => {
    throw new Error(`ERR_SMOKE_CONFIG_INVALID: smoke.config.js: ${at} ${what}`);
  };
  if (!Array.isArray(workers)) fail('workers', 'must be a list');
  (workers as unknown[]).forEach((worker, i) => {
    const at = `workers[${i}]`;
    if (!isMapping(worker)) fail(at, 'must be a mapping with workerId and devices');
    const w = worker as Record<string, unknown>;
    if (!nonEmpty(w.workerId)) fail(`${at}.workerId`, 'must be a non-empty string');
    for (const key of ['family', 'brand']) {
      if (w[key] !== undefined && !nonEmpty(w[key])) fail(`${at}.${key}`, 'must be a non-empty string');
    }
    if (!Array.isArray(w.devices)) fail(`${at}.devices`, 'must be a list');
    (w.devices as unknown[]).forEach((device, j) => {
      if (!isMapping(device) || !nonEmpty(device.id)) fail(`${at}.devices[${j}].id`, 'must be a non-empty string');
    });
  });
  return workers as MockWorker[];
}

/**
 * An in-memory Kernel behind a real `createMdkClient`: it authorizes each call
 * with the RBAC evaluator the Kernel uses, against the role install would grant
 * the app (exactly its `mdk-app.yaml` permissions), and answers from the mock
 * fleet. Every call is recorded for the per-route checks.
 */
function mockKernel(rbac: MdkRbacKernel, permissions: unknown[], workers: MockWorker[]) {
  const grant = rbac.appGrant(SMOKE_APP, permissions);
  const policy = rbac.compilePolicy(grant.role ? { roles: [grant.role], bindings: [grant.binding] } : undefined);
  const identity = { kind: 'serviceaccount', sub: grant.serviceAccount };

  const devices = new Map<string, { device: MockDevice; worker: MockWorker; name: string }>();
  workers.forEach((worker, i) => {
    worker.devices.forEach((device, j) => {
      let name: string;
      try {
        name = rbac.deviceName({
          family: worker.family ?? 'miner',
          brand: rbac.brandSlug(worker.brand ?? 'mock') ?? 'mock',
          worker: worker.workerId,
          device: device.id,
        });
      } catch (error) {
        throw new Error(`ERR_SMOKE_CONFIG_INVALID: smoke.config.js: workers[${i}].devices[${j}]: ${message(error)}`);
      }
      devices.set(device.id, { device, worker, name });
    });
  });
  const commands = new Map<string, string>();

  let calls: Array<{ action: string; resource: string; verb: string; allowed: boolean }> = [];
  let down = false;

  function resourceName(envelope: Envelope): string | undefined {
    const spec = rbac.KERNEL_ACTIONS[envelope.action];
    if (spec?.name === 'device') return envelope.deviceId ? devices.get(envelope.deviceId)?.name : undefined;
    if (spec?.name === 'command') {
      const deviceId = commands.get(String(envelope.payload.commandId));
      return deviceId ? devices.get(deviceId)?.name : undefined;
    }
    if (spec?.name === 'worker') {
      const worker = workers.find((w) => w.workerId === envelope.payload.workerId);
      return worker
        ? rbac.workerName({ family: worker.family ?? 'miner', brand: rbac.brandSlug(worker.brand ?? 'mock') ?? 'mock', worker: worker.workerId })
        : undefined;
    }
    return undefined;
  }

  function answer(envelope: Envelope): unknown {
    const target = envelope.deviceId ? devices.get(envelope.deviceId) : undefined;
    switch (envelope.action) {
      case 'worker.list':
        return {
          workers: workers.map((w) => ({
            workerId: w.workerId,
            deviceIds: w.devices.map((d) => d.id),
            state: 'READY',
            healthState: 'OK',
            rpcKey: '00'.repeat(32),
          })),
        };
      case 'device.capabilities':
        return target ? { capabilities: target.device.capabilities ?? {} } : { error: 'ERR_DEVICE_NOT_FOUND' };
      case 'telemetry.pull': {
        if (!target) return { error: 'ERR_DEVICE_NOT_FOUND' };
        const query = envelope.payload.query as { type?: string } | undefined;
        const telemetry = target.device.telemetry ?? { metrics: {} };
        const type = query?.type ?? 'metrics';
        return Object.hasOwn(telemetry, type) ? telemetry[type] : { error: `ERR_TELEMETRY_UNKNOWN: ${type}` };
      }
      case 'state.pull':
        return target ? (target.device.state ?? { status: 'OK' }) : { error: 'ERR_DEVICE_NOT_FOUND' };
      case 'command.request': {
        if (!target) return { error: 'ERR_DEVICE_NOT_FOUND' };
        const commandId = randomUUID();
        commands.set(commandId, target.device.id);
        return { commandId, status: 'QUEUED' };
      }
      case 'command.status': {
        const commandId = String(envelope.payload.commandId);
        return commands.has(commandId) ? { commandId, status: 'COMPLETED' } : { error: 'ERR_COMMAND_NOT_FOUND' };
      }
      default:
        return { error: `ERR_SMOKE_ACTION_UNSUPPORTED: the mock Kernel does not serve ${envelope.action}` };
    }
  }

  const transport = {
    connect: async () => {},
    close: async () => {},
    request: async (envelope: Envelope): Promise<unknown> => {
      if (down) throw new Error('connection refused');
      if (rbac.PUBLIC_KERNEL_ACTIONS.includes(envelope.action)) return { error: 'ERR_SMOKE_ACTION_UNSUPPORTED' };
      const name = resourceName(envelope);
      const request = rbac.kernelRequest(envelope.action, name);
      if (!request) return { error: `ERR_KERNEL_ACTION_FORBIDDEN: ${envelope.action}` };
      const allowed = policy.evaluate(identity, request).allowed;
      calls.push({ action: envelope.action, resource: request.resource, verb: request.verb, allowed });
      if (!allowed) return { error: `ERR_KERNEL_ACTION_FORBIDDEN: ${identity.sub} may not ${request.verb} ${request.resource}${name ? ` ${name}` : ''}` };
      return answer(envelope);
    },
  };

  return {
    transport,
    /** Calls made since the last take(). */
    take() {
      const taken = calls;
      calls = [];
      return taken;
    },
    stop() {
      down = true;
    },
  };
}

/**
 * Whether a route needs input the smoke pass cannot invent: a path param, a
 * required query/header/body field, or a required body. The handler is called
 * directly, with no Fastify validation in front, so a route called without its
 * input would fail on the missing value rather than be skipped.
 */
function needsInput(route: Route): boolean {
  if (route.path.includes(':')) return true;
  // A route's own `schema` wins over the one the loader builds from `http`, so both shapes reach here.
  const schema = route.schema ?? {};
  if (['params', 'querystring', 'headers', 'body'].some((key) => (schema[key]?.required?.length ?? 0) > 0)) return true;
  // A required body whose schema lists no required field.
  return route.http?.requestBody?.required === true;
}

/**
 * Behavioural checks for an app, with no Kernel, Gateway or DHT: its routes and
 * `main` load through the app runtime's own plugin loader, and its
 * `config.mdkClient` is a real Kernel client over an in-memory Kernel serving a
 * mock fleet. That Kernel grants the app exactly what `mdk-app.yaml`
 * `permissions` request, as install would. Each unary route is then called
 * (with its smoke.config.js sample, or no input when it takes none) and must:
 *   - settle within the deadline with a JSON-serialisable result, or reject with an ERR_*
 *   - make only Kernel calls its permissions grant (no undeclared access)
 *   - make no Kernel write when the Gateway treats it as a read (verb get/list, or `safety: read-only`)
 * Then the Kernel goes down and every route must still settle with a result or
 * an ERR_* — no hang, no unhandled TypeError surfacing as a 500.
 */
export async function runAppSmoke(appDir: string, opts: { config?: string; timeoutMs?: number } = {}): Promise<AppSmokeOutcome> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const outcome: AppSmokeOutcome = { passed: 0, failures: [], warnings: [] };
  const check = (ok: boolean, label: string, detail?: string): void => {
    if (ok) outcome.passed++;
    else outcome.failures.push(`smoke: ${label}${detail ? ` — ${detail}` : ''}`);
  };

  const rbac = require('@tetherto/mdk-rbac') as MdkRbacKernel;
  // Kernel verbs that change something, from the vocabulary the Kernel checks
  // against: anything but a read counts, so a new verb is a write until it is listed here.
  const writeVerbs = new Set(
    Object.values(rbac.KERNEL_ACTIONS)
      .map((action) => action.verb)
      .filter((verb) => verb !== 'read' && verb !== 'list'),
  );
  const { createMdkClient } = require('@tetherto/mdk-client') as {
    createMdkClient(config: object, opts: object): object;
  };
  const loader = require('@tetherto/mdk-app-runtime/lib/plugin-loader') as PluginLoader;
  const { resolvePluginDir } = require('@tetherto/mdk-app-runtime') as { resolvePluginDir(dir: string): string };

  const manifest = parseYaml(readFileSync(join(appDir, APP_MANIFEST), 'utf8')) as Record<string, unknown>;
  const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  const spec = await resolveSpec(appDir, opts.config);

  // setup() may have started something: from here on, teardown() runs however the checks end.
  try {
    const kernel = mockKernel(rbac, permissions, spec.workers === undefined ? DEFAULT_WORKERS : checkWorkers(spec.workers));
    const mdkClient = createMdkClient(
      {},
      { transport: kernel.transport, tokenSource: { getToken: async () => 'smoke-token', reset: () => {} } },
    );
    const quiet = () => {};
    const config = Object.freeze({
      ...(isMapping(manifest.config) ? manifest.config : {}),
      ...(spec.config ?? {}),
      dataDir: null,
      mdkClient,
    });
    const readyFns: Array<() => unknown> = [];
    const context = Object.freeze({
      config,
      logger: { debug: quiet, info: quiet, warn: quiet, error: quiet },
      onReady: (fn: () => unknown) => readyFns.push(fn),
    });

    let routes: Route[];
    let main: unknown = null;
    try {
      const plugin = loader.loadPlugin(resolvePluginDir(appDir), context);
      routes = plugin.routes;
      if (typeof manifest.main === 'string' && manifest.main.trim()) main = plugin.load(manifest.main);
      check(true, 'routes load and every handler exports a function');
    } catch (error) {
      check(false, 'routes load and every handler exports a function', message(error));
      return outcome;
    }

    if (main !== null) {
      const label = `main "${String(manifest.main)}" runs to completion`;
      if (typeof main !== 'function') {
        check(false, label, 'does not export a function');
        return outcome;
      }
      try {
        await withDeadline(() => (main as (c: object, ctx: object) => unknown)(config, context), timeoutMs, label);
        check(true, label);
      } catch (error) {
        check(false, label, message(error));
        return outcome;
      }
    }
    kernel.take();
    for (const fn of readyFns) {
      try {
        await withDeadline(fn, timeoutMs, 'onReady callback');
      } catch (error) {
        check(false, 'onReady callbacks run', message(error));
      }
    }
    kernel.take();

    // Route inputs: the sample, or nothing for a route that needs none.
    const runnable: Array<{ route: Route; req: SmokeRequest }> = [];
    for (const route of routes) {
      if (route.stream === true) {
        outcome.warnings.push(`smoke: route '${route.id}' skipped: streaming routes are not tested yet`);
        continue;
      }
      const sample = spec.requests?.[route.id];
      if (!sample && needsInput(route)) {
        outcome.warnings.push(`smoke: route '${route.id}' skipped: it needs input; add a sample to requests['${route.id}'] in smoke.config.js`);
        continue;
      }
      runnable.push({ route, req: sample ?? {} });
    }
    for (const id of Object.keys(spec.requests ?? {})) {
      if (!routes.some((route) => route.id === id)) check(false, `requests['${id}'] names a route in mdk-plugin.json`);
    }

    const call = (route: Route, req: SmokeRequest): Promise<unknown> => {
      const r = { params: req.params ?? {}, query: req.query ?? {}, body: req.body, headers: req.headers ?? {}, _info: {} };
      Object.defineProperty(r, 'mdk', { value: mdkClient, enumerable: false });
      return withDeadline(() => route._handler(r), timeoutMs, `route '${route.id}'`);
    };

    for (const { route, req } of runnable) {
      const label = `route '${route.id}' answers with JSON or an ERR_*`;
      try {
        const result = await call(route, req);
        let serialisable = true;
        try {
          JSON.stringify(result);
        } catch {
          serialisable = false;
        }
        check(serialisable, label, 'result is not JSON-serialisable');
      } catch (error) {
        const text = message(error);
        check(isErrCode(text), label, text);
      }

      const calls = kernel.take();
      const refused = calls.filter((c) => !c.allowed);
      check(
        refused.length === 0,
        `route '${route.id}' stays within the permissions in ${APP_MANIFEST}`,
        [...new Set(refused.map((c) => `${c.action} needs ${c.resource}:${c.verb}`))].join(', '),
      );

      const access = rbac.routeAccess(SMOKE_APP, route);
      if (route.safety === 'read-only' || access.verb === 'get' || access.verb === 'list') {
        const writes = calls.filter((c) => writeVerbs.has(c.verb));
        check(
          writes.length === 0,
          `read-only route '${route.id}' makes no Kernel write`,
          [...new Set(writes.map((c) => c.action))].join(', '),
        );
      }
    }

    // Kernel unreachable: createMdkClient fails each call with ERR_MDK_CLIENT_UNAVAILABLE.
    kernel.stop();
    for (const { route, req } of runnable) {
      const label = `route '${route.id}' answers with JSON or an ERR_* while the Kernel is down`;
      try {
        await call(route, req);
        check(true, label);
      } catch (error) {
        const text = message(error);
        check(isErrCode(text), label, text);
      }
    }
    return outcome;
  } finally {
    if (spec.teardown) await withDeadline(() => spec.teardown!(), timeoutMs, 'teardown()').catch(() => {});
  }
}
