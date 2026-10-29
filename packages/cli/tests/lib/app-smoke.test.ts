import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runAppSmoke } from '../../src/lib/app-smoke.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

interface FixtureRoute {
  id: string;
  method?: string;
  path?: string;
  safety?: string;
  body: string;
  http?: object;
  /** A route-level schema, which the loader keeps instead of building one from `http`. */
  schema?: object;
}

const CLIENT = "const { config } = require('@tetherto/mdk-gateway/plugin')\nmodule.exports = config.mdkClient\n";

// An app whose routes are given as controller bodies; each has `mdkClient` in scope.
function app(routes: FixtureRoute[], opts: { permissions?: string; main?: string; smokeConfig?: string } = {}): string {
  const dir = makeTmpDir();
  mkdirSync(join(dir, 'plugin', 'controllers'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '0.1.0' }));
  writeFileSync(
    join(dir, 'mdk-app.yaml'),
    `id: io.tether.demo\nversion: 0.1.0\ndisplayName: Demo\npermissions: ${opts.permissions ?? '[{ resources: [workers], verbs: [list] }]'}\n` +
      (opts.main ? 'main: ./main.js\n' : ''),
  );
  writeFileSync(join(dir, 'plugin', 'client.js'), CLIENT);
  if (opts.main) writeFileSync(join(dir, 'plugin', 'main.js'), `'use strict'\nmodule.exports = ${opts.main}\n`);
  for (const route of routes) {
    writeFileSync(
      join(dir, 'plugin', 'controllers', `${route.id}.js`),
      `'use strict'\nconst mdkClient = require('../client')\nmodule.exports = async (req) => {\n${route.body}\n}\n`,
    );
  }
  writeFileSync(
    join(dir, 'plugin', 'mdk-plugin.json'),
    JSON.stringify({
      name: 'demo',
      version: '0.1.0',
      routes: routes.map((r) => ({
        id: r.id,
        handler: `./controllers/${r.id}.js`,
        ...(r.safety ? { safety: r.safety } : {}),
        ...(r.schema ? { schema: r.schema } : {}),
        http: { method: r.method ?? 'GET', path: r.path ?? `/${r.id}`, ...(r.http ?? {}) },
      })),
    }),
  );
  if (opts.smokeConfig) writeFileSync(join(dir, 'smoke.config.js'), `'use strict'\nexports.setup = () => (${opts.smokeConfig})\n`);
  return dir;
}

// Lists the fleet, and reports a down Kernel instead of failing — as the starter app does.
const SUMMARY: FixtureRoute = {
  id: 'summary',
  body: `
  try {
    const { workers } = await mdkClient.listWorkers()
    return { workers: workers.length, devices: workers.reduce((n, w) => n + w.deviceIds.length, 0) }
  } catch (err) {
    if (err.code === 'ERR_MDK_CLIENT_UNAVAILABLE') return { kernelConnected: false }
    throw err
  }`,
};

afterEach(cleanupTmpDirs);

