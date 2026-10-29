import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// The Kernel client is reached through a native createRequire (see status.test.ts).
const mockClient = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  listUsers: vi.fn(),
}));
const createMdkClientMock = vi.hoisted(() => vi.fn((..._args: unknown[]) => mockClient));
vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (url: string | URL) => {
      const real = actual.createRequire(url);
      const fake = ((id: string) => (id === '@tetherto/mdk-client' ? { createMdkClient: createMdkClientMock } : real(id))) as NodeJS.Require;
      fake.resolve = real.resolve.bind(real);
      return fake;
    },
  };
});

const { clearSession, readSession, sessionFile, sessionFrom, sessionTokenSource, tokenClaims, writeSession } = await import('../../src/lib/session.js');
const { login, logout, whoami } = await import('../../src/lib/session-kernel.js');
const { cliKernelClient } = await import('../../src/lib/kernel-client.js');
const { kernelKeyFile } = await import('../../src/lib/runtime.js');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
});

const jwt = (claims: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const TOKENS = { tokenType: 'Bearer', accessToken: jwt({ sub: 'ankit', email: 'a@b.c', groups: ['ops'] }), expiresIn: 600, refreshToken: 'rt-1', refreshExpiresIn: 3600 };

function project(kernelUp = true): string {
  const dir = makeTmpDir();
  if (kernelUp) {
    mkdirSync(dirname(kernelKeyFile(dir)), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'ab'.repeat(32));
  }
  return dir;
}

describe('session file', () => {
  it('round-trips at 0600, and clears', () => {
    const dir = project();
    const s = sessionFrom('ankit', TOKENS, 1000);
    expect(s).toEqual({ username: 'ankit', accessToken: TOKENS.accessToken, refreshToken: 'rt-1', expiresAt: 601000, refreshExpiresAt: 3601000 });
    writeSession(dir, s);
    expect(statSync(sessionFile(dir)).mode & 0o777).toBe(0o600);
    expect(readSession(dir)).toEqual(s);
    expect(clearSession(dir)).toBe(true);
    expect(clearSession(dir)).toBe(false);
    expect(readSession(dir)).toBeNull();
    // There but unreadable is an error, never "no session" (which would act as mdk-cli).
    writeFileSync(sessionFile(dir), '{broken');
    expect(() => readSession(dir)).toThrow(/^ERR_CLI_SESSION_INVALID/);
    writeFileSync(sessionFile(dir), JSON.stringify({ username: 'ankit' }));
    expect(() => readSession(dir)).toThrow(/^ERR_CLI_SESSION_INVALID/);
    expect(tokenClaims('garbage')).toEqual({});
  });

  it('renews before expiry, writing the rotated refresh token back', async () => {
    const dir = project();
    let now = 1000;
    writeSession(dir, sessionFrom('ankit', TOKENS, now));
    const refresh = vi.fn(async (rt: string) => ({ ...TOKENS, accessToken: `new-for-${rt}`, refreshToken: 'rt-2' }));
    const source = sessionTokenSource(dir, refresh, () => now);
    expect(await source.getToken()).toBe(TOKENS.accessToken);
    expect(refresh).not.toHaveBeenCalled();

    now += 580_000;
    expect(await source.getToken()).toBe('new-for-rt-1');
    expect(readSession(dir)?.refreshToken).toBe('rt-2');

    source.reset();
    expect(await source.getToken()).toBe('new-for-rt-2', 'a rejected token forces a renewal');
  });

  it('an ended session is an error that says to sign in again', async () => {
    const dir = project();
    const source = sessionTokenSource(dir, vi.fn(), () => 0);
    await expect(source.getToken()).rejects.toThrow(/ERR_CLI_SESSION_EXPIRED: no session.*mdk login/);

    writeSession(dir, sessionFrom('ankit', TOKENS, 0));
    await expect(sessionTokenSource(dir, vi.fn(), () => 4_000_000).getToken()).rejects.toThrow(/ran out/);
    const revoked = sessionTokenSource(dir, async () => ({ error: 'ERR_IDENTITY_REFRESH_REVOKED' }), () => 590_000);
    await expect(revoked.getToken()).rejects.toThrow(/ERR_CLI_SESSION_EXPIRED: ERR_IDENTITY_REFRESH_REVOKED/);
  });
});

describe('login, logout, whoami', () => {
  it('signs in as the CLI account and keeps the session', async () => {
    const dir = project();
    mockClient.login.mockResolvedValue(TOKENS);
    const res = await login(dir, 'ankit', 'correct horse battery');
    expect(res).toMatchObject({ ok: true, username: 'ankit' });
    expect(mockClient.login).toHaveBeenCalledWith('ankit', 'correct horse battery', expect.anything());
    expect(createMdkClientMock.mock.calls[0]![0]).toHaveProperty('kernelCredential', expect.objectContaining({ name: 'mdk-cli' }));
    expect(readSession(dir)?.refreshToken).toBe('rt-1');
    expect(whoami(dir)).toEqual({ as: 'user', sub: 'ankit', email: 'a@b.c', groups: ['ops'], sessionExpiresAt: expect.any(Number) });
  });

  it('reports a refusal and a Kernel that is down, writing nothing', async () => {
    const dir = project();
    mockClient.login.mockResolvedValue({ error: 'ERR_IDENTITY_INVALID_CREDENTIALS' });
    expect(await login(dir, 'ankit', 'x')).toEqual({ ok: false, message: 'ERR_IDENTITY_INVALID_CREDENTIALS' });
    expect(readSession(dir)).toBeNull();
    expect((await login(project(false), 'ankit', 'x')).message).toMatch(/no Kernel key/);
    expect(whoami(dir)).toEqual({ as: 'serviceaccount', sub: 'mdk-cli' });
  });

  it('logout ends the session at the issuer, or at least here', async () => {
    const dir = project();
    expect(await logout(dir)).toEqual({ hadSession: false, revoked: false });
    writeSession(dir, sessionFrom('ankit', TOKENS));
    mockClient.logout.mockResolvedValue({ revoked: true });
    expect(await logout(dir)).toEqual({ hadSession: true, revoked: true });
    expect(mockClient.logout).toHaveBeenCalledWith('rt-1', expect.anything());
    expect(readSession(dir)).toBeNull();

    const down = project(false);
    writeSession(down, sessionFrom('ankit', TOKENS));
    expect(await logout(down)).toMatchObject({ hadSession: true, revoked: false, message: expect.stringMatching(/no Kernel key/) });
    expect(readSession(down)).toBeNull();

    // A broken session file is removed, so `mdk logout` gets the CLI unstuck.
    writeFileSync(sessionFile(dir), '{broken');
    expect(await logout(dir)).toEqual({ hadSession: true, revoked: false, message: 'the session file could not be read' });
    expect(readSession(dir)).toBeNull();
  });

  it('with a session, Kernel calls act as the user, renewing through the same client', async () => {
    const dir = project();
    writeSession(dir, sessionFrom('ankit', { ...TOKENS, expiresIn: 0 }));
    mockClient.refreshToken.mockResolvedValue({ ...TOKENS, refreshToken: 'rt-9' });
    cliKernelClient(dir, 'ab'.repeat(32));
    const [config, opts] = createMdkClientMock.mock.calls.at(-1) as [Record<string, unknown>, { tokenSource: { getToken(): Promise<string> } }];
    expect(config).not.toHaveProperty('kernelCredential');
    expect(await opts.tokenSource.getToken()).toBe(TOKENS.accessToken);
    expect(mockClient.refreshToken).toHaveBeenCalledWith('rt-1');
    expect(readSession(dir)?.refreshToken).toBe('rt-9');

    cliKernelClient(dir, 'ab'.repeat(32), { asService: true });
    expect(createMdkClientMock.mock.calls.at(-1)![0]).toHaveProperty('kernelCredential');
  });

  it('with a broken session file, refuses rather than acting as mdk-cli', () => {
    const dir = project();
    writeFileSync(sessionFile(dir), '{"username":"ankit","accessTo');
    const before = createMdkClientMock.mock.calls.length;
    expect(() => cliKernelClient(dir, 'ab'.repeat(32))).toThrow(/^ERR_CLI_SESSION_INVALID/);
    expect(createMdkClientMock.mock.calls.length, 'no client, so no admin account').toBe(before);
    expect(() => whoami(dir)).toThrow(/^ERR_CLI_SESSION_INVALID/);
  });
});
