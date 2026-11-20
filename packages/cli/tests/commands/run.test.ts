import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessExitSignal, cleanupTmpDirs, makeTmpDir, mockProcessExit } from '../helpers.js';

const runKernelMock = vi.hoisted(() => vi.fn());
const runGatewayMock = vi.hoisted(() => vi.fn());
const runMcpMock = vi.hoisted(() => vi.fn());
const runWorkerMock = vi.hoisted(() => vi.fn());
const runAppMock = vi.hoisted(() => vi.fn());
const superviseAppMock = vi.hoisted(() => vi.fn());
const assertGatewayPortFreeMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const declaredMockPortsMock = vi.hoisted(() => vi.fn(() => []));
const releaseUnreachableReportsMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/runtime.js', async (importOriginal) => ({
  // The policy check is pure and runs before any boot: the real one.
  policyRefusal: (await importOriginal<typeof import('../../src/lib/runtime.js')>()).policyRefusal,
  runKernel: runKernelMock,
  runGateway: runGatewayMock,
  runMcp: runMcpMock,
  runWorker: runWorkerMock,
  runApp: runAppMock,
  superviseApp: superviseAppMock,
  assertGatewayPortFree: assertGatewayPortFreeMock,
  declaredMockPorts: declaredMockPortsMock,
  releaseUnreachableReports: releaseUnreachableReportsMock,
  // mdk run dashboard resolves spec.apps packages; local paths are enough here.
  resolvePackageDir: (projectDir: string, pkg: string) => `${projectDir}/${pkg}`,
}));

const findDashboardDirMock = vi.hoisted(() => vi.fn());
const dashboardNamesMock = vi.hoisted(() => vi.fn(() => [] as string[]));
const runDashboardMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/dashboard.js', () => ({
  findDashboardDir: findDashboardDirMock,
  dashboardNames: dashboardNamesMock,
  runDashboard: runDashboardMock,
}));

const installShutdownMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/shutdown.js', () => ({ installShutdown: installShutdownMock }));

const { registerRun } = await import('../../src/commands/run.js');
const { runLockFile } = await import('../../src/lib/run-lock.js');

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerRun(program);
  return program;
}

function writeSpec(dir: string, content: string): void {
  writeFileSync(join(dir, 'mdk.yaml'), content, 'utf8');
}

/** A policy that binds someone, which is all the Kernel needs to be worth booting. */
const RBAC = [
  '  rbac:',
  '    roles: [{ name: admin, rules: [{ resources: ["*"], verbs: ["*"] }] }]',
  '    bindings: [{ role: admin, subjects: [{ kind: ServiceAccount, name: mdk-cli }] }]',
];

const SPEC_WITH_WORKER = [
  'kind: Stack',
  'apiVersion: mdk/v1',
  'spec:',
  '  gateway:',
  '    port: 3847',
  ...RBAC,
  '  workers:',
  '    - name: a',
  '      package: ./workers/a',
].join('\n');

const SPEC_WITH_APP = [
  SPEC_WITH_WORKER,
  '  apps:',
  '    - name: demo',
  '      package: ./apps/demo',
].join('\n');

const SPEC_BASE = ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', ...RBAC].join('\n');
const SPEC_UNBOUND = ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847'].join('\n');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
});

/** A dashboard dev server that stays up: `crashed` never settles. */
const dashboardHandle = (stop: unknown = vi.fn()) => ({ crashed: new Promise<string>(() => {}), stop });

