import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// The Kernel client is reached through a native createRequire (see status.test.ts).
const mockClient = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  applyRbac: vi.fn(),
  upsertUser: vi.fn(),
  deleteUser: vi.fn(),
  listUsers: vi.fn(),
  upsertServiceAccount: vi.fn(),
  deleteServiceAccount: vi.fn(),
  listServiceAccounts: vi.fn(),
  serviceAccountToken: vi.fn(),
}));
vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (url: string | URL) => {
      const real = actual.createRequire(url);
      const fake = ((id: string) => (id === '@tetherto/mdk-client' ? { createMdkClient: () => mockClient } : real(id))) as NodeJS.Require;
      fake.resolve = real.resolve.bind(real);
      return fake;
    },
  };
});

const ik = await import('../../src/lib/identity-kernel.js');
const { kernelKeyFile } = await import('../../src/lib/runtime.js');
const { createAgentCredential, ensureAppCredential, readCredential } = await import('../../src/lib/credentials.js');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
  mockClient.connect.mockReset();
});

const PASSWORD = 'correct horse battery';
const USER = { name: 'ankit', groups: [], disabled: false, hasPassword: true, createdAt: 't', updatedAt: 't' };

function project(kernelUp = true, rbac = ''): string {
  const dir = makeTmpDir();
  writeFileSync(join(dir, 'mdk.yaml'), `# my stack\nkind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n${rbac}`);
  if (kernelUp) {
    mkdirSync(dirname(kernelKeyFile(dir)), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'ab'.repeat(32));
  }
  return dir;
}

