import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// Packages "published" for the tests: a directory per npm/GitHub spec. The mock does
// what npm does: copies the package into node_modules and records the dependency.
// `record: false` is an install that leaves package.json alone.
const registry = vi.hoisted(() => new Map<string, { name: string; dir: string; record?: boolean }>());
const installPackagesMock = vi.hoisted(() =>
  vi.fn((dir: string, specs: string[], run = true) => {
    if (!run) return { ok: true, skipped: true };
    const entry = registry.get(specs[0]!);
    if (!entry) return { ok: false, message: 'npm install exited with code 1.' };
    const target = join(dir, 'node_modules', entry.name);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(entry.dir, target, { recursive: true });
    if (entry.record === false) return { ok: true };
    const pkgPath = join(dir, 'package.json');
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    } catch {
      return { ok: false, message: 'npm install exited with code 1.' }; // EJSONPARSE
    }
    writeFileSync(pkgPath, JSON.stringify({ ...pkg, dependencies: { ...pkg.dependencies, [entry.name]: specs[0] } }));
    return { ok: true };
  }),
);
// `npm install` with no spec: node_modules follows package.json again.
const installDepsMock = vi.hoisted(() =>
  vi.fn((dir: string) => {
    let deps: Record<string, string> = {};
    try {
      deps = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies ?? {};
    } catch {
      return { ok: false, message: 'npm install exited with code 1.' };
    }
    for (const entry of registry.values()) rmSync(join(dir, 'node_modules', entry.name), { recursive: true, force: true });
    for (const [name, spec] of Object.entries(deps)) {
      const entry = registry.get(spec);
      if (entry) cpSync(entry.dir, join(dir, 'node_modules', name), { recursive: true });
    }
    return { ok: true };
  }),
);
vi.mock('../../src/lib/npm.js', () => ({
  installScaffold: () => ({ ok: true, dir: '/x' }),
  installPackages: installPackagesMock,
  installDeps: installDepsMock,
}));

const ADD_ARGS = ['--ignore-scripts', '--save-exact'];

const { createApp } = await import('../../src/lib/app-scaffold.js');
const { addPackage } = await import('../../src/lib/add-package.js');

const TEMPLATE_WORKER = resolve(__dirname, '..', '..', 'templates', 'worker');

function project(): string {
  const dir = makeTmpDir();
  writeFileSync(
    join(dir, 'mdk.yaml'),
    'apiVersion: mdk/v1\nkind: Stack\nmetadata:\n  name: my-stack\nspec:\n  apps: []\n  workers: []\n',
  );
  return dir;
}

function publishApp(spec: string, org = 'your-org', name = 'ops-center'): string {
  const out = makeTmpDir();
  const result = createApp({ name, parentDir: out, org, install: false, updateStackFile: false });
  registry.set(spec, { name: result.packageName!, dir: result.appPath! });
  return result.packageName!;
}

function publishWorker(spec: string, name = '@your-org/mdk-worker-rig', mock = true): void {
  const dir = makeTmpDir();
  cpSync(TEMPLATE_WORKER, dir, { recursive: true });
  for (const file of ['package.json', 'mdk-contract.json']) {
    const path = join(dir, file);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('__WORKER_NAME__', name));
  }
  if (!mock) rmSync(join(dir, 'mock'), { recursive: true, force: true });
  registry.set(spec, { name, dir });
}

const yamlOf = (dir: string) => parse(readFileSync(join(dir, 'mdk.yaml'), 'utf8'));
// What install records on every app entry (the template apps request no Kernel access).
const granted = (name: string) => ({ serviceAccount: `app:${name}`, permissionsDigest: expect.stringMatching(/^[0-9a-f]{16}$/) });

afterEach(() => {
  cleanupTmpDirs();
  registry.clear();
  installPackagesMock.mockClear();
  installDepsMock.mockClear();
});