describe('runAppSmoke', () => {
  it('passes an app that stays within its permissions and survives a down Kernel', async () => {
    const outcome = await runAppSmoke(app([SUMMARY]));
    expect(outcome.failures).toEqual([]);
    expect(outcome.warnings).toEqual([]);
    // load, answers, permissions, read-only, Kernel down
    expect(outcome.passed).toBe(5);
  });

  it('fails a route that makes a Kernel call its permissions do not grant', async () => {
    const outcome = await runAppSmoke(app([SUMMARY], { permissions: '[]' }));
    expect(outcome.failures).toEqual([
      "smoke: route 'summary' stays within the permissions in mdk-app.yaml — worker.list needs workers:list",
    ]);
  });

  it('holds device access to the resourceNames the app declared', async () => {
    const pull: FixtureRoute = {
      id: 'pull',
      body: `const { workers } = await mdkClient.listWorkers()\nreturn mdkClient.pullTelemetry(workers[0].deviceIds[0], 'metrics')`,
    };
    const scoped = (names: string) =>
      `[{ resources: [workers], verbs: [list] }, { resources: [devices], verbs: [read], resourceNames: ["${names}"] }]`;
    const fleet = "{ workers: [{ workerId: 'rig-a', family: 'miner', brand: 'Antminer', devices: [{ id: 'AM-1', telemetry: { metrics: { hashrate: 100 } } }] }] }";

    const inScope = await runAppSmoke(app([pull], { permissions: scoped('miner/antminer/*'), smokeConfig: fleet }));
    expect(inScope.failures.filter((f) => !f.includes('Kernel is down'))).toEqual([]);

    const outOfScope = await runAppSmoke(app([pull], { permissions: scoped('miner/whatsminer/*'), smokeConfig: fleet }));
    expect(outOfScope.failures).toContainEqual(expect.stringContaining('telemetry.pull needs devices:read'));
  });

  it('fails a read-only route that sends a device command', async () => {
    const reboot: FixtureRoute = {
      id: 'reboot',
      body: `const { workers } = await mdkClient.listWorkers()\nreturn mdkClient.sendCommand(workers[0].deviceIds[0], 'reboot', {})`,
    };
    const permissions = '[{ resources: [workers], verbs: [list] }, { resources: [devices], verbs: [write] }]';
    const asGet = await runAppSmoke(app([reboot], { permissions }));
    expect(asGet.failures).toContainEqual("smoke: read-only route 'reboot' makes no Kernel write — command.request");

    const asPost = await runAppSmoke(app([{ ...reboot, method: 'POST' }], { permissions }));
    expect(asPost.failures.some((f) => f.includes('makes no Kernel write'))).toBe(false);

    const marked = await runAppSmoke(app([{ ...reboot, method: 'POST', safety: 'read-only' }], { permissions }));
    expect(marked.failures).toContainEqual(expect.stringContaining("read-only route 'reboot' makes no Kernel write"));
  });

  it('fails a route that crashes with a non-ERR error, and passes one that rejects with an ERR_*', async () => {
    const naive: FixtureRoute = { id: 'naive', body: `const { workers } = await mdkClient.listWorkers()\nreturn workers[0].deviceIds` };
    // Letting the client's ERR_MDK_CLIENT_UNAVAILABLE through is a controlled answer, not a crash.
    expect((await runAppSmoke(app([naive]))).failures).toEqual([]);

    const typeError: FixtureRoute = { id: 'crash', body: 'return req.body.missing.field' };
    const crashed = await runAppSmoke(app([typeError]));
    expect(crashed.failures).toEqual([
      expect.stringContaining("route 'crash' answers with JSON or an ERR_* — Cannot read properties of undefined"),
      expect.stringContaining("route 'crash' answers with JSON or an ERR_* while the Kernel is down"),
    ]);
  });

  it('turns a hung route into a deadline failure instead of hanging', async () => {
    const outcome = await runAppSmoke(app([{ id: 'hang', body: 'return new Promise(() => {})' }]), { timeoutMs: 200 });
    expect(outcome.failures).toHaveLength(2);
    expect(outcome.failures[0]).toMatch(/ERR_SMOKE_TIMEOUT/);
  });

  it('skips a route that takes input with a warning, and calls it with the smoke.config.js sample', async () => {
    const device: FixtureRoute = {
      id: 'device',
      path: '/devices/{id}',
      body: `if (req.params.id !== 'smoke-0') throw new Error('ERR_DEVICE_UNKNOWN')\nreturn { id: req.params.id }`,
    };
    const skipped = await runAppSmoke(app([device]));
    expect(skipped.warnings).toEqual([expect.stringContaining("route 'device' skipped: it needs input")]);
    expect(skipped.failures).toEqual([]);

    const sampled = await runAppSmoke(app([device], { smokeConfig: "{ requests: { device: { params: { id: 'smoke-0' } } } }" }));
    expect(sampled.warnings).toEqual([]);
    expect(sampled.failures).toEqual([]);

    const stray = await runAppSmoke(app([SUMMARY], { smokeConfig: '{ requests: { nope: {} } }' }));
    expect(stray.failures).toEqual(["smoke: requests['nope'] names a route in mdk-plugin.json"]);
  });

  it('skips a route whose own schema requires body fields, as it does one with a required requestBody', async () => {
    const mode: FixtureRoute = {
      id: 'mode',
      method: 'POST',
      schema: { body: { type: 'object', required: ['mode'], properties: { mode: { type: 'string' } } } },
      body: 'return { mode: req.body.mode }',
    };
    const skipped = await runAppSmoke(app([mode]));
    expect(skipped.failures).toEqual([]);
    expect(skipped.warnings).toEqual([expect.stringContaining("route 'mode' skipped: it needs input")]);

    const requestBody: FixtureRoute = {
      id: 'mode',
      method: 'POST',
      http: { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } } },
      body: 'return { mode: req.body.mode }',
    };
    expect((await runAppSmoke(app([requestBody]))).warnings).toEqual([expect.stringContaining("route 'mode' skipped")]);

    const sampled = await runAppSmoke(app([mode], { smokeConfig: "{ requests: { mode: { body: { mode: 'low' } } } }" }));
    expect(sampled.warnings).toEqual([]);
    expect(sampled.failures).toEqual([]);
  });

  it('refuses a malformed fleet by its path in smoke.config.js, and still runs teardown()', async () => {
    const fleet = (workers: string) => {
      const dir = app([SUMMARY]);
      writeFileSync(
        join(dir, 'smoke.config.js'),
        `'use strict'\nconst fs = require('fs')\nconst path = require('path')\n` +
          `exports.setup = () => ({ workers: ${workers}, teardown: () => fs.writeFileSync(path.join(__dirname, 'torn-down'), '') })\n`,
      );
      return dir;
    };
    const cases: Array<[string, RegExp]> = [
      ["[{ workerId: 'w' }]", /smoke\.config\.js: workers\[0\]\.devices must be a list/],
      ["{ workerId: 'w' }", /smoke\.config\.js: workers must be a list/],
      ["[{ devices: [] }]", /smoke\.config\.js: workers\[0\]\.workerId must be a non-empty string/],
      ["[{ workerId: 'w', brand: 3, devices: [] }]", /smoke\.config\.js: workers\[0\]\.brand must be a non-empty string/],
      ["[{ workerId: 'w', devices: [{}] }]", /smoke\.config\.js: workers\[0\]\.devices\[0\]\.id must be a non-empty string/],
      // A name the Kernel itself would refuse, by its own rules.
      ["[{ workerId: 'w', devices: [{ id: 'a/b' }] }]", /smoke\.config\.js: workers\[0\]\.devices\[0\]: ERR_RBAC_NAME_INVALID/],
    ];
    for (const [workers, error] of cases) {
      const dir = fleet(workers);
      await expect(runAppSmoke(dir)).rejects.toThrow(error);
      expect(existsSync(join(dir, 'torn-down'))).toBe(true);
    }
  });

  it('runs main first, and fails an app whose main rejects', async () => {
    const ok = await runAppSmoke(app([SUMMARY], { main: 'async (config) => { config.mdkClient }' }));
    expect(ok.failures).toEqual([]);
    expect(ok.passed).toBe(6);

    const bad = await runAppSmoke(app([SUMMARY], { main: "async () => { throw new Error('ERR_BOOT') }" }));
    expect(bad.failures).toEqual([expect.stringContaining('main "./main.js" runs to completion — ERR_BOOT')]);
  });

  it('reports a handler that does not load', async () => {
    const dir = app([SUMMARY]);
    writeFileSync(join(dir, 'plugin', 'controllers', 'summary.js'), "require('./does-not-exist')\n");
    const outcome = await runAppSmoke(dir);
    expect(outcome.failures).toEqual([expect.stringContaining('ERR_PLUGIN_HANDLER_LOAD_FAILED')]);
  });
});