describe('users', () => {
  it('creates a user in the Kernel, sending only the fields given', async () => {
    mockClient.upsertUser.mockResolvedValue({ created: true, user: USER });
    const res = await ik.addUser(project(), { name: 'ankit', email: 'a@b.c', groups: ['ops'], password: PASSWORD });
    expect(res).toEqual({ ok: true, value: { created: true, user: USER } });
    expect(mockClient.upsertUser).toHaveBeenCalledWith({ name: 'ankit', email: 'a@b.c', groups: ['ops'], password: PASSWORD }, expect.anything());
    await ik.addUser(project(), { name: 'ankit', groups: [] });
    expect(mockClient.upsertUser).toHaveBeenLastCalledWith({ name: 'ankit' }, expect.anything());
  });

  it('--admin writes the admin role and binding, then applies the policy', async () => {
    const dir = project();
    mockClient.upsertUser.mockResolvedValue({ created: true, user: USER });
    mockClient.applyRbac.mockResolvedValue({ changed: true, version: 'v', appliedAt: 't', previous: null });
    const res = await ik.addUser(dir, { name: 'ankit', password: PASSWORD, admin: true });
    expect(res.ok).toBe(true);
    expect(res.value?.binding).toEqual({ roleCreated: true, bound: true });
    const { rbac } = parse(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).spec;
    expect(rbac).toEqual({
      enforcement: 'deny',
      roles: [{ name: 'admin', rules: [{ resources: ['*'], verbs: ['*'] }] }],
      bindings: [{ role: 'admin', subjects: [{ kind: 'User', name: 'ankit' }] }],
    });
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).toContain('# my stack');
    expect(mockClient.applyRbac).toHaveBeenCalledWith(rbac, expect.anything());
  });

  it('leaves mdk.yaml alone when the Kernel is down or refuses', async () => {
    const down = project(false);
    const before = readFileSync(join(down, 'mdk.yaml'), 'utf8');
    const res = await ik.addUser(down, { name: 'ankit', password: PASSWORD, admin: true });
    expect(res).toMatchObject({ ok: false, message: expect.stringMatching(/Users live in the Kernel/) });
    expect(readFileSync(join(down, 'mdk.yaml'), 'utf8')).toBe(before);

    mockClient.upsertUser.mockResolvedValue({ error: 'ERR_IDENTITY_USER_NAME_INVALID: must match' });
    expect(await ik.addUser(project(), { name: 'bad name', admin: true })).toMatchObject({ ok: false, message: 'the Kernel refused: ERR_IDENTITY_USER_NAME_INVALID: must match' });
  });

  it('reports a user saved without the binding, and a policy the Kernel refused', async () => {
    mockClient.upsertUser.mockResolvedValue({ created: false, user: USER });
    const broken = project(true, '  rbac:\n    roles: [{ name: admin, rules: [{ resources: [devices], verbs: [get] }] }]\n');
    const res = await ik.addUser(broken, { name: 'ankit', admin: true });
    expect(res).toMatchObject({ ok: false, message: expect.stringMatching(/the user was saved, but the admin binding was not/) });
    expect(res.errors?.[0]).toMatch(/verb "get" applies to none/);

    mockClient.applyRbac.mockResolvedValue({ error: 'ERR_RBAC_POLICY_INVALID: 1 problem(s)' });
    const refused = await ik.addUser(project(), { name: 'ankit', admin: true });
    expect(refused).toMatchObject({ ok: false, message: expect.stringMatching(/refused the policy/) });
    expect(refused.value?.binding?.bound).toBe(true);
  });

  it('checks the password locally before sending it', async () => {
    await expect(ik.addUser(project(), { name: 'ankit', password: 'short' })).rejects.toThrow(/ERR_IDENTITY_PASSWORD_WEAK/);
    expect(() => ik.setPassword(project(), 'ankit', 'short')).toThrow(/ERR_IDENTITY_PASSWORD_WEAK/);
    expect(mockClient.upsertUser).not.toHaveBeenCalled();
  });

  it('passwd, disable, list and remove go to the Kernel', async () => {
    const dir = project();
    mockClient.upsertUser.mockResolvedValue({ created: false, user: USER });
    await ik.setPassword(dir, 'ankit', PASSWORD);
    expect(mockClient.upsertUser).toHaveBeenLastCalledWith({ name: 'ankit', password: PASSWORD }, expect.anything());
    await ik.setDisabled(dir, 'ankit', true);
    expect(mockClient.upsertUser).toHaveBeenLastCalledWith({ name: 'ankit', disabled: true }, expect.anything());
    mockClient.listUsers.mockResolvedValue({ users: [USER] });
    expect((await ik.listUsers(dir)).value).toEqual({ users: [USER] });
    mockClient.deleteUser.mockResolvedValue({ deleted: true });
    expect((await ik.removeUser(dir, 'ankit')).value).toEqual({ deleted: true });
  });
});