describe('addPackage (app)', () => {
  it('installs from npm, updates package.json and registers the app in mdk.yaml', () => {
    const dir = project();
    publishApp('@your-org/mdk-app-ops-center', 'your-org', 'mdk-app-ops-center');

    const result = addPackage({ kind: 'app', source: '@your-org/mdk-app-ops-center', dir });
    expect(result).toMatchObject({ ok: true, instanceName: 'ops-center', stackFile: 'added', reference: '@your-org/mdk-app-ops-center' });
    expect(installPackagesMock).toHaveBeenCalledWith(dir, ['@your-org/mdk-app-ops-center'], true, ADD_ARGS);

    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies['@your-org/mdk-app-ops-center']).toBeDefined();
    expect(yamlOf(dir).spec.apps).toEqual([{ name: 'ops-center', package: '@your-org/mdk-app-ops-center', config: {}, ...granted('ops-center') }]);
  });

  it('learns the package name of a GitHub install from package.json', () => {
    const dir = project();
    const name = publishApp('github:me/my-app#main', 'me', 'my-app');
    const result = addPackage({ kind: 'app', source: 'https://github.com/me/my-app.git#main', dir, name: 'Site View' });
    expect(result).toMatchObject({ ok: true, packageName: name, instanceName: 'site-view' });
    expect(yamlOf(dir).spec.apps[0]).toMatchObject({ name: 'site-view', package: name });
  });

  it('mounts the agent at the root, where the UI calls it', () => {
    const dir = project();
    publishApp('@tetherto/mdk-app-agent', 'tetherto', 'mdk-app-agent');
    expect(addPackage({ kind: 'app', source: '@tetherto/mdk-app-agent', dir })).toMatchObject({ ok: true, instanceName: 'agent' });
    expect(yamlOf(dir).spec.apps).toEqual([{ name: 'agent', package: '@tetherto/mdk-app-agent', config: {}, mount: '/', ...granted('agent') }]);
  });

  it('adds the same package again under another --name as a second app', () => {
    const dir = project();
    publishApp('@your-org/ops-center');
    addPackage({ kind: 'app', source: '@your-org/ops-center', dir });
    const again = addPackage({ kind: 'app', source: '@your-org/ops-center', dir, name: 'ops2' });
    expect(again).toMatchObject({ ok: true, instanceName: 'ops2', stackFile: 'added' });
    expect(yamlOf(dir).spec.apps.map((a: { name: string }) => a.name)).toEqual(['ops-center', 'ops2']);
  });

  it('is a no-op the second time', () => {
    const dir = project();
    publishApp('@your-org/ops-center');
    addPackage({ kind: 'app', source: '@your-org/ops-center', dir });
    const again = addPackage({ kind: 'app', source: '@your-org/ops-center', dir });
    expect(again.stackFile).toBe('exists');
    expect(yamlOf(dir).spec.apps).toHaveLength(1);
  });

  it('leaves mdk.yaml alone when the package is not a valid app', () => {
    const dir = project();
    const bad = makeTmpDir();
    writeFileSync(join(bad, 'package.json'), JSON.stringify({ name: 'not-an-app', version: '1.0.0' }));
    registry.set('not-an-app', { name: 'not-an-app', dir: bad });
    const before = readFileSync(join(dir, 'mdk.yaml'), 'utf8');

    const result = addPackage({ kind: 'app', source: 'not-an-app', dir });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('mdk-app.yaml: not found');
    expect(result.message).toMatch(/package\.json was restored/);
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).toBe(before);
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies?.['not-an-app']).toBeUndefined();
    expect(existsSync(join(dir, 'node_modules', 'not-an-app')), 'and it is no longer installed').toBe(false);
    expect(installDepsMock).toHaveBeenCalledWith(dir, true, ['--ignore-scripts']);
  });

  it('a refused package does not replace the version an app already runs', () => {
    const dir = project();
    const name = publishApp('github:me/my-app#main', 'me', 'my-app');
    expect(addPackage({ kind: 'app', source: 'me/my-app#main', dir }).ok).toBe(true);

    const broken = makeTmpDir();
    cpSync(registry.get('github:me/my-app#main')!.dir, broken, { recursive: true });
    writeFileSync(join(broken, 'mdk-app.yaml'), 'id: Not_Reverse_DNS\nversion: 0.1.0\ndisplayName: x\n');
    registry.set('github:me/my-app#broken', { name, dir: broken });

    const result = addPackage({ kind: 'app', source: 'me/my-app#broken', dir });
    expect(result.ok).toBe(false);
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies[name]).toBe('github:me/my-app#main');
    expect(readFileSync(join(dir, 'node_modules', name, 'mdk-app.yaml'), 'utf8')).not.toMatch(/Not_Reverse_DNS/);
  });

  it('fails clearly without a project, with a bad source, on an npm failure and with --no-install on GitHub', () => {
    expect(addPackage({ kind: 'app', source: 'x', dir: makeTmpDir() }).message).toMatch(/No mdk\.yaml/);
    const dir = project();
    expect(addPackage({ kind: 'app', source: '', dir }).message).toMatch(/Give a package source/);
    expect(addPackage({ kind: 'app', source: 'missing-pkg', dir }).message).toMatch(/npm install exited/);
    expect(addPackage({ kind: 'app', source: 'owner/repo', dir, install: false }).message).toMatch(/drop --no-install/);
  });

  it('with --no-install, uses a package that is already installed', () => {
    const dir = project();
    publishApp('@your-org/ops-center');
    addPackage({ kind: 'app', source: '@your-org/ops-center', dir, name: 'first' });
    installPackagesMock.mockClear();
    const result = addPackage({ kind: 'app', source: '@your-org/ops-center', dir, install: false });
    expect(result).toMatchObject({ ok: true, instanceName: 'first', stackFile: 'exists' });
    expect(installPackagesMock).toHaveBeenCalledWith(dir, ['@your-org/ops-center'], false, ADD_ARGS);
  });

  it('finds the package of a GitHub source that is already installed (package.json unchanged)', () => {
    const dir = project();
    const name = publishApp('github:me/my-app#main', 'me', 'my-app');
    addPackage({ kind: 'app', source: 'me/my-app#main', dir });
    const again = addPackage({ kind: 'app', source: 'me/my-app#main', dir, name: 'second' });
    // The name comes from the spec npm recorded earlier; another --name is a second app.
    expect(again).toMatchObject({ ok: true, packageName: name, stackFile: 'added' });
    expect(yamlOf(dir).spec.apps.map((a: { name: string }) => a.name)).toEqual(['my-app', 'second']);
  });

  it('fails clearly when an install leaves no trace of which package it added', () => {
    const dir = project();
    publishApp('github:me/silent');
    registry.set('github:me/silent', { ...registry.get('github:me/silent')!, record: false });
    const before = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    const result = addPackage({ kind: 'app', source: 'me/silent', dir });
    expect(result.message).toMatch(/could not tell which package it added/);
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).toBe(before);
  });

  it('adds one app out of an npm package that ships several, by subpath', () => {
    const dir = project();
    const built = makeTmpDir();
    const site = createApp({ name: 'site', parentDir: built, org: 'your-org', install: false, updateStackFile: false });
    const suite = makeTmpDir();
    writeFileSync(join(suite, 'package.json'), JSON.stringify({ name: '@your-org/suite', version: '1.0.0' }));
    cpSync(site.appPath!, join(suite, 'apps', 'site'), { recursive: true });
    registry.set('@your-org/suite', { name: '@your-org/suite', dir: suite });

    const result = addPackage({ kind: 'app', source: '@your-org/suite/apps/site', dir });
    expect(result).toMatchObject({ ok: true, packageName: '@your-org/suite', reference: '@your-org/suite/apps/site', instanceName: 'site' });
    expect(installPackagesMock).toHaveBeenCalledWith(dir, ['@your-org/suite'], true, ADD_ARGS);
    expect(yamlOf(dir).spec.apps).toEqual([{ name: 'site', package: '@your-org/suite/apps/site', config: {}, ...granted('site') }]);

    const missing = addPackage({ kind: 'app', source: '@your-org/suite/apps/nope', dir, install: false });
    expect(missing.message).toMatch(/has no "apps\/nope"/);
  });

  it('stops at an unreadable package.json (npm refuses it) and leaves mdk.yaml alone', () => {
    const dir = project();
    writeFileSync(join(dir, 'package.json'), '{ nope');
    publishApp('@your-org/ops-center');
    const result = addPackage({ kind: 'app', source: '@your-org/ops-center', dir });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/^npm install exited with code 1\./);
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe('{ nope');
    expect(yamlOf(dir).spec.apps).toEqual([]);
  });

  it('reports a package that cannot be resolved after install', () => {
    const dir = project();
    expect(addPackage({ kind: 'app', source: '@your-org/ghost', dir, install: false }).message).toMatch(/not installed/);
  });
});

