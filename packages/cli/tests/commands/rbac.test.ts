import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockProcessExit, ProcessExitSignal } from '../helpers.js';

const applyMock = vi.hoisted(() => vi.fn());
const showMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/rbac-kernel.js', () => ({ applyStackRbac: applyMock, showStackRbac: showMock }));
const initMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/rbac-init.js', () => ({ initPolicy: initMock }));

const { registerRbac } = await import('../../src/commands/rbac.js');
const { StackSpecError } = await import('../../src/lib/spec.js');

function run(...args: string[]): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  program.option('-o, --output <fmt>', 'format', 'table');
  registerRbac(program);
  return program.parseAsync(['node', 'mdk', ...args]);
}

function capture() {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return { out: () => stdout.mock.calls.join(''), err: () => stderr.mock.calls.join('') };
}

afterEach(() => {
  vi.restoreAllMocks();
  applyMock.mockReset();
  showMock.mockReset();
  initMock.mockReset();
  process.exitCode = undefined;
});

const local = { version: 'aaaa', roles: 2, bindings: 3 };

describe('mdk rbac apply', () => {
  it('reports the switch, and passes --dir through', async () => {
    const io = capture();
    applyMock.mockResolvedValue({ ok: true, local, kernel: 'up', changed: true, previous: 'zzzz', appliedAt: 't' });
    await run('rbac', 'apply', '--dir', 'proj');
    expect(applyMock).toHaveBeenCalledWith('proj');
    expect(io.out()).toMatch(/Applied spec\.rbac zzzz .* aaaa \(2 roles, 3 bindings\)/);
    expect(process.exitCode).toBeUndefined();
  });

  it('says so when the Kernel already enforces it, or never had a policy', async () => {
    const io = capture();
    applyMock.mockResolvedValueOnce({ ok: true, local, kernel: 'up', changed: false });
    await run('rbac', 'apply');
    expect(io.out()).toMatch(/already enforces spec\.rbac aaaa/);
    applyMock.mockResolvedValueOnce({ ok: true, local, kernel: 'up', changed: true, previous: null });
    await run('rbac', 'apply');
    expect(io.out()).toMatch(/Applied spec\.rbac none/);
  });

  it('exits 1 with every problem when the Kernel refuses or is down', async () => {
    const io = capture();
    applyMock.mockResolvedValue({ ok: false, local, kernel: 'up', message: 'refused', errors: ['p1', 'p2'] });
    await run('rbac', 'apply');
    expect(io.out()).toMatch(/error.*refused\n {2}p1\n {2}p2/);
    expect(process.exitCode).toBe(1);
  });

  it('exits 1 on an invalid mdk.yaml, and rethrows anything else', async () => {
    const io = capture();
    applyMock.mockRejectedValueOnce(new StackSpecError('mdk.yaml: `spec.rbac` is invalid'));
    await run('rbac', 'apply');
    expect(io.err()).toMatch(/spec\.rbac` is invalid/);
    expect(process.exitCode).toBe(1);
    applyMock.mockRejectedValueOnce(new Error('boom'));
    await expect(run('rbac', 'apply')).rejects.toThrow('boom');
  });

  it('prints json and yaml', async () => {
    const io = capture();
    const result = { ok: true, local, kernel: 'up', changed: false };
    applyMock.mockResolvedValue(result);
    await run('-o', 'json', 'rbac', 'apply');
    expect(JSON.parse(io.out())).toEqual(result);
    await run('-o', 'yaml', 'rbac', 'apply');
    expect(io.out()).toContain('kernel: up');
  });

  it('rejects an unknown output format', async () => {
    capture();
    mockProcessExit();
    await expect(run('-o', 'xml', 'rbac', 'apply')).rejects.toThrow(ProcessExitSignal);
  });
});

describe('mdk rbac show', () => {
  const applied = { version: 'aaaa', appliedAt: '2026-10-21T00:00:00.000Z', source: 'boot', previous: null, policy: {} };

  it('shows both versions and whether they match', async () => {
    const io = capture();
    showMock.mockResolvedValueOnce({ local, kernel: 'up', applied, inSync: true });
    await run('rbac', 'show');
    expect(io.out()).toMatch(/mdk\.yaml {2}aaaa/);
    expect(io.out()).toMatch(/kernel {4}aaaa applied 2026-10-21T00:00:00\.000Z by boot/);
    expect(io.out()).toMatch(/in sync/);

    showMock.mockResolvedValueOnce({ local, kernel: 'up', applied: { ...applied, version: 'bbbb' }, inSync: false });
    await run('rbac', 'show');
    expect(io.out()).toMatch(/differs.*mdk rbac apply/);
    expect(process.exitCode).toBeUndefined();
  });

  it('shows a Kernel with no policy, a refusal, and a Kernel that is down', async () => {
    const io = capture();
    showMock.mockResolvedValueOnce({ local, kernel: 'up', applied: null, inSync: false });
    await run('rbac', 'show');
    expect(io.out()).toMatch(/no policy applied \(denies everything\)/);
    showMock.mockResolvedValueOnce({ local, kernel: 'up', applied: null, inSync: false, message: 'ERR_KERNEL_ACTION_FORBIDDEN' });
    await run('rbac', 'show');
    expect(io.out()).toMatch(/ERR_KERNEL_ACTION_FORBIDDEN/);
    showMock.mockResolvedValueOnce({ local, kernel: 'down', applied: null, inSync: false, message: 'no Kernel key' });
    await run('rbac', 'show');
    expect(io.out()).toMatch(/down.*no Kernel key/);
    expect(process.exitCode).toBe(1);
  });
});

describe('mdk rbac init', () => {
  it('reports the CLI binding, each app and the policy in force; an app error exits 1', async () => {
    const io = capture();
    initMock.mockResolvedValueOnce({
      cli: { roleCreated: true, bound: true },
      gateway: { roleCreated: true, bound: true },
      mcp: { roleCreated: false, bound: true },
      apps: [
        { app: 'tuner', action: 'add' },
        { app: 'quiet', action: 'none' },
        { app: 'kept', action: 'keep' },
        { app: 'edited', action: 'conflict', message: 'role app-edited differs' },
      ],
      applied: { ok: true, local: { version: 'v9' } },
    });
    await run('rbac', 'init', '--dir', 'proj');
    expect(initMock).toHaveBeenCalledWith('proj');
    const out = io.out();
    expect(out).toMatch(/added role admin[\s\S]*bound mdk-cli to admin[\s\S]*bound mdk-gateway to gateway \(policy: read\)/);
    expect(out).toMatch(/tuner granted its requested Kernel access/);
    expect(out).toMatch(/quiet requests no Kernel access/);
    expect(out).toMatch(/kept grant already in place/);
    expect(out).toMatch(/edited role app-edited differs/);
    expect(out).toMatch(/The Kernel enforces v9/);
    expect(process.exitCode).toBeUndefined();

    initMock.mockResolvedValueOnce({
      cli: { roleCreated: false, bound: false },
      gateway: { roleCreated: false, bound: false },
      mcp: { roleCreated: false, bound: false },
      apps: [{ app: 'broken', action: 'error', message: 'not a valid app' }],
      applied: { ok: false, kernel: 'up', message: 'the Kernel refused the policy' },
    });
    await run('rbac', 'init');
    expect(io.out()).toMatch(/already bound mdk-cli[\s\S]*refused the policy\. Restart the Kernel/);

    initMock.mockResolvedValueOnce({ cli: { roleCreated: false, bound: false },
      gateway: { roleCreated: false, bound: false },
      mcp: { roleCreated: false, bound: false }, apps: [], applied: { ok: false, kernel: 'down', message: 'no Kernel key; it applies it when it next starts.' } });
    await run('rbac', 'init');
    expect(io.out()).toMatch(/no Kernel key; it applies it when it next starts\.\n/);
    expect(process.exitCode).toBe(1);
  });
});
