import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { nullCoercedPaths, validateApp } from '../../src/lib/app-package.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const MANIFEST = `id: io.tether.demo
version: 0.2.0
displayName: Demo
permissions:
  - resources: [devices]
    verbs: [read, write]
    resourceNames: ["miner/*"]
config:
  driftThresholdPct: 10
`;

const ROUTE_TABLE = {
  name: 'demo',
  version: '0.2.0',
  routes: [{ id: 'demo.status', description: 'Whether the demo is up.', handler: './controllers/status.js', http: { method: 'GET', path: '/status' } }],
};

function appPackage(files: Record<string, string> = {}): string {
  const dir = makeTmpDir();
  const all: Record<string, string> = {
    'package.json': JSON.stringify({ name: '@tetherto/mdk-app-demo', version: '0.2.0' }),
    'mdk-app.yaml': MANIFEST,
    'plugin/mdk-plugin.json': JSON.stringify(ROUTE_TABLE),
    'plugin/controllers/status.js': 'module.exports = async () => ({ status: "OK" })\n',
    ...files,
  };
  for (const [name, content] of Object.entries(all)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

// The current route-table schema generation, the routeTableVersion stamp a table opts in with.
const STAMP: string = JSON.parse(
  readFileSync(new URL('../../../../backend/core/app-runtime/mdk-plugin.schema.json', import.meta.url), 'utf8'),
).properties.routeTableVersion.enum.at(-1);

afterEach(cleanupTmpDirs);

describe('validateApp', () => {
  it('accepts a well-formed package', () => {
    const result = validateApp(appPackage());
    expect(result.errors).toEqual([]);
    expect(result.manifest.id).toBe('io.tether.demo');
    expect(result.routes).toBe(1);
  });

  it('accepts a package without config, but permissions must be there, even empty', () => {
    const base = 'id: io.tether.demo\nversion: 0.2.0\ndisplayName: Demo\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': `${base}permissions: []\n` })).errors).toEqual([]);
    expect(validateApp(appPackage({ 'mdk-app.yaml': base })).errors).toEqual([
      'mdk-app.yaml: "permissions" is required: the Kernel access the app needs, as a list of rules ([] for none)',
    ]);
  });

  it('reports every missing file', () => {
    expect(validateApp(makeTmpDir()).errors).toEqual([
      'package.json: not found',
      'mdk-app.yaml: not found',
      'mdk-plugin.json: not found (looked in plugin/ and the package root)',
    ]);
  });

  it('reports a target that is not a directory instead of every file in it', () => {
    const dir = join(makeTmpDir(), 'missing');
    expect(validateApp(dir).errors).toEqual([`${dir}: not a directory`]);
  });

  it('accepts the route table at the package root, as mdk-app-agent and mdk-app-demo ship it', () => {
    const dir = appPackage({ 'plugin/mdk-plugin.json': '', 'plugin/controllers/status.js': '' });
    rmSync(join(dir, 'plugin'), { recursive: true });
    writeFileSync(join(dir, 'mdk-plugin.json'), JSON.stringify(ROUTE_TABLE));
    mkdirSync(join(dir, 'controllers'));
    writeFileSync(join(dir, 'controllers', 'status.js'), 'module.exports = async () => ({})\n');
    expect(validateApp(dir)).toMatchObject({ errors: [], routes: 1 });
  });

  it('prefers plugin/mdk-plugin.json over a root one, like the app runtime', () => {
    const dir = appPackage({ 'mdk-plugin.json': '{' });
    expect(validateApp(dir).errors).toEqual([]);
  });

  it('accepts a description and checks its type', () => {
    const base = 'id: io.tether.demo\nversion: 0.2.0\ndisplayName: Demo\npermissions: []\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': `${base}description: Fleet totals\n` })).errors).toEqual([]);
    expect(validateApp(appPackage({ 'mdk-app.yaml': `${base}description: [x]\n` })).errors).toEqual([
      'mdk-app.yaml: "description" must be a string',
    ]);
  });

  it.each([
    ['io.my_app', 'an underscore'],
    ['1io.demo', 'a leading digit'],
    ['io.-demo', 'a segment starting with a dash'],
  ])('rejects the id %s (%s), which the app runtime refuses to start', (id) => {
    const manifest = `id: ${id}\nversion: 0.2.0\ndisplayName: Demo\npermissions: []\n`;
    expect(validateApp(appPackage({ 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: "id" must be reverse-DNS, e.g. io.tether.demo',
    ]);
  });

  it('rejects a version with a leading zero, which the app runtime refuses to start', () => {
    const files = { 'package.json': JSON.stringify({ name: 'x', version: '01.2.0' }) };
    const manifest = 'id: io.tether.demo\nversion: "01.2.0"\ndisplayName: Demo\npermissions: []\n';
    expect(validateApp(appPackage({ ...files, 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: "version" must be a semver string, e.g. 0.1.0',
    ]);
  });

  it('rejects a handler outside the plugin directory, which the Gateway loader refuses', () => {
    writeFileSync(join(makeTmpDir(), 'outside.js'), '');
    for (const handler of ['../outside.js', '/etc/passwd', './controllers/../../outside.js']) {
      const table = { ...ROUTE_TABLE, routes: [{ ...ROUTE_TABLE.routes[0], handler }] };
      expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify(table) })).errors).toEqual([
        `plugin/mdk-plugin.json: route "demo.status" handler "${handler}" must be inside plugin`,
      ]);
    }
  });

  it('rejects a bad id, a version mismatch, an unknown key, missing permissions and a non-mapping config', () => {
    const manifest = 'id: Demo\nversion: 0.3.0\ndisplayName: Demo\nsummary: x\nconfig: []\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: unknown key "summary" (allowed: id, version, displayName, description, permissions, config, main)',
      'mdk-app.yaml: "id" must be reverse-DNS, e.g. io.tether.demo',
      'mdk-app.yaml: "version" 0.3.0 does not match package.json version 0.2.0',
      'mdk-app.yaml: "permissions" is required: the Kernel access the app needs, as a list of rules ([] for none)',
      'mdk-app.yaml: "config" must be a mapping',
    ]);
  });

  it('reports unparseable files and wrong top-level types', () => {
    const errors = validateApp(appPackage({ 'package.json': '{', 'mdk-app.yaml': '- id\n' })).errors;
    expect(errors[0]).toMatch(/^package\.json: /);
    expect(errors[1]).toBe('mdk-app.yaml: must be a mapping');

    const manifest = 'id: io.tether.demo\nversion: 0.2.0\ndisplayName: " "\npermissions: read\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: "displayName" must be a non-empty string',
      'mdk-app.yaml: "permissions" must be a list of rules',
    ]);
  });

  it('rejects a version YAML reads as a number', () => {
    const manifest = 'id: io.tether.demo\nversion: 1.0\ndisplayName: Demo\npermissions: []\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: "version" must be a semver string, e.g. 0.1.0',
    ]);
  });

  it('rejects permissions that are not in the RBAC rule shape', () => {
    const manifest =
      'id: io.tether.demo\nversion: 0.2.0\ndisplayName: Demo\npermissions:\n' +
      '  - resources: devices\n    verbs: []\n    resourceNames: [""]\n    scope: all\n  - read\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: permissions[0]: unknown key "scope" (allowed: resources, verbs, resourceNames)',
      'mdk-app.yaml: permissions[0].resources must be a non-empty list of strings',
      'mdk-app.yaml: permissions[0].verbs must be a non-empty list of strings',
      'mdk-app.yaml: permissions[0].resourceNames must be a non-empty list of strings',
      'mdk-app.yaml: permissions[1] must be a mapping with resources and verbs',
    ]);
  });

  it('holds well-formed permissions to what install can grant: Kernel resources and their verbs', () => {
    const manifest =
      'id: io.tether.demo\nversion: 0.2.0\ndisplayName: Demo\npermissions:\n' +
      '  - resources: [workers]\n    verbs: [list]\n  - resources: [telemetry]\n    verbs: [read]\n' +
      '  - resources: [devices]\n    verbs: [list]\n';
    expect(validateApp(appPackage({ 'mdk-app.yaml': manifest })).errors).toEqual([
      'mdk-app.yaml: permissions[1].resources[0]: an app can only request Kernel resources (devices, workers, commands, actions, policy, identities), got "telemetry"',
      "mdk-app.yaml: permissions[1].verbs[0]: verb \"read\" applies to none of this rule's resources (telemetry)",
      "mdk-app.yaml: permissions[2].verbs[0]: verb \"list\" applies to none of this rule's resources (devices)",
    ]);
  });

  it('applies the Gateway route-table rules', () => {
    const { version: _, ...table } = ROUTE_TABLE;
    expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify(table) })).errors).toEqual([
      'ERR_PLUGIN_MANIFEST_INVALID: plugin/mdk-plugin.json: missing required field "version"',
    ]);
  });

  it('checks the route table against the bundled schema after the loader rules', () => {
    const route = { ...ROUTE_TABLE.routes[0], safety: 'maybe' };
    const result = validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes: [route] }) }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'ERR_PLUGIN_MANIFEST_ENUM: plugin/mdk-plugin.json: /routes/0/safety is "maybe", allowed: read-only | write',
    ]);
  });

  it('does not warn that a table lacks routeTableVersion: the stamp is opt-in', () => {
    expect(validateApp(appPackage()).warnings).toEqual([]);
  });

  it('holds a table that declares routeTableVersion to the strict tier as errors', () => {
    const route = { ...ROUTE_TABLE.routes[0], safety: 'maybe' };
    const table = { routeTableVersion: STAMP, ...ROUTE_TABLE, routes: [route] };
    expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify(table) })).errors).toEqual([
      'ERR_PLUGIN_MANIFEST_ENUM: plugin/mdk-plugin.json: /routes/0/safety is "maybe", allowed: read-only | write',
    ]);
  });

  it('warns about a route with no description', () => {
    const { description: _, ...route } = ROUTE_TABLE.routes[0];
    const result = validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes: [route] }) }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'plugin/mdk-plugin.json: route "demo.status" has no description, so its API reference shows Purpose as "Not declared" and its MCP tool falls back to the app\'s description',
    ]);
  });

  it('reports a handler file that does not exist', () => {
    const table = { ...ROUTE_TABLE, routes: [{ ...ROUTE_TABLE.routes[0], handler: './controllers/gone.js#run' }] };
    expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify(table) })).errors).toEqual([
      'plugin/mdk-plugin.json: route "demo.status" handler "./controllers/gone.js#run" not found',
    ]);
  });

  it('checks a built UI when the package ships ui/ (see app-ui-check.test.ts for each rule)', () => {
    expect(validateApp(appPackage({ 'ui/anything.txt': 'x' })).errors).toEqual(['ui/index.js: not found']);
    const withUi = validateApp(appPackage({ 'ui/index.js': 'import dayjs from "dayjs"\nexport default {}\n' }));
    expect(withUi.ui).toBe(true);
    expect(withUi.errors).toEqual([expect.stringMatching(/imports "dayjs", which the dashboard does not provide/)]);
  });

  it('warns about install scripts, which mdk add never runs', () => {
    const pkg = { name: '@tetherto/mdk-app-demo', version: '0.2.0', scripts: { postinstall: 'node setup.js', build: 'tsc' } };
    const result = validateApp(appPackage({ 'package.json': JSON.stringify(pkg) }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'package.json: scripts.postinstall does not run when the app is installed (mdk add passes --ignore-scripts)',
    ]);
  });

  it('warns about route permissions, which spec.rbac never reads, and not about auth', () => {
    const routes = [
      { ...ROUTE_TABLE.routes[0], auth: true, permissions: ['miner:r'] },
      { id: 'demo.list', description: 'Lists demos.', handler: './controllers/status.js', http: { method: 'GET', path: '/list' }, auth: true, verb: 'list' },
    ];
    const result = validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes }) }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'plugin/mdk-plugin.json: route "demo.status" sets permissions, which spec.rbac ignores, so they gate nothing under mdk run (declare verb or resourceName, and grant the route in spec.rbac)',
    ]);
  });

  it('warns about body schemas whose null the Gateway would coerce', () => {
    const nullable = { anyOf: [{ type: 'number', minimum: 0, maximum: 100 }, { type: 'null' }] };
    const routes = [
      { id: 'demo.set', description: 'Sets a target.', handler: './controllers/status.js', http: { method: 'POST', path: '/set' }, schema: { body: { type: 'object', properties: { target: nullable } } } },
      {
        id: 'demo.put',
        description: 'Puts a value.',
        handler: './controllers/status.js',
        http: {
          method: 'PUT',
          path: '/put',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: ['number', 'null'], minimum: 0 } } } } } },
        },
      },
    ];
    const result = validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes }) }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'plugin/mdk-plugin.json: route "demo.set" body.target pairs a null branch with a number, integer, string, boolean or array one in anyOf/oneOf, so the Gateway coerces a JSON null to 0, "", false or an array, or refuses it (write type: [<type>, "null"] beside the other keywords instead)',
    ]);
  });

  describe('nullCoercedPaths', () => {
    it('flags a scalar tried before null in anyOf, and any scalar beside null in oneOf', () => {
      expect(nullCoercedPaths({ anyOf: [{ type: 'string' }, { type: 'null' }] })).toEqual(['body']);
      expect(nullCoercedPaths({ anyOf: [{ type: 'null' }, { type: 'integer' }] })).toEqual([]);
      expect(nullCoercedPaths({ oneOf: [{ type: 'null' }, { type: 'boolean' }] })).toEqual(['body']);
    });

    it('leaves alone what keeps null: a type list, nullable, an object branch, a union without null', () => {
      expect(nullCoercedPaths({ type: ['number', 'null'] })).toEqual([]);
      expect(nullCoercedPaths({ type: 'number', nullable: true })).toEqual([]);
      expect(nullCoercedPaths({ anyOf: [{ type: 'object' }, { type: 'null' }] })).toEqual([]);
      expect(nullCoercedPaths({ anyOf: [{ type: 'number' }, { type: 'string' }] })).toEqual([]);
    });

    it('counts an array branch, and a null written as const, enum or nullable', () => {
      expect(nullCoercedPaths({ anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] })).toEqual(['body']);
      expect(nullCoercedPaths({ anyOf: [{ type: 'number' }, { const: null }] })).toEqual(['body']);
      expect(nullCoercedPaths({ anyOf: [{ type: 'number' }, { enum: [null] }] })).toEqual(['body']);
      expect(nullCoercedPaths({ anyOf: [{ nullable: true, type: 'object' }, { type: 'number' }] })).toEqual([]);
    });

    it('resolves a local $ref branch, and survives a recursive one', () => {
      const schema = { $defs: { P: { type: 'number' }, Node: { type: 'object', properties: { next: { $ref: '#/$defs/Node' } } } }, anyOf: [{ $ref: '#/$defs/P' }, { type: 'null' }] };
      expect(nullCoercedPaths(schema)).toEqual(['body']);
      expect(nullCoercedPaths({ anyOf: [{ $ref: 'https://example.com/x.json' }, { type: 'null' }] })).toEqual([]);
    });

    it('looks inside properties, array items and $defs', () => {
      const n = { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] };
      const schema = { type: 'object', properties: { rows: { type: 'array', items: { type: 'object', properties: { v: n } } } }, $defs: { Pct: n } };
      expect(nullCoercedPaths(schema)).toEqual(['body.rows[].v', 'body/$defs/Pct']);
    });

    it('sees the optional-body wrapper the loader adds around a scalar body', () => {
      const routes = [{ id: 'demo.n', description: 'Takes a number.', handler: './controllers/status.js', http: { method: 'POST', path: '/n', requestBody: { content: { 'application/json': { schema: { type: 'number' } } } } } }];
      const result = validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes }) }));
      expect(result.warnings).toEqual([expect.stringMatching(/route "demo\.n" body is optional, so the Gateway wraps it in anyOf with null/)]);
    });

    it('reports a body anyOf the developer wrote once, not again for the optional-body wrapper', () => {
      const schema = { anyOf: [{ type: 'number' }, { type: 'null' }] };
      const routes = [{ id: 'demo.n', description: 'Takes a number.', handler: './controllers/status.js', http: { method: 'POST', path: '/n', requestBody: { content: { 'application/json': { schema } } } } }];
      const result = validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes }) }));
      expect(result.warnings).toEqual([expect.stringMatching(/route "demo\.n" body pairs a null branch/)]);
    });

    it('stays quiet about an optional body that already takes null, or a required one', () => {
      const body = (schema: unknown, required?: boolean) => ({ id: 'demo.n', description: 'Takes a number.', handler: './controllers/status.js', http: { method: 'POST', path: '/n', requestBody: { required, content: { 'application/json': { schema } } } } });
      for (const route of [body({ type: ['number', 'null'] }), body({ type: 'number' }, true), body({ type: 'object' })]) {
        expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': JSON.stringify({ ...ROUTE_TABLE, routes: [route] }) })).warnings).toEqual([]);
      }
    });
  });

  it('reports no UI for a package without ui/', () => {
    const result = validateApp(appPackage({}));
    expect(result).toMatchObject({ ui: false, warnings: [] });
  });

  it('catches what would stop the Gateway or the runtime: a repeated method + path, a relative path, a handler that does not compile', () => {
    const route = (id: string, path: string, handler = './controllers/status.js') => ({ id, handler, http: { method: 'GET', path } });
    const table = (routes: unknown[]) => JSON.stringify({ ...ROUTE_TABLE, routes });

    expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': table([route('a', '/x/{id}'), route('b', '/x/:id')]) })).errors[0]).toMatch(
      /ERR_PLUGIN_ROUTE_DUPLICATE_PATH: .*route "b" repeats GET \/x\/:id/,
    );
    expect(validateApp(appPackage({ 'plugin/mdk-plugin.json': table([route('a', 'x')]) })).errors[0]).toMatch(
      /route "a" path "x" must start with "\/"/,
    );
    const broken = validateApp(appPackage({ 'plugin/controllers/status.js': 'module.exports = (\n' }));
    expect(broken.errors).toHaveLength(1);
    expect(broken.errors[0]).toMatch(/route "demo\.status" handler "\.\/controllers\/status\.js" does not compile: /);
  });

  it('checks main like a handler: beside the route table, present and compiling', () => {
    const withMain = (main: string, files: Record<string, string> = {}) =>
      validateApp(appPackage({ 'mdk-app.yaml': `${MANIFEST}main: ${main}\n`, ...files })).errors;

    expect(withMain('./lib/main.js#start', { 'plugin/lib/main.js': 'exports.start = async () => {}\n' })).toEqual([]);
    expect(withMain('./lib/nope.js')).toEqual(['mdk-app.yaml: main "./lib/nope.js" not found']);
    expect(withMain('../outside.js')).toEqual(['mdk-app.yaml: main "../outside.js" must be inside plugin']);
    expect(withMain('./lib/main.js', { 'plugin/lib/main.js': 'module.exports = {\n' })[0]).toMatch(/main "\.\/lib\/main\.js" does not compile/);
    expect(validateApp(appPackage({ 'mdk-app.yaml': `${MANIFEST}main: 5\n` })).errors).toContain(
      'mdk-app.yaml: "main" must be a "<file>[#export]" string',
    );
  });
});
