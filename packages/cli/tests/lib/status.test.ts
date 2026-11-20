import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// status.ts lazily loads `@tetherto/mdk-client` via a native
// `createRequire(import.meta.url)` call, which bypasses the ESM module graph
// vi.mock normally patches — so the fake has to be injected at the
// `node:module` level, same technique as runtime.test.ts.
const mockClient = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn(),
  getJwks: vi.fn().mockResolvedValue({ keys: [] }),
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

// Every real failure inside `loadStackSpec` is wrapped as a `StackSpecError` —
// exercising the "some other error" rethrow branch needs a controllable fake.
const specControl = vi.hoisted(() => ({ throwGeneric: false }));
vi.mock('../../src/lib/spec.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/spec.js')>();
  return {
    ...actual,
    loadStackSpec: (dir: string) => {
      if (specControl.throwGeneric) throw new Error('totally unexpected');
      return actual.loadStackSpec(dir);
    },
  };
});

const { collectStatus } = await import('../../src/lib/status.js');
const { kernelKeyFile, trustedKeysDir } = await import('../../src/lib/runtime.js');
const { appChildFile, runLockFile, writeAppChildFile } = await import('../../src/lib/run-lock.js');
const { sessionFile } = await import('../../src/lib/session.js');
// The unpatched loader, for the one test that checks the real client.
const realRequire = (await vi.importActual<typeof import('node:module')>('node:module')).createRequire(import.meta.url);

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  specControl.throwGeneric = false;
});

function writeSpec(dir: string, content: string): void {
  writeFileSync(join(dir, 'mdk.yaml'), content, 'utf8');
}