describe('addPackage (app) and spec.rbac', () => {
  const TUNER = [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/*'] }];
  const NARROW = [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/antminer-a/*'] }];

  /** Publishes the app at `spec`, requesting `permissions` (republish to change them). */
  function publishWith(spec: string, permissions: unknown[]): void {
    if (!registry.has(spec)) publishApp(spec, 'your-org', 'tuner');
    const file = join(registry.get(spec)!.dir, 'mdk-app.yaml');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^permissions:.*$/m, `permissions: ${JSON.stringify(permissions)}`));
  }

  /** The operator narrows the role install wrote. */
  function narrow(dir: string): void {
    const file = join(dir, 'mdk.yaml');
    writeFileSync(file, readFileSync(file, 'utf8').replace('miner/antminer/*', 'miner/antminer/antminer-a/*'));
  }

  it("grants the app's service account exactly what its mdk-app.yaml requests", () => {
    const dir = project();
    publishWith('@your-org/tuner', TUNER);
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(result.grant).toEqual({ action: 'add', role: 'app-tuner', serviceAccount: 'app:tuner', written: true });
    const { spec } = yamlOf(dir);
    expect(spec.apps[0]).toMatchObject(granted('tuner'));
    expect(spec.rbac.roles).toEqual([{ name: 'app-tuner', rules: TUNER }]);
    expect(spec.rbac.bindings).toEqual([{ role: 'app-tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:tuner' }] }]);
  });

  it("creates the app's credential in this instance, once, never in the package", () => {
    const dir = project();
    publishWith('@your-org/tuner', TUNER);
    const first = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(first.credential).toEqual({ file: join(dir, '.mdk', 'credentials', 'apps', 'tuner.json'), created: true });
    expect(JSON.parse(readFileSync(join(dir, '.mdk', 'credentials', 'apps', 'tuner.json'), 'utf8')).name).toBe('app:tuner');
    expect(existsSync(join(dir, 'node_modules', '@your-org', 'tuner', '.mdk')), 'nothing written into the package').toBe(false);
    expect(addPackage({ kind: 'app', source: '@your-org/tuner', dir }).credential).toMatchObject({ created: false });
  });

  it('still adds the app when its credential cannot be written', () => {
    const dir = project();
    publishWith('@your-org/tuner', TUNER);
    writeFileSync(join(dir, '.mdk'), 'a file where the state dir goes');
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(result.ok).toBe(true);
    expect(result.credential).toMatchObject({ error: expect.any(String) });
  });

  it('keeps an operator-narrowed role on a re-add of the same request', () => {
    const dir = project();
    publishWith('@your-org/tuner', TUNER);
    addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    narrow(dir);
    const again = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(again).toMatchObject({ ok: true, grant: { action: 'keep' } });
    expect(yamlOf(dir).spec.rbac.roles[0].rules).toEqual(NARROW);
  });

  it('refuses a changed request, leaving mdk.yaml and package.json as they were', () => {
    const dir = project();
    publishWith('@your-org/tuner', NARROW);
    addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    const before = readFileSync(join(dir, 'mdk.yaml'), 'utf8');

    publishWith('@your-org/tuner', TUNER);
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/now requests different Kernel access than role "app-tuner"/);
    expect(result.message).toMatch(/--accept-permissions/);
    expect(result.message).toMatch(/package\.json was restored/);
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).toBe(before);
  });

  it('replaces the role with --accept-permissions, or keeps it with --keep-permissions', () => {
    const dir = project();
    publishWith('@your-org/tuner', NARROW);
    addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    publishWith('@your-org/tuner', TUNER);

    const kept = addPackage({ kind: 'app', source: '@your-org/tuner', dir, keepPermissions: true });
    expect(kept).toMatchObject({ ok: true, grant: { action: 'keep' } });
    expect(yamlOf(dir).spec.rbac.roles[0].rules).toEqual(NARROW);

    // The kept request is recorded: the same request again is no longer a conflict.
    expect(addPackage({ kind: 'app', source: '@your-org/tuner', dir })).toMatchObject({ ok: true, grant: { action: 'keep' } });

    publishWith('@your-org/tuner', [{ resources: ['devices'], verbs: ['read'] }]);
    const accepted = addPackage({ kind: 'app', source: '@your-org/tuner', dir, acceptPermissions: true });
    expect(accepted).toMatchObject({ ok: true, grant: { action: 'replace' } });
    expect(yamlOf(dir).spec.rbac.roles[0].rules).toEqual([{ resources: ['devices'], verbs: ['read'] }]);
  });

  it('refuses an app whose name shadows a Kernel resource', () => {
    const dir = project();
    publishWith('@your-org/tuner', TUNER);
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir, name: 'devices' });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/^ERR_RBAC_APP_NAME_RESERVED: "devices" is a Kernel resource name.* mdk\.yaml was not changed/);
  });

  it('refuses both flags at once', () => {
    const dir = project();
    publishWith('@your-org/tuner', TUNER);
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir, acceptPermissions: true, keepPermissions: true });
    expect(result).toMatchObject({ ok: false });
    expect(result.message).toMatch(/not both/);
  });

  it('refuses an app requesting what install cannot grant', () => {
    const dir = project();
    publishWith('@your-org/tuner', [{ resources: ['telemetry'], verbs: ['read'] }]);
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(result.ok).toBe(false);
    expect(result.errors?.join('\n')).toMatch(/an app can only request Kernel resources/);
  });

  it('refuses to write into an invalid spec.rbac', () => {
    const dir = project();
    writeFileSync(join(dir, 'mdk.yaml'), `${readFileSync(join(dir, 'mdk.yaml'), 'utf8')}  rbac:\n    enforcement: allow\n`);
    publishWith('@your-org/tuner', TUNER);
    const result = addPackage({ kind: 'app', source: '@your-org/tuner', dir });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/spec\.rbac in mdk\.yaml is invalid; fix it before adding an app\. mdk\.yaml was not changed/);
    expect(result.errors?.[0]).toMatch(/spec\.rbac\.enforcement/);
  });
});

