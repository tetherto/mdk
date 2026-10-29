import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const validateAppMock = vi.hoisted(() => vi.fn());
const validateWorkerMock = vi.hoisted(() => vi.fn());
const resolvePackageMock = vi.hoisted(() => vi.fn());
const appSmokeMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/app-package.js', () => ({ validateApp: validateAppMock }));
vi.mock('../../src/lib/worker-package.js', () => ({ validateWorker: validateWorkerMock }));
vi.mock('../../src/lib/runtime.js', () => ({ resolvePackageDir: resolvePackageMock }));
vi.mock('../../src/lib/app-smoke.js', () => ({ runAppSmoke: appSmokeMock }));

const { registerValidate } = await import('../../src/commands/validate.js');

function run(...args: string[]): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  registerValidate(program);
  return program.parseAsync(['node', 'mdk', ...args]);
}

const WORKERS_LIST = [{ resources: ['workers'], verbs: ['list'] }];
const goodApp = { errors: [], manifest: { id: 'io.tether.demo', version: '0.2.0', displayName: 'Demo', permissions: WORKERS_LIST }, routes: 4 };

afterEach(() => {
  vi.restoreAllMocks();
  cleanupTmpDirs();
  validateAppMock.mockReset();
  validateWorkerMock.mockReset();
  resolvePackageMock.mockReset();
  appSmokeMock.mockReset();
  process.exitCode = undefined;
});

/** spec.rbac binding the CLI, and granting `demo` what `goodApp` requests unless `granted` is false. */
function rbac(granted = true): string[] {
  return [
    '  rbac:',
    '    roles:',
    '      - name: admin',
    '        rules: [{ resources: ["*"], verbs: ["*"] }]',
    ...(granted ? ['      - name: app-demo', `        rules: ${JSON.stringify(WORKERS_LIST)}`] : []),
    '    bindings:',
    '      - role: admin',
    '        subjects: [{ kind: ServiceAccount, name: mdk-cli }]',
    ...(granted ? ['      - role: app-demo', '        subjects: [{ kind: ServiceAccount, name: "app:demo" }]'] : []),
  ];
}

// A project whose mdk.yaml declares the app `demo` and the worker `rig`, with a policy that grants `demo`.
function project(policy: string[] = rbac()): string {
  const dir = makeTmpDir();
  writeFileSync(
    join(dir, 'mdk.yaml'),
    [
      'apiVersion: mdk/v1',
      'kind: Stack',
      'metadata:',
      '  name: t',
      'spec:',
      '  gateway:',
      '    port: 3000',
      '  workers:',
      '    - name: rig',
      '      package: "@your-org/mdk-worker-rig"',
      '  apps:',
      '    - name: demo',
      '      package: ./apps/demo',
      ...policy,
      '',
    ].join('\n'),
  );
  resolvePackageMock.mockImplementation((projectDir: string, pkg: string) => join(projectDir, 'resolved', pkg));
  return dir;
}

describe('mdk validate app', () => {
  it('checks the package mdk.yaml declares under that name, and summarises it', async () => {
    const dir = project();
    validateAppMock.mockReturnValue(goodApp);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir);
    expect(resolvePackageMock).toHaveBeenCalledWith(dir, './apps/demo');
    // The author's own package: validate also runs the UI contract check.
    expect(validateAppMock).toHaveBeenCalledWith(join(dir, 'resolved', './apps/demo'), { runUiContract: true });
    expect(stdout.mock.calls.join('')).toMatch(/Demo.*io\.tether\.demo 0\.2\.0.*valid app: 4 routes, 1 permission rule/);
    expect(process.exitCode).toBeUndefined();
  });

  it('reads mdk.yaml from the current directory by default, and counts no permissions', async () => {
    const dir = project(rbac(false));
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
    validateAppMock.mockReturnValue({ ...goodApp, manifest: { ...goodApp.manifest, permissions: undefined }, routes: 1 });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo');
    expect(stdout.mock.calls.join('')).toMatch(/valid app: 1 route, 0 permission rules/);
  });

  it('fails a valid package whose grant is missing from spec.rbac, naming the fix', async () => {
    // The grant problems join the validator's own list, so each run gets a fresh one.
    validateAppMock.mockImplementation(() => ({ ...goodApp, errors: [] }));
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', project([]));
    expect(stderr.mock.calls.join('')).toMatch(/spec\.rbac binds nobody.*mdk rbac init/);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    await run('validate', 'app', 'demo', '--dir', project(rbac(false)));
    expect(stderr.mock.calls.join('')).toMatch(/no role "app-demo".*mdk rbac init/);
    expect(process.exitCode).toBe(1);
  });

  it('does not check the grant of a package with static errors, nor with --path', async () => {
    validateAppMock.mockReturnValue({ ...goodApp, errors: ['mdk-app.yaml: not found'] });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', project([]));
    expect(stderr.mock.calls.join('')).not.toMatch(/binds nobody/);

    validateAppMock.mockImplementation(() => ({ ...goodApp, errors: [] }));
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.exitCode = undefined;
    await run('validate', 'app', '--path', makeTmpDir(), '--json');
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: true });
  });

  it('refuses a name mdk.yaml does not declare, listing the ones it does', async () => {
    const dir = project();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', './apps/demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toMatch(/No app named "\.\/apps\/demo" in mdk\.yaml \(spec\.apps: demo\)/);
    expect(validateAppMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('reports a project without mdk.yaml', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', makeTmpDir());
    expect(stderr.mock.calls.join('')).toMatch(/No mdk\.yaml found/);
    expect(process.exitCode).toBe(1);
  });

  it('reports a declared package that is not installed', async () => {
    const dir = project();
    resolvePackageMock.mockImplementation(() => {
      throw new Error('Package "x" is not installed');
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toContain('is not installed');
    expect(process.exitCode).toBe(1);
  });

  it('lists every error and exits 1', async () => {
    const dir = project();
    validateAppMock.mockReturnValue({ ...goodApp, errors: ['mdk-app.yaml: not found', 'package.json: not found'] });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toMatch(/mdk-app\.yaml: not found[\s\S]*package\.json: not found/);
    expect(process.exitCode).toBe(1);
  });

  it('prints JSON with --json', async () => {
    const dir = project();
    validateAppMock.mockReturnValue({ ...goodApp, errors: ['x'] });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', 'demo', '--dir', dir, '--json');
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: false, kind: 'app', name: 'demo', errors: ['x'] });
    expect(process.exitCode).toBe(1);
  });
});

