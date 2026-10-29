import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// rbac-kernel.ts reaches `@tetherto/mdk-client` through a native createRequire,
// so the fake is injected at the `node:module` level (see status.test.ts).
const mockClient = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn(),
  getRbac: vi.fn(),
  applyRbac: vi.fn(),
}));
const createMdkClientMock = vi.hoisted(() => vi.fn(() => mockClient));

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (url: string | URL) => {
      const real = actual.createRequire(url);
      const fake = ((id: string) => {
        if (id === '@tetherto/mdk-client') return { createMdkClient: createMdkClientMock };
        return real(id);
      }) as NodeJS.Require;
      fake.resolve = real.resolve.bind(real);
      return fake;
    },
  };
});

const { applyStackRbac, showStackRbac } = await import('../../src/lib/rbac-kernel.js');
const { kernelKeyFile } = await import('../../src/lib/runtime.js');
const { rbacVersion } = await import('../../src/lib/rbac.js');
const { StackSpecError } = await import('../../src/lib/spec.js');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
  mockClient.connect.mockReset();
});

const RBAC = { roles: [{ name: 'viewer', rules: [{ resources: ['*'], verbs: ['get'] }] }], bindings: [{ role: 'viewer', subjects: [{ kind: 'Group', name: 'ops' }] }] };
const RBAC_YAML = '  rbac:\n    roles: [{ name: viewer, rules: [{ resources: ["*"], verbs: [get] }] }]\n    bindings: [{ role: viewer, subjects: [{ kind: Group, name: ops }] }]\n';

function project(rbac = RBAC_YAML, kernelUp = true): string {
  const dir = makeTmpDir();
  writeFileSync(join(dir, 'mdk.yaml'), `kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n${rbac}`);
  if (kernelUp) {
    mkdirSync(dirname(kernelKeyFile(dir)), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'ab'.repeat(32));
  }
  return dir;
}

const local = { version: rbacVersion(RBAC), roles: 1, bindings: 1 };

describe('applyStackRbac', () => {
  it('sends spec.rbac to the Kernel as the CLI identity and reports the switch', async () => {
    const dir = project();
    mockClient.applyRbac.mockResolvedValue({ changed: true, version: local.version, appliedAt: 't', previous: 'old' });
    expect(await applyStackRbac(dir)).toEqual({ ok: true, local, kernel: 'up', changed: true, appliedAt: 't', previous: 'old' });
    expect(mockClient.applyRbac).toHaveBeenCalledWith(RBAC, expect.objectContaining({ timeout: expect.any(Number) }));
    expect(createMdkClientMock).toHaveBeenCalledWith(expect.objectContaining({
      kernelKey: 'ab'.repeat(32),
      kernelCredential: { name: 'mdk-cli', privateKey: expect.stringContaining('PRIVATE KEY') },
    }));
    expect(mockClient.connect).toHaveBeenCalledWith({ warmup: true });
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('sends null for a stack without a policy, and reports an unchanged one', async () => {
    const dir = project('');
    mockClient.applyRbac.mockResolvedValue({ changed: false, version: rbacVersion(null), appliedAt: 't' });
    const result = await applyStackRbac(dir);
    expect(mockClient.applyRbac).toHaveBeenCalledWith(null, expect.anything());
    expect(result).toMatchObject({ ok: true, changed: false, local: { roles: 0, bindings: 0 } });
    expect(result).not.toHaveProperty('previous');
  });

  it("hands back the Kernel's refusal", async () => {
    mockClient.applyRbac.mockResolvedValue({ error: 'ERR_RBAC_POLICY_INVALID: 1 problem(s)\n  - x', errors: ['x'] });
    expect(await applyStackRbac(project())).toMatchObject({
      ok: false,
      kernel: 'up',
      message: 'the Kernel refused the policy and kept the one in force: ERR_RBAC_POLICY_INVALID: 1 problem(s)',
      errors: ['x'],
    });
  });

  it('reports a Kernel that is not running, or not reachable', async () => {
    expect(await applyStackRbac(project(RBAC_YAML, false))).toMatchObject({
      ok: false,
      kernel: 'down',
      message: expect.stringMatching(/no Kernel key at .*the Kernel applies it when it next starts/),
    });
    mockClient.connect.mockRejectedValue(new Error('ERR_MDK_STATUS_TIMEOUT\nstack'));
    expect((await applyStackRbac(project())).message).toMatch(/^Kernel unreachable \(ERR_MDK_STATUS_TIMEOUT\)/);
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('refuses an invalid spec.rbac before dialing anything', async () => {
    await expect(applyStackRbac(project('  rbac:\n    enforcement: allow\n'))).rejects.toThrow(StackSpecError);
    expect(createMdkClientMock).not.toHaveBeenCalled();
  });

  it('reports a client that cannot be created', async () => {
    createMdkClientMock.mockImplementationOnce(() => {
      throw new Error('bad key');
    });
    expect(await applyStackRbac(project())).toMatchObject({ ok: false, kernel: 'down', message: expect.stringMatching(/^bad key/) });
  });
});

describe('showStackRbac', () => {
  it('compares mdk.yaml with the record the Kernel enforces', async () => {
    const record = { version: local.version, appliedAt: 't', source: 'boot', previous: null, policy: {} };
    mockClient.getRbac.mockResolvedValue({ record });
    expect(await showStackRbac(project())).toEqual({ local, kernel: 'up', applied: record, inSync: true });

    mockClient.getRbac.mockResolvedValue({ record: { ...record, version: 'other' } });
    expect((await showStackRbac(project())).inSync).toBe(false);

    mockClient.getRbac.mockResolvedValue({ record: null });
    expect(await showStackRbac(project())).toMatchObject({ applied: null, inSync: false });
  });

  it('reports a refusal and a Kernel that is down', async () => {
    mockClient.getRbac.mockRejectedValue(new Error('ERR_KERNEL_ACTION_FORBIDDEN: mdk-cli may not read policy'));
    expect(await showStackRbac(project())).toMatchObject({ kernel: 'up', applied: null, message: expect.stringMatching(/FORBIDDEN/) });
    expect(await showStackRbac(project(RBAC_YAML, false))).toMatchObject({ kernel: 'down', inSync: false });
  });
});