describe('mdk run', () => {
  it('dies when --detach is passed', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await expect(program.parseAsync(['node', 'mdk', 'run', '--detach'])).rejects.toThrow(
      ProcessExitSignal,
    );
    expect(stderr.mock.calls.join('')).toContain('--detach` is not implemented yet');
  });

  it('dies on an unknown target', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await expect(program.parseAsync(['node', 'mdk', 'run', 'nope'])).rejects.toThrow(
      ProcessExitSignal,
    );
    expect(stderr.mock.calls.join('')).toContain('Unknown target "nope"');
  });

  it('dies with a clean message when mdk.yaml is missing/invalid', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    await expect(
      program.parseAsync(['node', 'mdk', 'run', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain('No mdk.yaml found');
  });

  it('defaults to target "all" with none given, even with no workers declared', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    assertGatewayPortFreeMock.mockResolvedValue(undefined);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    runGatewayMock.mockResolvedValue({ stop: (cb: () => void) => cb() });

    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', '--dir', dir]);

    expect(runKernelMock).toHaveBeenCalledWith(dir, expect.objectContaining({ kind: 'Stack' }), { holdUnreachable: true });
    expect(runGatewayMock).toHaveBeenCalled();
  });

  it('infers target "all" with none given, and installs shutdown', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    assertGatewayPortFreeMock.mockResolvedValue(undefined);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    runWorkerMock.mockResolvedValue({ stop: vi.fn() });
    runGatewayMock.mockResolvedValue({ stop: (cb: () => void) => cb() });

    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_WORKER);
    await program.parseAsync(['node', 'mdk', 'run', '--dir', dir]);

    expect(runKernelMock).toHaveBeenCalledWith(dir, expect.objectContaining({ kind: 'Stack' }), { holdUnreachable: true });
    expect(runWorkerMock).toHaveBeenCalled();
    expect(runGatewayMock).toHaveBeenCalled();
    expect(installShutdownMock).toHaveBeenCalled();
    const components = installShutdownMock.mock.calls[0][0];
    expect(components.map((c: { label: string }) => c.label)).toEqual(['gateway', 'worker a', 'kernel']);
  });

  it('supervises each app after the workers and before the gateway, stopping it after the gateway', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const kernel = { stop: vi.fn() };
    const app = { stop: vi.fn() };
    runKernelMock.mockResolvedValue(kernel);
    runWorkerMock.mockResolvedValue({ stop: vi.fn() });
    superviseAppMock.mockResolvedValue(app);
    runGatewayMock.mockResolvedValue({ stop: (cb: () => void) => cb() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_APP);
    await program.parseAsync(['node', 'mdk', 'run', '--dir', dir]);

    expect(superviseAppMock).toHaveBeenCalledWith(dir, expect.objectContaining({ name: 'demo' }), kernel, undefined, expect.objectContaining({ kind: 'Stack' }));
    expect(releaseUnreachableReportsMock).toHaveBeenCalledWith(kernel);
    const order = [runWorkerMock, releaseUnreachableReportsMock, superviseAppMock, runGatewayMock].map((m) => m.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const components = installShutdownMock.mock.calls[0][0];
    expect(components.map((c: { label: string }) => c.label)).toEqual(['gateway', 'app demo', 'worker a', 'kernel']);
    for (const c of components) await c.stop();
    expect(app.stop).toHaveBeenCalled();
    expect(kernel.stop).toHaveBeenCalled();
  });

  it('dies when the gateway stop callback throws, is swallowed by stopGateway', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    runWorkerMock.mockResolvedValue({ stop: vi.fn() });
    runGatewayMock.mockResolvedValue({
      stop: () => {
        throw new Error('boom');
      },
    });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_WORKER);
    await program.parseAsync(['node', 'mdk', 'run', '--dir', dir]);
    const components = installShutdownMock.mock.calls[0][0];
    const gateway = components.find((c: { label: string }) => c.label === 'gateway');
    await expect(gateway.stop()).resolves.toBeUndefined();
  });

  it('prints the held unreachable reports even when a worker fails to boot', async () => {
    const program = buildProgram();
    mockProcessExit();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const kernel = { stop: vi.fn() };
    runKernelMock.mockResolvedValue(kernel);
    runWorkerMock.mockRejectedValue(new Error('boom'));
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_WORKER);
    await expect(program.parseAsync(['node', 'mdk', 'run', '--dir', dir])).rejects.toThrow(ProcessExitSignal);
    expect(releaseUnreachableReportsMock).toHaveBeenCalledWith(kernel);
  });

  it('refuses to boot a Kernel on a policy that binds nobody, naming the fix', async () => {
    for (const args of [[], ['kernel']]) {
      const program = buildProgram();
      mockProcessExit();
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const dir = makeTmpDir();
      writeSpec(dir, SPEC_UNBOUND);
      await expect(program.parseAsync(['node', 'mdk', 'run', ...args, '--dir', dir])).rejects.toThrow(ProcessExitSignal);
      expect(stderr.mock.calls.join('')).toMatch(/spec\.rbac binds nobody.*nobody able to administer it.*Run `mdk rbac init` first, then `mdk run`/);
      expect(runKernelMock).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    }
  });

  it('boots a component that is not the Kernel whatever the policy says', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runGatewayMock.mockResolvedValue({ stop: (cb: () => void) => cb() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_UNBOUND);
    await program.parseAsync(['node', 'mdk', 'run', 'gateway', '--dir', dir]);
    expect(runGatewayMock).toHaveBeenCalled();
  });

  it('runs target "kernel" standalone', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'kernel', '--dir', dir]);
    expect(runKernelMock).toHaveBeenCalledWith(dir, expect.objectContaining({ kind: 'Stack' }));
    expect(runGatewayMock).not.toHaveBeenCalled();
  });

  it('warns when Node is older than MDK supports, and still runs', async () => {
    const version = vi.spyOn(process.versions, 'node', 'get').mockReturnValue('22.1.0');
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await buildProgram().parseAsync(['node', 'mdk', 'run', 'kernel', '--dir', dir]);
    expect(stderr.mock.calls.join('')).toMatch(/Node 22\.1\.0 is too old; MDK needs Node >= 24, so the stack may fail to start/);
    expect(runKernelMock).toHaveBeenCalled();
    version.mockRestore();
  });

  it('does not warn on a supported Node', async () => {
    const version = vi.spyOn(process.versions, 'node', 'get').mockReturnValue('24.0.0');
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await buildProgram().parseAsync(['node', 'mdk', 'run', 'kernel', '--dir', dir]);
    expect(stderr.mock.calls.join('')).not.toMatch(/too old/);
    version.mockRestore();
  });

  it('runs target "gateway" standalone', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runGatewayMock.mockResolvedValue({ stop: (cb: () => void) => cb() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'gateway', '--dir', dir]);
    expect(runGatewayMock).toHaveBeenCalled();
  });

  it('runs target "mcp" standalone', async () => {
    const program = buildProgram();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runMcpMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'mcp', '--dir', dir]);
    expect(runMcpMock).toHaveBeenCalledWith(dir, expect.anything(), undefined, { allowWrite: false });
    expect(stderr.mock.calls.join('')).toContain('MCP server running.');
  });

  it('passes --allow-write through to the MCP server', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runMcpMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await buildProgram().parseAsync(['node', 'mdk', 'run', 'mcp', '--allow-write', '--dir', dir]);
    expect(runMcpMock).toHaveBeenCalledWith(dir, expect.anything(), undefined, { allowWrite: true });
  });

  it('dies when `run worker` is given no name', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await expect(
      program.parseAsync(['node', 'mdk', 'run', 'worker', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain('requires a worker <name>');
  });

  it('dies when the named worker is not in mdk.yaml', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_WORKER);
    await expect(
      program.parseAsync(['node', 'mdk', 'run', 'worker', 'nope', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain('No worker named "nope"');
  });

  it('runs a named worker standalone', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runWorkerMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_WORKER);
    await program.parseAsync(['node', 'mdk', 'run', 'worker', 'a', '--dir', dir]);
    expect(runWorkerMock).toHaveBeenCalled();
  });

  it.each([
    [[], 'requires an app <name>'],
    [['nope'], 'No app named "nope" in mdk.yaml. Known apps: demo.'],
    [['demo'], undefined],
  ])('`run app %j` dies with a clear message unless the app is declared, then runs it in-process', async (args, error) => {
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const app = { stop: vi.fn() };
    runAppMock.mockResolvedValue(app);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_APP);
    const run = buildProgram().parseAsync(['node', 'mdk', 'run', 'app', ...args, '--dir', dir]);
    if (error) {
      await expect(run).rejects.toThrow(ProcessExitSignal);
      expect(stderr.mock.calls.join('')).toContain(error);
      return;
    }
    await run;
    expect(runAppMock).toHaveBeenCalledWith(dir, expect.objectContaining({ name: 'demo' }), expect.objectContaining({ kind: 'Stack' }));
    await installShutdownMock.mock.calls[0][0][0].stop();
    expect(app.stop).toHaveBeenCalled();
  });

  it('stops exactly the component each standalone target started', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stops = { kernel: vi.fn(), mcp: vi.fn(), worker: vi.fn(), dashboard: vi.fn() };
    const gatewayStop = vi.fn((cb: () => void) => cb());
    runKernelMock.mockResolvedValue({ stop: stops.kernel });
    runGatewayMock.mockResolvedValue({ stop: gatewayStop });
    runMcpMock.mockResolvedValue({ stop: stops.mcp });
    runWorkerMock.mockResolvedValue({ stop: stops.worker });
    findDashboardDirMock.mockReturnValue('/proj/apps/dashboard');
    runDashboardMock.mockResolvedValue(dashboardHandle(stops.dashboard));
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_WORKER);

    const targets: Array<[string[], string]> = [
      [['kernel'], 'kernel'],
      [['gateway'], 'gateway'],
      [['mcp'], 'mcp'],
      [['worker', 'a'], 'worker a'],
      [['dashboard'], 'dashboard'],
    ];
    for (const [args, label] of targets) {
      installShutdownMock.mockClear();
      await buildProgram().parseAsync(['node', 'mdk', 'run', ...args, '--dir', dir]);
      const components = installShutdownMock.mock.calls[0]![0] as Array<{ label: string; stop: () => unknown }>;
      expect(components.map((c) => c.label)).toEqual([label]);
      await components[0]!.stop();
    }
    for (const stop of [...Object.values(stops), gatewayStop]) expect(stop).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['worker', 'No worker named "x" in mdk.yaml. Known workers: (none).'],
    ['app', 'No app named "x" in mdk.yaml. Known apps: (none).'],
  ])('says "(none)" when `run %s <name>` is given a name and nothing is declared', async (target, message) => {
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await expect(
      buildProgram().parseAsync(['node', 'mdk', 'run', target, 'x', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain(message);
  });

  it('reports a boot failure that is not an Error object', async () => {
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockRejectedValue('plain failure');
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await expect(
      buildProgram().parseAsync(['node', 'mdk', 'run', 'kernel', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain('plain failure');
  });

  it('dies with a clear message when booting fails', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockRejectedValue(new Error('boom'));
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await expect(
      program.parseAsync(['node', 'mdk', 'run', 'kernel', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain('boom');
  });

  it.each([['kernel'], ['gateway'], ['mcp'], ['all']])(
    '`run %s <name>` refuses the name instead of ignoring it',
    async (target) => {
      mockProcessExit();
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const dir = makeTmpDir();
      writeSpec(dir, SPEC_BASE);
      await expect(buildProgram().parseAsync(['node', 'mdk', 'run', target, 'extra', '--dir', dir])).rejects.toThrow(
        ProcessExitSignal,
      );
      expect(stderr.mock.calls.join('')).toContain(`\`mdk run ${target}\` takes no name (got "extra")`);
      expect(runKernelMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['kernel', [], { kind: 'kernel' as const }, 'The kernel is already running'],
    ['worker', ['a'], { kind: 'worker' as const, name: 'a' }, 'Worker "a" is already running'],
    ['app', ['demo'], { kind: 'app' as const, name: 'demo' }, 'App "demo" is already running'],
    ['all', [], { kind: 'app' as const, name: 'demo' }, 'App "demo" is already running'],
  ])('`run %s` refuses a second copy of a running component before booting anything', async (target, args, held, error) => {
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_APP);
    const file = runLockFile(dir, held);
    mkdirSync(join(dir, '.mdk', 'run'), { recursive: true });
    writeFileSync(file, String(process.ppid));

    await expect(buildProgram().parseAsync(['node', 'mdk', 'run', target, ...args, '--dir', dir])).rejects.toThrow(
      ProcessExitSignal,
    );
    expect(stderr.mock.calls.join('')).toContain(`${error} for this project (pid ${process.ppid})`);
    for (const boot of [runKernelMock, runWorkerMock, runAppMock, superviseAppMock, runGatewayMock]) {
      expect(boot).not.toHaveBeenCalled();
    }
  });

  it('`run app <unknown>` writes no lock, whatever the name', async () => {
    mockProcessExit();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_APP);
    await expect(buildProgram().parseAsync(['node', 'mdk', 'run', 'app', '../../x', '--dir', dir])).rejects.toThrow(
      ProcessExitSignal,
    );
    expect(existsSync(join(dir, '.mdk', 'run'))).toBe(false);
  });

  it('`run` (all) holds the lock of the Kernel and of every worker and app it starts', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    runWorkerMock.mockResolvedValue({ stop: vi.fn() });
    superviseAppMock.mockResolvedValue({ stop: vi.fn() });
    runGatewayMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_WITH_APP);
    await buildProgram().parseAsync(['node', 'mdk', 'run', '--dir', dir]);
    for (const component of [{ kind: 'kernel' as const }, { kind: 'worker' as const, name: 'a' }, { kind: 'app' as const, name: 'demo' }]) {
      expect(readFileSync(runLockFile(dir, component), 'utf8')).toBe(String(process.pid));
    }
  });

  it('dies when no dashboard app is found', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    findDashboardDirMock.mockReturnValue(null);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await expect(
      program.parseAsync(['node', 'mdk', 'run', 'dashboard', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    expect(stderr.mock.calls.join('')).toContain(`No dashboard app found under ${dir}.`);
  });

  it('runs the dashboard when found', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    findDashboardDirMock.mockReturnValue('/proj/apps/dashboard');
    runDashboardMock.mockResolvedValue(dashboardHandle());
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'dashboard', '--dir', dir]);
    // A stack with no spec.apps hands the dashboard no apps.
    expect(runDashboardMock).toHaveBeenCalledWith('/proj/apps/dashboard', []);
    const components = installShutdownMock.mock.calls[0][0];
    expect(components.map((c: { label: string }) => c.label)).toEqual(['dashboard']);
  });

  it('exits 1 when the dashboard dev server exits after it started', async () => {
    const program = buildProgram();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as typeof process.exit);
    findDashboardDirMock.mockReturnValue('/proj/apps/dashboard');
    runDashboardMock.mockResolvedValue({ crashed: Promise.resolve('code 1'), stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'dashboard', '--dir', dir]);
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(stderr.mock.calls.join('')).toContain('error: The dashboard dev server exited with code 1.');
    exit.mockRestore();
  });

  // A project can hold more than one dashboard (`mdk create dashboard ui2`),
  // so the target takes a name like worker and app do.
  it('runs the dashboard the name selects', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    findDashboardDirMock.mockReturnValue('/proj/apps/ui2');
    runDashboardMock.mockResolvedValue(dashboardHandle());
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);

    await program.parseAsync(['node', 'mdk', 'run', 'dashboard', 'ui2', '--dir', dir]);
    expect(findDashboardDirMock).toHaveBeenCalledWith(dir, 'ui2');
    expect(runDashboardMock).toHaveBeenCalledWith('/proj/apps/ui2', []);
  });

  it('says which dashboard it picked, named or not', async () => {
    runDashboardMock.mockResolvedValue(dashboardHandle());
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);

    for (const [args, picked] of [
      [['ui2'], join(dir, 'apps', 'ui2')],
      // No name: the fallback scan chose this one, which used to go unsaid.
      [[], join(dir, 'apps', 'zzz-custom')],
    ] as Array<[string[], string]>) {
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      findDashboardDirMock.mockReturnValue(picked);
      await buildProgram().parseAsync(['node', 'mdk', 'run', 'dashboard', ...args, '--dir', dir]);
      expect(stderr.mock.calls.join('')).toContain(`Dashboard: ${join('apps', basename(picked))}`);
      stderr.mockRestore();
    }
  });

  it('refuses an unknown dashboard name, listing the ones the project has', async () => {
    const program = buildProgram();
    mockProcessExit();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    findDashboardDirMock.mockReturnValue(null);
    dashboardNamesMock.mockReturnValue(['dashboard', 'ui2']);
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);

    await expect(
      program.parseAsync(['node', 'mdk', 'run', 'dashboard', 'nope', '--dir', dir]),
    ).rejects.toThrow(ProcessExitSignal);
    const out = stderr.mock.calls.join('');
    expect(out).toContain(`No dashboard named "nope" under ${join(dir, 'apps')}.`);
    expect(out).toContain('Known dashboards: dashboard, ui2.');
    expect(out).toContain('mdk create dashboard nope');
    expect(runDashboardMock).not.toHaveBeenCalled();
  });

  it('refuses a dashboard name that is not a valid path segment, before any lookup', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);

    for (const name of ['../../etc', 'Ops UI', '.hidden']) {
      const program = buildProgram();
      mockProcessExit();
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      await expect(
        program.parseAsync(['node', 'mdk', 'run', 'dashboard', name, '--dir', dir]),
      ).rejects.toThrow(ProcessExitSignal);
      expect(stderr.mock.calls.join('')).toContain(`Invalid dashboard name "${name}".`);
      expect(findDashboardDirMock).not.toHaveBeenCalled();
      stderr.mockRestore();
    }
  });

  it("hands the dashboard the stack's installed apps, read from mdk.yaml, with each app's mount", async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    findDashboardDirMock.mockReturnValue('/proj/apps/dashboard');
    runDashboardMock.mockResolvedValue(dashboardHandle());
    const dir = makeTmpDir();
    for (const app of ['sentinel', 'ops']) {
      mkdirSync(join(dir, 'apps', app), { recursive: true });
      writeFileSync(join(dir, 'apps', app, 'mdk-app.yaml'), `id: io.tether.${app}\nversion: 0.1.0\ndisplayName: ${app}\n`);
    }
    writeSpec(
      dir,
      `${SPEC_BASE}\n  apps:\n    - name: sentinel\n      package: ./apps/sentinel\n    - name: ops\n      package: ./apps/ops\n      mount: /\n`,
    );

    await program.parseAsync(['node', 'mdk', 'run', 'dashboard', '--dir', dir]);
    expect(runDashboardMock).toHaveBeenCalledWith('/proj/apps/dashboard', [
      expect.objectContaining({ name: 'sentinel', id: 'io.tether.sentinel', apiBase: '/apps/sentinel' }),
      expect.objectContaining({ name: 'ops', apiBase: '' }),
    ]);
  });
});