describe('runAppSmoke mock Kernel and inputs', () => {
  const ALL = '[{ resources: [workers], verbs: [list, delete] }, { resources: [devices], verbs: [read, write] }, { resources: [commands], verbs: [read] }]';

  it('serves every device action from the mock fleet, and refuses what it does not model', async () => {
    const tour: FixtureRoute = {
      id: 'tour',
      method: 'POST',
      body: `
  const { workers } = await mdkClient.listWorkers()
  const id = workers[0].deviceIds[0]
  const caps = await mdkClient.getCapabilities(id)
  const state = await mdkClient.pullState(id)
  const metrics = await mdkClient.pullTelemetry(id, 'metrics')
  const unknown = await mdkClient.pullTelemetry(id, 'nope')
  const missing = await mdkClient.pullState('ghost')
  const { commandId } = await mdkClient.sendCommand(id, 'reboot', {})
  const status = await mdkClient.getCommandStatus(commandId)
  const lost = await mdkClient.getCommandStatus('none')
  const terminated = await mdkClient.terminateWorker(workers[0].workerId)
  const log = await mdkClient.getCommandLog()
  return { caps, state, metrics, unknown, missing, status: status.status, lost, terminated, log }`,
    };
    const config = "{ config: { label: 'x' }, workers: [{ workerId: 'w', devices: [{ id: 'd', capabilities: { c: 1 }, state: { status: 'WARN' }, telemetry: { metrics: { h: 1 } } }] }] }";
    const outcome = await runAppSmoke(app([tour], { permissions: ALL, smokeConfig: config }));
    expect(outcome.failures).toEqual([]);
  });

  it('takes --smoke-config as inline JSON, a .json file, or a module with or without setup()', async () => {
    const device: FixtureRoute = { id: 'device', path: '/d/{id}', body: 'return { id: req.params.id }' };
    const json = JSON.stringify({ requests: { device: { params: { id: 'x' } } } });
    const dir = app([device]);
    expect((await runAppSmoke(dir, { config: json })).warnings).toEqual([]);

    writeFileSync(join(dir, 'smoke.json'), json);
    expect((await runAppSmoke(dir, { config: join(dir, 'smoke.json') })).warnings).toEqual([]);

    writeFileSync(join(dir, 'plain.js'), `module.exports = ${json}\n`);
    expect((await runAppSmoke(dir, { config: join(dir, 'plain.js') })).warnings).toEqual([]);

    writeFileSync(join(dir, 'withsetup.js'), `let stopped = false\nexports.setup = () => ({ ...${json}, teardown: () => { stopped = true } })\n`);
    expect((await runAppSmoke(dir, { config: join(dir, 'withsetup.js') })).warnings).toEqual([]);
  });

  it('skips stream routes, runs onReady callbacks, and checks main exports a function', async () => {
    const dir = app([SUMMARY, { id: 'live', body: 'return null', http: {} }], {
      main: "async () => { require('@tetherto/mdk-gateway/plugin').onReady(() => { throw new Error('ERR_READY') }) }",
    });
    const tablePath = join(dir, 'plugin', 'mdk-plugin.json');
    const table = JSON.parse(readFileSync(tablePath, 'utf8'));
    table.routes[1].stream = true;
    writeFileSync(tablePath, JSON.stringify(table));
    const outcome = await runAppSmoke(dir);
    expect(outcome.warnings).toEqual(["smoke: route 'live' skipped: streaming routes are not tested yet"]);
    expect(outcome.failures).toEqual([expect.stringContaining('onReady callbacks run — ERR_READY')]);

    writeFileSync(join(dir, 'plugin', 'main.js'), 'module.exports = 42\n');
    expect((await runAppSmoke(dir)).failures).toEqual([expect.stringContaining('does not export a function')]);
  });

  it('fails a route whose result JSON cannot encode', async () => {
    const outcome = await runAppSmoke(app([{ id: 'big', body: 'return { n: 10n }' }]));
    expect(outcome.failures).toEqual([expect.stringContaining('result is not JSON-serialisable')]);
  });
});