describe('mdk validate app --path (partner CI)', () => {
  it('checks a package directory directly, reporting the manifest id', async () => {
    const dir = makeTmpDir();
    validateAppMock.mockReturnValue({ ...goodApp, errors: [], warnings: [] });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', '--path', dir, '--json');
    expect(validateAppMock).toHaveBeenCalledWith(dir, { runUiContract: true });
    expect(resolvePackageMock).not.toHaveBeenCalled();
    expect(appSmokeMock).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: true, kind: 'app', name: 'io.tether.demo', path: dir });
    expect(process.exitCode).toBeUndefined();
  });

  it('runs the smoke pass with --smoke and fails on its failures', async () => {
    const dir = makeTmpDir();
    validateAppMock.mockReturnValue({ ...goodApp, errors: [], warnings: [] });
    appSmokeMock.mockResolvedValue({ passed: 3, failures: ["smoke: route 'x' stays within the permissions"], warnings: [] });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', '--path', dir, '--smoke', '--timeout', '500', '--json');
    expect(appSmokeMock).toHaveBeenCalledWith(dir, { config: undefined, timeoutMs: 500 });
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: false, errors: ["smoke: route 'x' stays within the permissions"] });
    expect(process.exitCode).toBe(1);
  });

  it('does not run the smoke pass on a package with static errors', async () => {
    validateAppMock.mockReturnValue({ ...goodApp, errors: ['mdk-app.yaml: not found'], warnings: [] });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'app', '--path', makeTmpDir(), '--smoke');
    expect(appSmokeMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('turns warnings into errors with --strict', async () => {
    validateAppMock.mockReturnValue({ ...goodApp, errors: [], warnings: ['package.json: scripts.postinstall does not run'] });
    appSmokeMock.mockResolvedValue({ passed: 1, failures: [], warnings: ["smoke: route 'y' takes input"] });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'app', '--path', makeTmpDir(), '--smoke', '--strict', '--json');
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({
      ok: false,
      errors: ['package.json: scripts.postinstall does not run', "smoke: route 'y' takes input"],
      warnings: [],
    });
    expect(process.exitCode).toBe(1);
  });
});

describe('mdk validate worker', () => {
  it('summarises a valid worker', async () => {
    const dir = project();
    validateWorkerMock.mockReturnValue({ errors: [], name: 'rig', version: '0.1.0', telemetry: 1, commands: 2 });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'rig', '--dir', dir);
    expect(resolvePackageMock).toHaveBeenCalledWith(dir, '@your-org/mdk-worker-rig');
    expect(stdout.mock.calls.join('')).toMatch(/rig.*0\.1\.0.*valid worker: 1 telemetry entry, 2 commands/);
  });

  it('fails with the errors', async () => {
    const dir = project();
    validateWorkerMock.mockReturnValue({ errors: ['mdk-contract.json: not found'], telemetry: 0, commands: 0 });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'rig', '--dir', dir);
    expect(stderr.mock.calls.join('')).toContain('mdk-contract.json: not found');
    expect(process.exitCode).toBe(1);
  });

  it('checks a package directory directly with --path, reporting the package name', async () => {
    const dir = makeTmpDir();
    validateWorkerMock.mockReturnValue({ errors: [], name: 'your-org-rig', version: '0.1.0', telemetry: 1, commands: 1 });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await run('validate', 'worker', '--path', dir, '--json');
    expect(validateWorkerMock).toHaveBeenCalledWith(dir, { strict: false });
    expect(resolvePackageMock).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.mock.calls.join(''))).toMatchObject({ ok: true, kind: 'worker', name: 'your-org-rig', path: dir });
    expect(process.exitCode).toBeUndefined();
  });

  it('refuses a name and --path together, and requires one of them', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'rig', '--path', makeTmpDir());
    expect(stderr.mock.calls.join('')).toMatch(/name or --path, not both/);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    await run('validate', 'worker');
    expect(stderr.mock.calls.join('')).toMatch(/--path <dir>/);
    expect(process.exitCode).toBe(1);
  });

  it('does not look up a worker name among the apps', async () => {
    const dir = project();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run('validate', 'worker', 'demo', '--dir', dir);
    expect(stderr.mock.calls.join('')).toMatch(/No worker named "demo" in mdk\.yaml \(spec\.workers: rig\)/);
    expect(process.exitCode).toBe(1);
  });
});