describe('service accounts', () => {
  it('creates an agent credential and registers it with a running Kernel', async () => {
    const dir = project();
    mockClient.upsertServiceAccount.mockResolvedValue({ created: true, changed: true, serviceAccount: {} });
    const change = await ik.addAgent(dir, 'operator-agent');
    expect(change.registered).toBe(true);
    expect(mockClient.upsertServiceAccount).toHaveBeenCalledWith({ name: 'operator-agent', publicKey: readCredential(dir, 'operator-agent')!.publicKey }, expect.anything());
  });

  it('keeps the credential when the Kernel is down or refuses', async () => {
    const change = await ik.addAgent(project(false), 'operator-agent');
    expect(change).toMatchObject({ registered: false, message: expect.stringMatching(/registered when the Kernel next starts/) });
    expect(change.credential).not.toBeNull();
    mockClient.upsertServiceAccount.mockResolvedValue({ error: 'ERR_X' });
    expect(await ik.addAgent(project(), 'other')).toMatchObject({ registered: false, message: 'the Kernel refused: ERR_X' });
  });

  it('rotates a key and re-registers it', async () => {
    const dir = project();
    const before = createAgentCredential(dir, 'operator-agent');
    mockClient.upsertServiceAccount.mockResolvedValue({ created: false, changed: true, serviceAccount: {} });
    const change = await ik.rotateAccount(dir, 'operator-agent');
    expect(change.credential!.publicKey).not.toBe(before.publicKey);
    expect(change.registered).toBe(true);
  });

  it("removes an agent, never an app's account", async () => {
    const dir = project();
    createAgentCredential(dir, 'operator-agent');
    mockClient.deleteServiceAccount.mockResolvedValue({ deleted: true });
    expect(await ik.removeAgent(dir, 'operator-agent')).toMatchObject({ removed: true, registered: true });
    await expect(ik.removeAgent(dir, 'app:ops-center')).rejects.toThrow(/belongs to an app/);
    expect(await ik.removeAgent(project(false), 'ghost')).toMatchObject({ removed: false, registered: false });
    mockClient.deleteServiceAccount.mockResolvedValue({ error: 'ERR_X' });
    expect(await ik.removeAgent(dir, 'operator-agent')).toMatchObject({ removed: false, message: 'the Kernel refused: ERR_X' });
  });

  it('lists local credentials against what the Kernel registered', async () => {
    const dir = project();
    const app = ensureAppCredential(dir, 'ops-center');
    createAgentCredential(dir, 'operator-agent');
    mockClient.listServiceAccounts.mockResolvedValue({
      serviceAccounts: [
        { name: 'app:ops-center', kind: 'app', publicKey: app.publicKey },
        { name: 'operator-agent', kind: 'agent', publicKey: 'ff'.repeat(32) },
        { name: 'orphan', kind: 'agent', publicKey: 'ee'.repeat(32) },
      ],
    });
    expect(await ik.listAccounts(dir)).toEqual({
      kernel: 'up',
      rows: [
        { name: 'app:ops-center', kind: 'app', local: true, registered: true, stale: false },
        { name: 'operator-agent', kind: 'agent', local: true, registered: true, stale: true },
        { name: 'orphan', kind: 'agent', local: false, registered: true, stale: false },
      ],
    });
    const down = await ik.listAccounts(project(false));
    expect(down).toMatchObject({ kernel: 'down', rows: [] });
    mockClient.listServiceAccounts.mockRejectedValue(new Error('ERR_KERNEL_ACTION_FORBIDDEN: mdk-cli may not read identities'));
    expect(await ik.listAccounts(dir)).toMatchObject({ kernel: 'down', message: 'ERR_KERNEL_ACTION_FORBIDDEN: mdk-cli may not read identities' });
  });
});

describe('serviceAccountToken', () => {
  it('signs in with the local credential for an unbound bearer token', async () => {
    const dir = project();
    createAgentCredential(dir, 'operator-agent');
    mockClient.serviceAccountToken.mockResolvedValue({ accessToken: 'a', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 1 });
    const res = await ik.serviceAccountToken(dir, 'operator-agent');
    expect(res).toEqual({ ok: true, value: { accessToken: 'a', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 1 } });
    const [assertion, bind] = mockClient.serviceAccountToken.mock.calls[0]!;
    expect(JSON.parse(Buffer.from(String(assertion).split('.')[1]!, 'base64url').toString())).toMatchObject({ iss: 'operator-agent', sub: 'operator-agent' });
    expect(bind).toEqual({ bind: false });
  });

  it('reports a missing credential, a Kernel that is down, and a refusal', async () => {
    expect(await ik.serviceAccountToken(project(), 'ghost')).toMatchObject({ ok: false, message: expect.stringMatching(/mdk sa add ghost/) });
    const down = project(false);
    createAgentCredential(down, 'operator-agent');
    expect(await ik.serviceAccountToken(down, 'operator-agent')).toMatchObject({ ok: false, message: expect.stringMatching(/no Kernel key/) });
    const dir = project();
    createAgentCredential(dir, 'operator-agent');
    mockClient.serviceAccountToken.mockResolvedValue({ error: 'ERR_IDENTITY_ASSERTION_INVALID: unknown service account' });
    expect(await ik.serviceAccountToken(dir, 'operator-agent')).toMatchObject({ ok: false, message: 'the Kernel refused: ERR_IDENTITY_ASSERTION_INVALID: unknown service account' });
  });
});
