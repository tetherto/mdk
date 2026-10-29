import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessExitSignal, cleanupTmpDirs, makeTmpDir, mockProcessExit } from '../helpers.js';

const detectEnvironmentMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/detect.js', () => ({ detectEnvironment: detectEnvironmentMock, NODE_MIN_MAJOR: 24 }));

const CANCEL = Symbol('cancel');
const clack = vi.hoisted(() => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: { step: vi.fn(), warn: vi.fn(), message: vi.fn(), error: vi.fn(), success: vi.fn() },
  cancel: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  text: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  password: vi.fn(),
}));
vi.mock('@clack/prompts', () => ({
  ...clack,
  isCancel: (v: unknown) => v === CANCEL,
}));

const applyToStackFileMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/plugin-setup.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/plugin-setup.js')>();
  // Default to the real implementation; individual tests may force a failure.
  applyToStackFileMock.mockImplementation(actual.applySetupAnswersToStackFile);
  return {
    ...actual,
    applySetupAnswersToStackFile: applyToStackFileMock,
  };
});

const resolveProjectPackageDirMock = vi.hoisted(() =>
  vi.fn<(dir: string, pkg: string) => string>(() => {
    throw new Error('not installed');
  }),
);
vi.mock('../../src/lib/runtime.js', () => ({
  resolveProjectPackageDir: resolveProjectPackageDirMock,
}));

const findCatalogWorkerMock = vi.hoisted(() => vi.fn());
const findCatalogAppMock = vi.hoisted(() => vi.fn());
const resolveCatalogPackageMock = vi.hoisted(() => vi.fn());
const workerCatalog = vi.hoisted(() => [{ value: 'pkg-worker-a', label: 'pkg-worker-a', hint: 'h' }]);
vi.mock('../../src/lib/catalog.js', () => ({
  WORKER_CATALOG: workerCatalog,
  APP_CATALOG: [{ value: 'pkg-gateway-a', label: 'pkg-gateway-a', hint: 'h' }],
  findCatalogWorker: findCatalogWorkerMock,
  findCatalogApp: findCatalogAppMock,
  resolveCatalogPackage: resolveCatalogPackageMock,
}));

const installSkillMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/skill.js', () => ({ installSkill: installSkillMock }));

const installDepsMock = vi.hoisted(() => vi.fn(() => ({ ok: true })));
const installPackagesMock = vi.hoisted(() => vi.fn(() => ({ ok: true })));
vi.mock('../../src/lib/npm.js', () => ({ installDeps: installDepsMock, installPackages: installPackagesMock }));

const createDashboardMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/dashboard.js', () => ({
  createDashboard: createDashboardMock,
  dashboardNameFromStack: (name: string) => `${name}-dashboard`,
}));

const addFileDependencyMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/project.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/project.js')>();
  return {
    ...actual,
    addFileDependency: addFileDependencyMock,
  };
});

// `writeFileSync` is a named ESM import elsewhere too (helpers.ts, project.ts), and
// Node's ESM namespace for built-ins cannot be `vi.spyOn`-ed directly — so it is
// wrapped here behind a flag the "write failure" tests can set, real otherwise.
const fsControl = vi.hoisted(() => {
  const NO_THROW = Symbol('no-throw');
  return { NO_THROW, failWrite: NO_THROW as unknown };
});
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      if (fsControl.failWrite !== fsControl.NO_THROW) throw fsControl.failWrite;
      return actual.writeFileSync(...args);
    },
  };
});

const { registerOnboard } = await import('../../src/commands/onboard.js');
const { Command } = await import('commander');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  registerOnboard(program);
  return program;
}

let ttyDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  // `vi.clearAllMocks()` (afterEach, below) clears call history but not a mock's
  // configured implementation — reset the ones tests give one-off throwing/custom
  // implementations to, so failures from one test cannot leak into the next.
  findCatalogWorkerMock.mockReset();
  findCatalogAppMock.mockReset();
  resolveCatalogPackageMock.mockReset();
  addFileDependencyMock.mockReset();
  installSkillMock.mockReset();
  createDashboardMock.mockReset();
  installDepsMock.mockReset().mockReturnValue({ ok: true });
  installPackagesMock.mockReset().mockReturnValue({ ok: true });

  resolveProjectPackageDirMock.mockReset().mockImplementation(() => {
    throw new Error('not installed');
  });

  fsControl.failWrite = fsControl.NO_THROW;
  detectEnvironmentMock.mockReturnValue({
    nodeVersion: '22.0.0',
    nodeOk: true,
    packageManager: 'npm',
    git: false,
    existingSpec: false,
    agentClient: 'none',
  });
  ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
});

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
  if (ttyDescriptor) Object.defineProperty(process.stdin, 'isTTY', ttyDescriptor);
});

describe('mdk onboard', () => {
  it('exits 1 immediately when stdin is not a TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
      ProcessExitSignal,
    );
    expect(stderr.mock.calls.join('')).toContain('needs an interactive terminal');
  });

  it('bails cleanly when the first prompt is cancelled', async () => {
    clack.text.mockResolvedValueOnce(CANCEL);
    mockProcessExit();
    await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
      ProcessExitSignal,
    );
    expect(clack.cancel).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
  });

  it('writes a minimal mdk.yaml on the happy path with every optional step declined', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false) // add UI dashboard
      .mockResolvedValueOnce(false) // install skill
      .mockResolvedValueOnce(true); // write mdk.yaml
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(existsSync(join(dir, 'mdk.yaml'))).toBe(true);
    expect(existsSync(join(dir, 'package.json'))).toBe(true);
    expect(existsSync(join(dir, '.gitignore'))).toBe(true);
    expect(existsSync(join(dir, 'README.md'))).toBe(true);
    expect(createDashboardMock).not.toHaveBeenCalled();
    expect(installSkillMock).not.toHaveBeenCalled();
    expect(clack.outro).toHaveBeenCalled();
  });

  it('skips the worker prompt when the worker catalog is empty', async () => {
    const saved = workerCatalog.splice(0);
    try {
      const dir = makeTmpDir();
      clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('no-workers');
      clack.confirm
        .mockResolvedValueOnce(false) // add UI dashboard
        .mockResolvedValueOnce(false) // install skill
        .mockResolvedValueOnce(true); // write mdk.yaml
      clack.multiselect.mockResolvedValueOnce([]); // apps only

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(clack.multiselect).toHaveBeenCalledTimes(1);
      expect(existsSync(join(dir, 'mdk.yaml'))).toBe(true);
    } finally {
      workerCatalog.push(...saved);
    }
  });

  it('grants an installed app its Kernel access in spec.rbac, and skips one that is not installed', async () => {
    const dir = makeTmpDir();
    const appDir = makeTmpDir();
    mkdirSync(join(appDir, 'plugin', 'controllers'), { recursive: true });
    writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'pkg-gateway-a', version: '0.1.0' }));
    writeFileSync(join(appDir, 'mdk-app.yaml'), 'id: com.example.a\nversion: 0.1.0\ndisplayName: A\npermissions: [{ resources: [workers], verbs: [list] }]\n');
    writeFileSync(join(appDir, 'plugin', 'mdk-plugin.json'), JSON.stringify({ name: 'a', version: '0.1.0', routes: [{ id: 'a.s', handler: './controllers/s.js', http: { method: 'GET', path: '/s' } }] }));
    writeFileSync(join(appDir, 'plugin', 'controllers', 's.js'), 'module.exports = async () => ({})\n');
    resolveProjectPackageDirMock.mockImplementation((_dir: string, pkg: string) => {
      if (pkg === 'pkg-gateway-a') return appDir;
      throw new Error('not installed');
    });

    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('granted');
    clack.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a', 'pkg-gateway-missing']);

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    const { spec } = parseYaml(readFileSync(join(dir, 'mdk.yaml'), 'utf8')) as {
      spec: { apps: Array<{ name: string; serviceAccount?: string }>; rbac: { roles: Array<{ name: string }>; bindings: Array<{ role: string }> } };
    };
    const [granted, missing] = spec.apps;
    expect(granted.serviceAccount).toBe(`app:${granted.name}`);
    expect(missing.serviceAccount).toBeUndefined();
    expect(spec.rbac.roles.map((r) => r.name)).toEqual(['admin', 'gateway', `app-${granted.name}`]);
    expect(spec.rbac.bindings.map((b) => b.role)).toEqual(['admin', 'gateway', `app-${granted.name}`]);
  });

  it('warns instead of crashing on an app whose name is a Kernel resource', async () => {
    const dir = makeTmpDir();
    const appDir = makeTmpDir();
    mkdirSync(join(appDir, 'plugin', 'controllers'), { recursive: true });
    writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'actions', version: '0.1.0' }));
    writeFileSync(join(appDir, 'mdk-app.yaml'), 'id: com.example.a\nversion: 0.1.0\ndisplayName: A\npermissions: [{ resources: [workers], verbs: [list] }]\n');
    writeFileSync(join(appDir, 'plugin', 'mdk-plugin.json'), JSON.stringify({ name: 'a', version: '0.1.0', routes: [{ id: 'a.s', handler: './controllers/s.js', http: { method: 'GET', path: '/s' } }] }));
    writeFileSync(join(appDir, 'plugin', 'controllers', 's.js'), 'module.exports = async () => ({})\n');
    resolveProjectPackageDirMock.mockReturnValue(appDir);

    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('reserved');
    clack.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['actions']);

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringMatching(/not granted in spec\.rbac \(ERR_RBAC_APP_NAME_RESERVED/));
    expect(existsSync(join(dir, 'mdk.yaml'))).toBe(true);
  });

  it('warns instead of granting an installed app whose manifest is not valid', async () => {
    const dir = makeTmpDir();
    const appDir = makeTmpDir();
    writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'pkg-gateway-a', version: '0.1.0' }));
    writeFileSync(join(appDir, 'mdk-app.yaml'), 'id: com.example.a\nversion: 0.1.0\ndisplayName: A\n');
    resolveProjectPackageDirMock.mockReturnValue(appDir);

    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('ungranted');
    clack.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringMatching(/not granted in spec\.rbac \(.*"permissions" is required.*\); fix it, then run `mdk rbac init`/));
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).not.toContain('app-');
  });

  it('walks the full path: a bundled + an unavailable worker, an app, dashboard and skill', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('full-stack');
    clack.select.mockResolvedValueOnce('cursor');
    clack.confirm
      .mockResolvedValueOnce(true) // add UI dashboard
      .mockResolvedValueOnce(true) // install skill
      .mockResolvedValueOnce(true); // write mdk.yaml
    clack.multiselect
      .mockResolvedValueOnce(['pkg-worker-a', 'pkg-worker-unavailable'])
      .mockResolvedValueOnce(['pkg-gateway-a']);

    findCatalogWorkerMock.mockImplementation((pkg: string) =>
      pkg === 'pkg-worker-a' || pkg === 'pkg-worker-unavailable'
        ? { value: pkg, label: pkg, hint: 'h' }
        : undefined,
    );
    resolveCatalogPackageMock.mockImplementation((entry: { value: string }) =>
      entry.value === 'pkg-worker-a'
        ? { packageName: entry.value, bundled: true, checkoutDir: '/fake/checkout' }
        : { packageName: entry.value, bundled: false, unavailable: true },
    );
    createDashboardMock.mockResolvedValue({ ok: true, appPath: join(dir, 'apps', 'full-stack-dashboard') });
    installSkillMock.mockReturnValue({ ok: true, message: 'installed' });

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('pkg-worker-unavailable'));
    expect(addFileDependencyMock).toHaveBeenCalledWith(join(dir), 'pkg-worker-a', '/fake/checkout');
    expect(installPackagesMock).toHaveBeenCalledWith(
      join(dir),
      expect.arrayContaining(['pkg-worker-unavailable', 'pkg-gateway-a']),
    );
    expect(createDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'full-stack-dashboard', parentDir: join(dir) }),
    );
    expect(installSkillMock).toHaveBeenCalledWith('cursor', join(dir));

    const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    expect(yaml).toContain('port: 3847');
  });

  it('bails after a write failure while writing project files', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    fsControl.failWrite = new Error('disk full');
    const exitSpy = mockProcessExit();

    await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
      ProcessExitSignal,
    );

    expect(clack.log.error).toHaveBeenCalledWith('disk full');
    expect(clack.cancel).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('declines to proceed at the review step, which also bails', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false); // do not write mdk.yaml
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const exitSpy = mockProcessExit();

    await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
      ProcessExitSignal,
    );

    expect(existsSync(join(dir, 'mdk.yaml'))).toBe(false);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  describe('cancelling at each individual prompt bails with no side effects', () => {
    const cases: Array<{
      name: string;
      text?: unknown[];
      select?: unknown[];
      confirm?: unknown[];
      multiselect?: unknown[];
    }> = [
      { name: 'stack name', text: ['d', CANCEL] },
      { name: 'worker plugins', text: ['d', 's'], multiselect: [CANCEL] },
      { name: 'apps', text: ['d', 's'], multiselect: [[], CANCEL] },
      { name: 'add UI dashboard', text: ['d', 's'], confirm: [CANCEL], multiselect: [[], []] },
      {
        name: 'install skill',
        text: ['d', 's'],
        confirm: [true, CANCEL],
        multiselect: [[], []],
      },
      {
        name: 'coding-agent client',
        text: ['d', 's'],
        select: [CANCEL],
        confirm: [true, true],
        multiselect: [[], []],
      },
      {
        name: 'final review (write mdk.yaml)',
        text: ['d', 's'],
        confirm: [true, false, CANCEL],
        multiselect: [[], []],
      },
    ];

    for (const c of cases) {
      it(`bails when the "${c.name}" prompt is cancelled`, async () => {
        (c.text ?? []).forEach((v) => clack.text.mockResolvedValueOnce(v));
        (c.select ?? []).forEach((v) => clack.select.mockResolvedValueOnce(v));
        (c.confirm ?? []).forEach((v) => clack.confirm.mockResolvedValueOnce(v));
        (c.multiselect ?? []).forEach((v) => clack.multiselect.mockResolvedValueOnce(v));
        mockProcessExit();

        await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
          ProcessExitSignal,
        );
        expect(clack.cancel).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
      });
    }
  });

  it('re-running against an existing project hits the present-manifest/gitignore branches, seeds a device for every worker and surfaces install/skill/dashboard failures', async () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'kind: Stack\n', 'utf8');
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', workspaces: ['workers/*', 'plugins/*'] }),
      'utf8',
    );
    writeFileSync(join(dir, '.gitignore'), '.mdk/\n', 'utf8');

    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('seed-stack');
    clack.select.mockResolvedValueOnce('claude');
    clack.confirm
      .mockResolvedValueOnce(true) // add UI dashboard
      .mockResolvedValueOnce(true) // install skill
      .mockResolvedValueOnce(true); // overwrite mdk.yaml
    clack.multiselect.mockResolvedValueOnce(['pkg-worker-seeded']).mockResolvedValueOnce(['pkg-gateway-a']);

    findCatalogWorkerMock.mockImplementation((pkg: string) =>
      pkg === 'pkg-worker-seeded' ? { value: pkg, label: pkg, hint: 'h', mock: true } : undefined,
    );
    resolveCatalogPackageMock.mockReturnValue({ packageName: 'pkg-worker-seeded', bundled: false });
    installPackagesMock.mockReturnValue({ ok: false, message: 'network down' });
    installSkillMock.mockReturnValue({ ok: false, message: 'no client', detail: 'try again later' });
    createDashboardMock.mockResolvedValue({ ok: false, message: 'fetch failed', detail: 'timeout' });

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(installPackagesMock).toHaveBeenCalledWith(join(dir), ['pkg-worker-seeded', 'pkg-gateway-a']);
    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('network down'));
    expect(clack.log.message).toHaveBeenCalledWith(expect.stringContaining('npm install pkg-worker-seeded'));
    expect(installSkillMock).toHaveBeenCalledWith('claude', join(dir));
    expect(clack.log.message).toHaveBeenCalledWith(expect.stringContaining('try again later'));
    expect(createDashboardMock).toHaveBeenCalled();
    expect(clack.log.message).toHaveBeenCalledWith(expect.stringContaining('timeout'));

    const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    expect(yaml).toContain('devices');
  });

  it('logs a warning and skips the worker when linking a bundled worker fails', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce(['pkg-worker-fail-link']).mockResolvedValueOnce([]);

    findCatalogWorkerMock.mockReturnValue({ value: 'pkg-worker-fail-link', label: 'fail', hint: 'h' });
    resolveCatalogPackageMock.mockReturnValue({
      packageName: 'pkg-worker-fail-link',
      bundled: true,
      checkoutDir: '/fake/checkout',
    });
    addFileDependencyMock.mockImplementation(() => {
      throw new Error('no package.json');
    });

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('Could not link'));
    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('no package.json'));
    expect(installPackagesMock).not.toHaveBeenCalled();
    expect(installDepsMock).not.toHaveBeenCalled();
  });

  it('reflects a hit environment (old Node, existing git/spec, a detected agent client) in the review panel and default client', async () => {
    detectEnvironmentMock.mockReturnValue({
      nodeVersion: '18.0.0',
      nodeOk: false,
      packageManager: 'pnpm',
      git: true,
      existingSpec: true,
      agentClient: 'cursor',
    });
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    // A package with no catalog entry at all — exercises the "unknown package" paths.
    clack.multiselect.mockResolvedValueOnce(['unknown-pkg']).mockResolvedValueOnce([]);
    findCatalogWorkerMock.mockReturnValue(undefined);

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    expect(yaml).toContain('port: 3847');
    expect(yaml).toContain('port: 3848');
    expect(installPackagesMock).toHaveBeenCalledWith(join(dir), ['unknown-pkg']);
  });

  it('installs via installDeps (no registry packages) when only a bundled worker is linked, with a singular install count', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce(['pkg-worker-a']).mockResolvedValueOnce([]);

    findCatalogWorkerMock.mockReturnValue({ value: 'pkg-worker-a', label: 'pkg-worker-a', hint: 'h' });
    resolveCatalogPackageMock.mockReturnValue({
      packageName: 'pkg-worker-a',
      bundled: true,
      checkoutDir: '/fake/checkout',
    });
    installDepsMock.mockReturnValue({ ok: false, message: 'no net' });

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.step).toHaveBeenCalledWith(expect.stringContaining('Installing 1 package'));
    expect(installDepsMock).toHaveBeenCalledWith(join(dir));
    expect(installPackagesMock).not.toHaveBeenCalled();
    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('no net'));
    expect(clack.log.message).toHaveBeenCalledWith(expect.stringContaining('Install manually: npm install'));
  });

  it('leaves an existing package.json untouched and updates a .gitignore missing MDK content', async () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'preexisting' }), 'utf8');
    writeFileSync(join(dir, '.gitignore'), 'node_modules/\n', 'utf8');

    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.message).not.toHaveBeenCalledWith(expect.stringContaining('Updated package.json'));
    expect(clack.log.message).not.toHaveBeenCalledWith(expect.stringContaining('Created package.json'));
    expect(clack.log.message).toHaveBeenCalledWith(expect.stringContaining('Updated .gitignore'));
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))).toEqual({ name: 'preexisting' });
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toContain('.mdk/');
  });

  it('reports two seed devices (plural) and an empty dashboard app path without an "at ..." suffix', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(true) // add UI dashboard
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce(['pkg-worker-one', 'pkg-worker-two']).mockResolvedValueOnce([]);

    findCatalogWorkerMock.mockImplementation((pkg: string) => ({ value: pkg, label: pkg, hint: 'h', mock: true }));
    resolveCatalogPackageMock.mockReturnValue({ packageName: 'x', bundled: false });
    createDashboardMock.mockResolvedValue({ ok: true, appPath: '' });

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining('seed devices are'),
      expect.anything(),
    );
  });

  it('logs a stringified (non-Error) failure when writing project files throws a plain value', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    fsControl.failWrite = 'disk on fire';
    mockProcessExit();

    await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
      ProcessExitSignal,
    );

    expect(clack.log.error).toHaveBeenCalledWith('disk on fire');
  });

  describe('plugin setup questions', () => {
    function writeAuthFixture(): string {
      const pluginDir = makeTmpDir();
      writeFileSync(
        join(pluginDir, 'mdk-plugin.json'),
        JSON.stringify({
          name: '@tetherto/mdk-plugin-auth',
          setup: [
            { key: 'google.clientId', prompt: 'Google OAuth client ID', type: 'string', required: true },
            { key: 'google.clientSecret', prompt: 'Google OAuth client secret', type: 'secret', required: true },
            { key: 'auth.superAdmin', prompt: 'Super admin email', type: 'string', required: true },
          ],
        }),
        'utf8',
      );
      return pluginDir;
    }

    it('links the bundled auth plugin and asks its setup questions after install', async () => {
      const dir = makeTmpDir();
      const pluginDir = writeAuthFixture();
      findCatalogAppMock.mockImplementation((pkg: string) =>
        pkg === '@tetherto/mdk-plugin-auth'
          ? { value: pkg, label: 'mdk-plugin-auth', hint: 'h', repoPath: 'backend/apps/auth' }
          : undefined,
      );
      resolveCatalogPackageMock.mockReturnValue({
        packageName: '@tetherto/mdk-plugin-auth',
        bundled: true,
        checkoutDir: pluginDir,
      });

      clack.text
        .mockResolvedValueOnce(dir)
        .mockResolvedValueOnce('auth-stack')
        .mockResolvedValueOnce('client-id-123') // google.clientId
        .mockResolvedValueOnce('root@example.com'); // auth.superAdmin
      clack.password.mockResolvedValueOnce('shhh'); // google.clientSecret
      clack.confirm
        .mockResolvedValueOnce(false) // add UI dashboard
        .mockResolvedValueOnce(false) // install skill
        .mockResolvedValueOnce(true); // write mdk.yaml
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['@tetherto/mdk-plugin-auth']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(addFileDependencyMock).toHaveBeenCalledWith(join(dir), '@tetherto/mdk-plugin-auth', pluginDir);
      expect(installDepsMock).toHaveBeenCalled();
      expect(installPackagesMock).not.toHaveBeenCalled();
      // Asked before the spec write, so the post-install pass skips it; the one
      // resolve is the grant pass, which finds it not installed and moves on.
      expect(resolveProjectPackageDirMock).toHaveBeenCalledTimes(1);

      // The answers belong to the plugin's own entry, not the gateway config.
      const spec = parseYaml(readFileSync(join(dir, 'mdk.yaml'), 'utf8')) as {
        spec: {
          gateway: { config: Record<string, unknown> };
          apps: Array<{ name: string; package: string; config: Record<string, unknown> }>;
        };
      };
      expect(spec.spec.apps[0]).toEqual({
        name: 'auth',
        package: '@tetherto/mdk-plugin-auth',
        config: {
          // The secret stays out of the committed spec: a placeholder here,
          // the value in the gitignored, owner-only .env.
          google: { clientId: 'client-id-123', clientSecret: '${MDK_AUTH_GOOGLE_CLIENTSECRET}' },
          auth: { superAdmin: 'root@example.com' },
        },
      });
      expect(spec.spec.gateway.config).toEqual({});
      expect(readFileSync(join(dir, '.env'), 'utf8')).toBe("MDK_AUTH_GOOGLE_CLIENTSECRET='shhh'\n");
      expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toMatch(/^\.env$/m);
      expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).not.toContain('shhh');
    });

    it('bails on a cancelled bundled setup question before mdk.yaml exists', async () => {
      const dir = makeTmpDir();
      const pluginDir = writeAuthFixture();
      findCatalogAppMock.mockReturnValue({
        value: '@tetherto/mdk-plugin-auth',
        label: 'mdk-plugin-auth',
        hint: 'h',
        repoPath: 'backend/apps/auth',
      });
      resolveCatalogPackageMock.mockReturnValue({
        packageName: '@tetherto/mdk-plugin-auth',
        bundled: true,
        checkoutDir: pluginDir,
      });

      clack.text
        .mockResolvedValueOnce(dir)
        .mockResolvedValueOnce('auth-stack')
        .mockResolvedValueOnce('client-id-123');
      clack.password.mockResolvedValueOnce(CANCEL);
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['@tetherto/mdk-plugin-auth']);
      mockProcessExit();

      await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
        ProcessExitSignal,
      );
      expect(existsSync(join(dir, 'mdk.yaml'))).toBe(false);
    });

    it('asks nothing upfront for a bundled plugin without setup questions', async () => {
      const dir = makeTmpDir();
      const pluginDir = makeTmpDir();
      writeFileSync(join(pluginDir, 'mdk-plugin.json'), JSON.stringify({ name: 'pkg-gateway-a' }), 'utf8');
      findCatalogAppMock.mockReturnValue({
        value: 'pkg-gateway-a',
        label: 'pkg-gateway-a',
        hint: 'h',
        repoPath: 'backend/apps/plain',
      });
      resolveCatalogPackageMock.mockReturnValue({
        packageName: 'pkg-gateway-a',
        bundled: true,
        checkoutDir: pluginDir,
      });

      clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
      clack.confirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(existsSync(join(dir, 'mdk.yaml'))).toBe(true);
      expect(clack.text).toHaveBeenCalledTimes(2);
    });

    it('skips the upfront questions for a bundled plugin with a malformed manifest', async () => {
      const dir = makeTmpDir();
      const pluginDir = makeTmpDir();
      writeFileSync(join(pluginDir, 'mdk-plugin.json'), 'not json', 'utf8');
      findCatalogAppMock.mockReturnValue({
        value: 'pkg-gateway-a',
        label: 'pkg-gateway-a',
        hint: 'h',
        repoPath: 'backend/apps/broken',
      });
      resolveCatalogPackageMock.mockReturnValue({
        packageName: 'pkg-gateway-a',
        bundled: true,
        checkoutDir: pluginDir,
      });

      clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
      clack.confirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(existsSync(join(dir, 'mdk.yaml'))).toBe(true);
      expect(clack.password).not.toHaveBeenCalled();
    });

    it('warns when a bundled app is unavailable outside the checkout', async () => {
      const dir = makeTmpDir();
      findCatalogAppMock.mockReturnValue({
        value: 'pkg-gateway-a',
        label: 'pkg-gateway-a',
        hint: 'h',
        repoPath: 'backend/apps/gone',
      });
      resolveCatalogPackageMock.mockReturnValue({
        packageName: 'pkg-gateway-a',
        bundled: false,
        unavailable: true,
      });

      clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
      clack.confirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('pkg-gateway-a'));
      expect(installPackagesMock).toHaveBeenCalledWith(join(dir), ['pkg-gateway-a']);
    });

    it('bails when a plugin setup question is cancelled', async () => {
      const dir = makeTmpDir();
      resolveProjectPackageDirMock.mockReturnValue(writeAuthFixture());

      clack.text
        .mockResolvedValueOnce(dir)
        .mockResolvedValueOnce('my-stack')
        .mockResolvedValueOnce('client-id-123');
      clack.password.mockResolvedValueOnce(CANCEL);
      clack.confirm
        .mockResolvedValueOnce(false) // add UI dashboard
        .mockResolvedValueOnce(false) // install skill
        .mockResolvedValueOnce(true); // write mdk.yaml
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);
      mockProcessExit();

      await expect(buildProgram().parseAsync(['node', 'mdk', 'onboard'])).rejects.toThrow(
        ProcessExitSignal,
      );
      expect(clack.cancel).toHaveBeenCalled();
    });

    it('asks an installed external plugin\'s setup questions and patches mdk.yaml', async () => {
      const dir = makeTmpDir();
      const pluginDir = makeTmpDir();
      writeFileSync(
        join(pluginDir, 'mdk-plugin.json'),
        JSON.stringify({
          name: 'pkg-gateway-a',
          setup: [{ key: 'alerts.webhook', prompt: 'Webhook URL', type: 'string', required: true }],
        }),
        'utf8',
      );
      resolveProjectPackageDirMock.mockReturnValue(pluginDir);

      clack.text
        .mockResolvedValueOnce(dir)
        .mockResolvedValueOnce('ext-stack')
        .mockResolvedValueOnce('https://hooks.example.com/x'); // alerts.webhook
      clack.confirm
        .mockResolvedValueOnce(false) // add UI dashboard
        .mockResolvedValueOnce(false) // install skill
        .mockResolvedValueOnce(true); // write mdk.yaml
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(resolveProjectPackageDirMock).toHaveBeenCalledWith(join(dir), 'pkg-gateway-a');
      const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
      expect(yaml).toContain('webhook: https://hooks.example.com/x');
    });

    it('writes an installed plugin\'s secret answer to .env, not mdk.yaml', async () => {
      const dir = makeTmpDir();
      const pluginDir = makeTmpDir();
      writeFileSync(
        join(pluginDir, 'mdk-plugin.json'),
        JSON.stringify({
          name: 'pkg-gateway-a',
          setup: [{ key: 'alerts.apiKey', prompt: 'API key', type: 'secret', required: true }],
        }),
        'utf8',
      );
      resolveProjectPackageDirMock.mockReturnValue(pluginDir);

      clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('ext-stack');
      clack.password.mockResolvedValueOnce('k3y');
      clack.confirm
        .mockResolvedValueOnce(false) // add UI dashboard
        .mockResolvedValueOnce(false) // install skill
        .mockResolvedValueOnce(true); // write mdk.yaml
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
      const parsed = parseYaml(yaml) as { spec: { apps: Array<{ config: unknown }> } };
      expect(parsed.spec.apps[0].config).toEqual({
        alerts: { apiKey: '${MDK_PKG_GATEWAY_A_ALERTS_APIKEY}' },
      });
      expect(yaml).not.toContain('k3y');
      expect(readFileSync(join(dir, '.env'), 'utf8')).toContain("MDK_PKG_GATEWAY_A_ALERTS_APIKEY='k3y'");
    });

    it('warns when the setup answers cannot be written back to mdk.yaml', async () => {
      const dir = makeTmpDir();
      const pluginDir = makeTmpDir();
      writeFileSync(
        join(pluginDir, 'mdk-plugin.json'),
        JSON.stringify({
          name: 'pkg-gateway-a',
          setup: [{ key: 'alerts.webhook', prompt: 'Webhook URL', type: 'string' }],
        }),
        'utf8',
      );
      resolveProjectPackageDirMock.mockReturnValue(pluginDir);
      applyToStackFileMock.mockReturnValueOnce(false);

      clack.text
        .mockResolvedValueOnce(dir)
        .mockResolvedValueOnce('ext-stack')
        .mockResolvedValueOnce('https://hooks.example.com/x');
      clack.confirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('add them manually under its config in spec.apps'),
      );
    });

    it('skips external plugins without questions or that failed to install', async () => {
      const dir = makeTmpDir();
      clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
      clack.confirm
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      clack.multiselect.mockResolvedValueOnce([]).mockResolvedValueOnce(['pkg-gateway-a']);

      await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

      const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
      expect(yaml).toContain('pkg-gateway-a');
      expect(clack.password).not.toHaveBeenCalled();
    });
  });

  it('logs a stringified (non-Error) failure when linking a bundled worker throws a plain value', async () => {
    const dir = makeTmpDir();
    clack.text.mockResolvedValueOnce(dir).mockResolvedValueOnce('my-stack');
    clack.confirm
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    clack.multiselect.mockResolvedValueOnce(['pkg-worker-fail-link']).mockResolvedValueOnce([]);

    findCatalogWorkerMock.mockReturnValue({ value: 'pkg-worker-fail-link', label: 'fail', hint: 'h' });
    resolveCatalogPackageMock.mockReturnValue({
      packageName: 'pkg-worker-fail-link',
      bundled: true,
      checkoutDir: '/fake/checkout',
    });
    addFileDependencyMock.mockImplementation(() => {
      throw 'nope';
    });

    await buildProgram().parseAsync(['node', 'mdk', 'onboard']);

    expect(clack.log.warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
  });
});