describe('collectStatus', () => {
  it('reports a missing spec, a down kernel, and an unknown-gateway-port down state', async () => {
    const dir = makeTmpDir();
    vi.stubGlobal('fetch', vi.fn());

    const report = await collectStatus(dir);

    expect(report.environment.spec.found).toBe(false);
    expect(report.environment.spec.valid).toBe(false);
    expect(report.environment.spec.error).toMatch(/No mdk\.yaml found/);
    expect(report.stack.kernel.state).toBe('down');
    expect(report.stack.gateway.state).toBe('down');
    expect(report.stack.gateway.error).toMatch(/gateway port unknown/);
    expect(report.health).toBe('down');
    expect(report.ok).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rethrows a non-StackSpecError raised while loading the spec', async () => {
    const dir = makeTmpDir();
    specControl.throwGeneric = true;
    await expect(collectStatus(dir)).rejects.toThrow('totally unexpected');
  });

  it('marks declared packages as missing when they cannot be resolved', async () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  apps:',
        '    - name: x',
        '      package: not-installed-anywhere',
        '  workers:',
        '    - name: a',
        '      package: ./workers/missing',
      ].join('\n'),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('fetch failed'), {})),
    );

    const report = await collectStatus(dir);
    expect(report.environment.dependencies.ok).toBe(false);
    expect(report.environment.dependencies.missing).toEqual([
      './workers/missing',
      'not-installed-anywhere',
    ]);
  });

  it('resolves a local worker package path that exists on disk', async () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, 'workers', 'a'), { recursive: true });
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  workers:',
        '    - name: a',
        '      package: ./workers/a',
      ].join('\n'),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    const report = await collectStatus(dir);
    expect(report.environment.dependencies.missing).toEqual([]);
  });

  it('resolves a package subpath the way `mdk run` does, though the subdirectory has no package.json', async () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, 'node_modules', '@your-org', 'apps', 'ops'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', '@your-org', 'apps', 'package.json'), '{"name":"@your-org/apps","version":"1.0.0"}');
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  apps:',
        '    - name: ops',
        '      package: "@your-org/apps/ops"',
        '    - name: gone',
        '      package: "@your-org/apps/gone"',
      ].join('\n'),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    const report = await collectStatus(dir);
    expect(report.environment.dependencies.missing).toEqual(['@your-org/apps/gone']);
  });

  it('probes the gateway as up on a 2xx response, and down (no error) on ECONNREFUSED', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    let report = await collectStatus(dir);
    expect(report.stack.gateway.state).toBe('up');
    expect(report.stack.gateway.error).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3847')));
    report = await collectStatus(dir);
    expect(report.stack.gateway.state).toBe('down');
    expect(report.stack.gateway.error).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    report = await collectStatus(dir);
    expect(report.stack.gateway.state).toBe('down');
    expect(report.stack.gateway.error).toBe('HTTP 500');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    report = await collectStatus(dir);
    expect(report.stack.gateway.error).toBe('boom');
  });

  it('reports the kernel down (no error) when there is no key file', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const report = await collectStatus(dir);
    expect(report.stack.kernel.state).toBe('down');
    expect(report.stack.kernel.error).toBeNull();
    expect(createMdkClientMock).not.toHaveBeenCalled();
  });

  it('reports the kernel down with an error when the key file cannot be read', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    // A directory in place of the key file makes readFileSync throw (EISDIR).
    mkdirSync(kernelKeyFile(dir), { recursive: true });

    const report = await collectStatus(dir);
    expect(report.stack.kernel.state).toBe('down');
    expect(report.stack.kernel.error).toBeTruthy();
  });

  it('reports the kernel up with its live worker registry, merging declared + extra workers', async () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  workers:',
        '    - name: declared-a',
        '      package: ./workers/a',
        '    - name: declared-missing',
        '      package: ./workers/b',
      ].join('\n'),
    );
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({
      workers: [
        { workerId: 'declared-a', state: 'READY', healthState: 'OK', deviceCount: 2 },
        { workerId: 'extra-worker', state: 'READY', deviceIds: ['x', 'y', 'z'] },
      ],
      totalDevices: 5,
    });

    const report = await collectStatus(dir);
    const [config] = createMdkClientMock.mock.calls[0] as unknown as [{ kernelKey: string; kernelKeyPair: { publicKey: Buffer } }];
    expect(config.kernelKey).toBe('deadbeef');
    // The Kernel is fail-closed: the probe dials with a CLI key it publishes for the Kernel to admit.
    expect(readFileSync(join(trustedKeysDir(dir), 'cli.pub'), 'utf8')).toBe(config.kernelKeyPair.publicKey.toString('hex'));
    expect(report.stack.kernel.state).toBe('up');
    expect(report.stack.kernel).not.toHaveProperty('refused');
    expect(report.stack.workers.checked).toBe(true);
    expect(report.stack.workers.declared).toBe(2);
    expect(report.stack.workers.registered).toBe(2);
    expect(report.stack.workers.totalDevices).toBe(5);

    const byName = new Map(report.stack.workers.items.map((w) => [w.name, w]));
    expect(byName.get('declared-a')).toMatchObject({ declared: true, registered: true, devices: 2 });
    expect(byName.get('declared-missing')).toMatchObject({ declared: true, registered: false, devices: 0 });
    expect(byName.get('extra-worker')).toMatchObject({ declared: false, registered: true, devices: 3 });

    expect(mockClient.close).toHaveBeenCalled();
    expect(report.health).toBe('degraded'); // declared-missing is not registered
  });

  it('reports the kernel down with the connect error message, and always closes the client', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockRejectedValue(new Error('handshake failed'));

    const report = await collectStatus(dir);
    expect(report.stack.kernel.state).toBe('down');
    expect(report.stack.kernel.error).toBe('handshake failed');
    expect(report.stack.workers.checked).toBe(false);
    expect(mockClient.getJwks).not.toHaveBeenCalled();
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('reports a Kernel that refused the session or permission as up, with its registry unchecked and the stack degraded', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockResolvedValue(undefined);

    for (const [error, pings] of [
      // Refused by the CLI before anything was sent: a ping, retried once past a cold-connection timeout, proves the Kernel up.
      ['ERR_CLI_SESSION_EXPIRED: the session ran out. Sign in again with `mdk login`.', 2],
      // Refused by the Kernel itself: it answered, so no ping.
      ['ERR_KERNEL_ACTION_FORBIDDEN: viewer may not list workers', 0],
    ] as const) {
      mockClient.getJwks.mockClear();
      mockClient.getStatus.mockRejectedValueOnce(new Error(error));
      if (pings) mockClient.getJwks.mockRejectedValueOnce(new Error('ERR_MDK_REQUEST_TIMEOUT'));
      const report = await collectStatus(dir);
      expect(mockClient.getJwks).toHaveBeenCalledTimes(pings);
      expect(report.stack.kernel).toMatchObject({ state: 'up', key: 'deadbeef', error, refused: true });
      expect(report.stack.workers).toMatchObject({ checked: false, declared: 0, registered: 0 });
      // Nothing else is wrong, but nothing past the Kernel was checked.
      expect(report.health).toBe('degraded');
      expect(report.ok).toBe(false);
    }
    expect(mockClient.close).toHaveBeenCalledTimes(2);
  });

  it('pings with the service account when the session file cannot be read', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    writeFileSync(sessionFile(dir), '{ not json', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const report = await collectStatus(dir);
    expect(report.stack.kernel).toMatchObject({ state: 'up', refused: true, error: expect.stringMatching(/^ERR_CLI_SESSION_INVALID/) });
    expect(createMdkClientMock).toHaveBeenCalledWith(expect.objectContaining({ kernelCredential: expect.objectContaining({ name: 'mdk-cli' }) }));
    expect(mockClient.getStatus).not.toHaveBeenCalled();
    expect(mockClient.close).toHaveBeenCalled();

    for (let i = 0; i < 3; i++) mockClient.getJwks.mockRejectedValueOnce(new Error('ERR_MDK_CLIENT_UNAVAILABLE: CHANNEL_CLOSED'));
    expect((await collectStatus(dir)).stack.kernel).toMatchObject({ state: 'down', error: 'ERR_MDK_CLIENT_UNAVAILABLE: CHANNEL_CLOSED' });
  });

  it('reports the Kernel down with the ping error when a refusal meets a Kernel that does not answer', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockRejectedValueOnce(new Error('ERR_CLI_SESSION_EXPIRED: the session ran out.'));
    for (let i = 0; i < 3; i++) mockClient.getJwks.mockRejectedValueOnce(new Error('ERR_MDK_CLIENT_UNAVAILABLE: CHANNEL_CLOSED'));

    const report = await collectStatus(dir);
    expect(report.stack.kernel).toEqual({ state: 'down', keyFile: kernelKeyFile(dir), key: 'deadbeef', error: 'ERR_MDK_CLIENT_UNAVAILABLE: CHANNEL_CLOSED' });
    expect(mockClient.getJwks).toHaveBeenCalledTimes(3);
    expect(report.health).toBe('down');
  });

  it('stringifies non-Error throws from the gateway probe and the kernel connect call, and swallows a close() rejection', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    // eslint-disable-next-line prefer-promise-reject-errors
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain string rejection'));
    mockClient.connect.mockRejectedValue('handshake blew up');
    mockClient.close.mockRejectedValueOnce(new Error('close failed'));

    const report = await collectStatus(dir);
    expect(report.stack.gateway.error).toBe('plain string rejection');
    expect(report.stack.kernel.error).toBe('handshake blew up');
  });

  it('defaults a live worker missing state/health/device fields to null/0, including one outside the declared set', async () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  workers:',
        '    - name: a',
        '      package: ./workers/a',
      ].join('\n'),
    );
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({
      workers: [{ workerId: 'a' }, { workerId: 'unlisted' }],
      totalDevices: 0,
    });

    const report = await collectStatus(dir);
    const byName = new Map(report.stack.workers.items.map((w) => [w.name, w]));
    expect(byName.get('a')).toMatchObject({ state: null, health: null, devices: 0 });
    expect(byName.get('unlisted')).toMatchObject({ declared: false, state: null, health: null, devices: 0 });
    // A registered worker with no `state` is still "serving" (no mismatch to flag).
    expect(report.health).toBe('healthy');
  });

  it('reports healthy when the kernel, gateway and every declared worker are all up', async () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  workers:',
        '    - name: a',
        '      package: ./workers/a',
      ].join('\n'),
    );
    mkdirSync(join(dir, 'workers', 'a'), { recursive: true });
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({
      workers: [{ workerId: 'a', state: 'READY', healthState: 'OK', deviceCount: 1 }],
      totalDevices: 1,
    });

    const report = await collectStatus(dir);
    expect(report.health).toBe('healthy');
    expect(report.ok).toBe(true);
  });

  it('reports each declared app as running while a live process holds its run lock, else degraded', async () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  apps:',
        '    - name: ops',
        '      package: ./apps/ops',
        '    - name: fleet',
        '      package: ./apps/fleet',
      ].join('\n'),
    );
    mkdirSync(join(dir, 'apps', 'ops'), { recursive: true });
    writeFileSync(join(dir, 'apps', 'ops', 'package.json'), JSON.stringify({ name: 'ops', version: '1.4.0' }));
    mkdirSync(join(dir, 'apps', 'fleet'), { recursive: true });
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({ workers: [], totalDevices: 0 });

    const lockFile = runLockFile(dir, { kind: 'app', name: 'ops' });
    mkdirSync(join(lockFile, '..'), { recursive: true });
    writeFileSync(lockFile, String(process.ppid));

    let report = await collectStatus(dir);
    expect(report.stack.gateway.state, 'a 404 from / still means the Gateway is serving').toBe('up');
    expect(report.stack.apps).toEqual({
      declared: 2,
      running: 1,
      items: [
        { name: 'ops', package: './apps/ops', version: '1.4.0', mount: '/apps/ops', running: true, pid: process.ppid },
        { name: 'fleet', package: './apps/fleet', version: null, mount: '/apps/fleet', running: false, pid: null },
      ],
    });
    expect(report.health).toBe('degraded');

    writeFileSync(runLockFile(dir, { kind: 'app', name: 'fleet' }), String(process.ppid));
    report = await collectStatus(dir);
    expect(report.stack.apps.running).toBe(2);
    expect(report.health).toBe('healthy');

    // Under `mdk run` the lock names the supervisor; the child file names the runtime and that supervisor.
    writeAppChildFile(dir, 'ops', process.pid, process.ppid);
    report = await collectStatus(dir);
    expect(report.stack.apps.items[0], 'the runtime pid, not the supervisor').toMatchObject({ running: true, pid: process.pid });

    // A child file an earlier run left (another supervisor, or the old pid-only format) says nothing about this one.
    for (const stale of ['999999999 999999998', '999999999']) {
      writeFileSync(appChildFile(dir, 'ops'), stale);
      report = await collectStatus(dir);
      expect(report.stack.apps.items[0], `stale child file "${stale}"`).toMatchObject({ running: true, pid: process.ppid });
    }

    writeAppChildFile(dir, 'ops', 999999999, process.ppid);
    report = await collectStatus(dir);
    expect(report.stack.apps.items[0], 'a crashed runtime waiting to restart is not running').toMatchObject({ running: false, pid: null });
    expect(report.health).toBe('degraded');
  });

  it('treats a DEAD/SICK or non-READY worker as not serving (degraded)', async () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  workers:',
        '    - name: a',
        '      package: ./workers/a',
      ].join('\n'),
    );
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({
      workers: [{ workerId: 'a', state: 'READY', healthState: 'DEAD', deviceCount: 1 }],
      totalDevices: 1,
    });

    const report = await collectStatus(dir);
    expect(report.health).toBe('degraded');
  });

  it.each(['STARTING', 'STOPPED'])('treats a worker the Kernel has in state %s as not serving', async (state) => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n  workers:\n    - name: a\n      package: ./workers/a\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'deadbeef', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({
      workers: [{ workerId: 'a', state, healthState: 'OK', deviceCount: 1 }],
      totalDevices: 1,
    });
    expect((await collectStatus(dir)).health).toBe('degraded');
  });

  it('hands the real @tetherto/mdk-client a config it accepts (the Kernel key is not dropped)', async () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    mkdirSync(join(dir, '.mdk'), { recursive: true });
    writeFileSync(kernelKeyFile(dir), 'ab'.repeat(32), 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.getStatus.mockResolvedValue({ workers: [], totalDevices: 0 });
    await collectStatus(dir);
    const [config] = createMdkClientMock.mock.calls[0] as unknown as [Record<string, unknown>];

    // The real client fails straight away with the bare code only when it found no key
    // in its config; with one it starts connecting (and fails later, with a reason, offline).
    const { createMdkClient } = realRequire('@tetherto/mdk-client') as {
      createMdkClient(config: unknown): { connect(): Promise<void>; close(): Promise<void> };
    };
    const client = createMdkClient(config);
    const outcome = await Promise.race([
      client.connect().then(() => 'connected', (err: Error) => err.message),
      new Promise<string>((resolve) => setTimeout(() => resolve('pending'), 200)),
    ]);
    await client.close().catch(() => {});
    expect(outcome).not.toBe('ERR_MDK_CLIENT_UNAVAILABLE');
  });
});
