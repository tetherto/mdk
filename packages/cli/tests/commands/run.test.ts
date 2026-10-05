import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessExitSignal, cleanupTmpDirs, makeTmpDir, mockProcessExit } from '../helpers.js';

const runKernelMock = vi.hoisted(() => vi.fn());
const runGatewayMock = vi.hoisted(() => vi.fn());
const runMcpMock = vi.hoisted(() => vi.fn());
const runWorkerMock = vi.hoisted(() => vi.fn());
const assertGatewayPortFreeMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const declaredMockPortsMock = vi.hoisted(() => vi.fn(() => []));
vi.mock('../../src/lib/runtime.js', () => ({
  runKernel: runKernelMock,
  runGateway: runGatewayMock,
  runMcp: runMcpMock,
  runWorker: runWorkerMock,
  assertGatewayPortFree: assertGatewayPortFreeMock,
  declaredMockPorts: declaredMockPortsMock,
}));

const findDashboardDirMock = vi.hoisted(() => vi.fn());
const runDashboardMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/dashboard.js', () => ({
  findDashboardDir: findDashboardDirMock,
  runDashboard: runDashboardMock,
}));

const installShutdownMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/shutdown.js', () => ({ installShutdown: installShutdownMock }));

const { registerRun } = await import('../../src/commands/run.js');

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerRun(program);
  return program;
}

function writeSpec(dir: string, content: string): void {
  writeFileSync(join(dir, 'mdk.yaml'), content, 'utf8');
}

const SPEC_WITH_WORKER = [
  'kind: Stack',
  'apiVersion: mdk/v1',
  'spec:',
  '  gateway:',
  '    port: 3847',
  '  workers:',
  '    - name: a',
  '      package: ./workers/a',
].join('\n');

const SPEC_BASE = ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847'].join(
  '\n',
);

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
});

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

    expect(runKernelMock).toHaveBeenCalledWith(dir);
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

    expect(runKernelMock).toHaveBeenCalledWith(dir);
    expect(runWorkerMock).toHaveBeenCalled();
    expect(runGatewayMock).toHaveBeenCalled();
    expect(installShutdownMock).toHaveBeenCalled();
    const components = installShutdownMock.mock.calls[0][0];
    expect(components.map((c: { label: string }) => c.label)).toEqual(['gateway', 'worker a', 'kernel']);
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

  it('runs target "kernel" standalone', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    runKernelMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'kernel', '--dir', dir]);
    expect(runKernelMock).toHaveBeenCalledWith(dir);
    expect(runGatewayMock).not.toHaveBeenCalled();
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
    expect(runMcpMock).toHaveBeenCalled();
    expect(stderr.mock.calls.join('')).toContain('MCP server running.');
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
    expect(stderr.mock.calls.join('')).toContain('No dashboard app found');
  });

  it('runs the dashboard when found', async () => {
    const program = buildProgram();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    findDashboardDirMock.mockReturnValue('/proj/apps/dashboard');
    runDashboardMock.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    writeSpec(dir, SPEC_BASE);
    await program.parseAsync(['node', 'mdk', 'run', 'dashboard', '--dir', dir]);
    expect(runDashboardMock).toHaveBeenCalledWith('/proj/apps/dashboard');
    const components = installShutdownMock.mock.calls[0][0];
    expect(components.map((c: { label: string }) => c.label)).toEqual(['dashboard']);
  });
});