describe('addPackage (worker)', () => {
  it('registers a worker with a mock, seeded like `mdk create worker`', () => {
    const dir = project();
    publishWorker('@your-org/mdk-worker-rig');
    const result = addPackage({ kind: 'worker', source: '@your-org/mdk-worker-rig', dir });
    expect(result).toMatchObject({ ok: true, instanceName: 'rig', stackFile: 'added', needsDeviceOpts: false });
    const worker = yamlOf(dir).spec.workers[0];
    expect(worker).toMatchObject({ name: 'rig', package: '@your-org/mdk-worker-rig' });
    expect(worker.config.mock).toBe(true);
    expect(worker.config.devices[0].opts.port).toBeTypeOf('number');
  });

  it('leaves device options to the operator when the worker ships no mock', () => {
    const dir = project();
    publishWorker('@your-org/mdk-worker-rig', '@your-org/mdk-worker-rig', false);

    const result = addPackage({ kind: 'worker', source: '@your-org/mdk-worker-rig', dir, name: 'rig-b' });
    expect(result).toMatchObject({ ok: true, needsDeviceOpts: true });
    const worker = yamlOf(dir).spec.workers[0];
    expect(worker.config.mock).toBeUndefined();
    expect(worker.config.devices[0].opts).toEqual({});
  });

  it('rejects a package that is not a worker', () => {
    const dir = project();
    const bad = makeTmpDir();
    writeFileSync(join(bad, 'package.json'), JSON.stringify({ name: 'plain', version: '1.0.0' }));
    registry.set('plain', { name: 'plain', dir: bad });
    const result = addPackage({ kind: 'worker', source: 'plain', dir });
    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toMatch(/mdk-contract\.json: not found/);
    expect(existsSync(join(dir, 'mdk.yaml'))).toBe(true);
    expect(yamlOf(dir).spec.workers).toEqual([]);
  });
});

