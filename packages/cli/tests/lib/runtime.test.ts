import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppInstance, StackSpec, WorkerInstance } from '../../src/lib/spec.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const require = createRequire(import.meta.url);

/** Symlinks a real, already-installed package into a fresh project's node_modules,
 * so `resolveProjectPackageDir`-style resolution (paths: [projectDir]) succeeds
 * without touching the real source tree. */
function linkRealPackage(projectDir: string, name: string): void {
  const realDir = dirname(require.resolve(`${name}/package.json`));
  mkdirSync(join(projectDir, 'node_modules'), { recursive: true });
  symlinkSync(realDir, join(projectDir, 'node_modules', name));
}

// runtime.ts loads `@tetherto/mdk-core` / `@tetherto/mdk-worker` / the local-
// discovery helper / mdk-mcp / mdk-app-runtime lazily via `createRequire(import.meta.url)` — a *native*
// Node require, bypassing the ESM module graph vi.mock normally patches. This
// intercepts `node:module`'s `createRequire` itself so those specifiers
// resolve to controllable fakes, while everything else (local worker plugin
// dirs, real npm packages) still goes through the real resolver.
const mockCore = vi.hoisted(() => ({
  getKernel: vi.fn(),
  startGateway: vi.fn(),
  startDhtBootstrap: vi.fn(),
}));
const mockWorkerRuntimeV2Ctor = vi.hoisted(() => vi.fn());
const mockWorkerModule = vi.hoisted(() => ({
  WorkerRuntimeV2: mockWorkerRuntimeV2Ctor,
}));
const TEST_KERNEL_CLIENT_KEY = 'ee'.repeat(32);
const TEST_CALLER_KEYPAIR = { publicKey: Buffer.alloc(32, 1), secretKey: Buffer.alloc(64, 2) };
const mockLocalDiscovery = vi.hoisted(() => ({
  publishWorkerKey: vi.fn(),
  publishTrustedKey: vi.fn(),
  readTrustedKeys: vi.fn(() => [{ name: 'kernel', key: 'ee'.repeat(32) }]),
  trustKernel: vi.fn(() => ({ stop: vi.fn() })),
  trustKeysFromDir: vi.fn(() => ({ stop: vi.fn() })),
  callerKeyPair: vi.fn(() => ({ publicKey: Buffer.alloc(32, 1), secretKey: Buffer.alloc(64, 2) })),
}));
const mockMcp = vi.hoisted(() => ({ createMcpServer: vi.fn() }));
const mockAppRuntime = vi.hoisted(() => ({ createAppRuntime: vi.fn() }));

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (url: string | URL) => {
      const real = actual.createRequire(url);
      const fake = ((id: string) => {
        if (id === '@tetherto/mdk-core') return mockCore;
        if (id === '@tetherto/mdk-core/lib/local-discovery') return mockLocalDiscovery;
        if (id === '@tetherto/mdk-worker') return mockWorkerModule;
        if (id === '@tetherto/mdk-mcp') return mockMcp;
        if (id === '@tetherto/mdk-app-runtime') return mockAppRuntime;
        return real(id);
      }) as NodeJS.Require;
      fake.resolve = real.resolve.bind(real);
      return fake;
    },
  };
});

const runtime = await import('../../src/lib/runtime.js');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
});

describe('project-local runtime paths', () => {
  it('derives .mdk state paths from the project dir', () => {
    const dir = '/tmp/some-project';
    expect(runtime.mdkDir(dir)).toBe('/tmp/some-project/.mdk');
    expect(runtime.kernelKeyFile(dir)).toBe('/tmp/some-project/.mdk/kernel.key');
    expect(runtime.workerKeysDir(dir)).toBe('/tmp/some-project/.mdk/keys');
  });
});

describe('resolveProjectPackageDir', () => {
  it('resolves an installed package from the project node_modules', () => {
    const dir = runtime.resolveProjectPackageDir(process.cwd(), 'yaml');
    expect(dir).toMatch(/yaml$/);
  });

  it('throws an actionable error for a package that is not installed', () => {
    expect(() => runtime.resolveProjectPackageDir(process.cwd(), 'not-a-real-package-xyz')).toThrow(
      /is not installed[\s\S]*npm install not-a-real-package-xyz/,
    );
  });

  it('says `npm install` for a package package.json declares but node_modules lacks', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { 'ops-center': 'file:./apps/ops-center' } }));
    let error: Error | undefined;
    try {
      runtime.resolveProjectPackageDir(dir, 'ops-center');
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toMatch(/package\.json declares it \("file:\.\/apps\/ops-center"\), so run: npm install$/);
    expect(error?.message).not.toMatch(/npm install ops-center/);
  });

  // How a stack declares a plugin that is a subdirectory of a package with no
  // package.json of its own: the package resolves and the subpath is appended.
  it('resolves a subpath inside an installed package', () => {
    const dir = makeTmpDir();
    linkRealPackage(dir, 'yaml');
    expect(runtime.resolveProjectPackageDir(dir, 'yaml/browser')).toMatch(/yaml\/browser$/);
  });

  it('resolves a subpath inside an installed scoped package', () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, 'node_modules', '@scope', 'pkg', 'telemetry'), { recursive: true });
    writeFileSync(
      join(dir, 'node_modules', '@scope', 'pkg', 'package.json'),
      JSON.stringify({ name: '@scope/pkg', version: '1.0.0' }),
    );
    // The scope counts as part of the name, not as a subpath — `@scope/pkg` is
    // the package and `telemetry` the directory inside it.
    expect(runtime.resolveProjectPackageDir(dir, '@scope/pkg/telemetry')).toMatch(
      /node_modules\/@scope\/pkg\/telemetry$/,
    );
  });

  // A missing subpath and a missing install want different fixes, so they must not
  // read as the same failure: `npm install yaml/nope` is not a thing npm can do.
  it('distinguishes a subpath that is not there from a package that is not installed', () => {
    const dir = makeTmpDir();
    linkRealPackage(dir, 'yaml');
    expect(() => runtime.resolveProjectPackageDir(dir, 'yaml/nope')).toThrow(/has no "nope" in it/);
    expect(() => runtime.resolveProjectPackageDir(dir, 'yaml/nope')).not.toThrow(/is not installed/);
  });

  it('names the package, not the subpath, in the install hint', () => {
    expect(() =>
      runtime.resolveProjectPackageDir(makeTmpDir(), '@scope/pkg/telemetry'),
    ).toThrow(/npm install @scope\/pkg$/m);
  });
});

describe('assertGatewayPortFree', () => {
  it('resolves when the port is free', async () => {
    await expect(runtime.assertGatewayPortFree(21999)).resolves.toBeUndefined();
  });

  it('throws a clear message when the port is bound', async () => {
    const server = createServer();
    const port = await new Promise<number>((resolveListen) => {
      server.listen(0, '127.0.0.1', () => resolveListen((server.address() as { port: number }).port));
    });
    try {
      await expect(runtime.assertGatewayPortFree(port)).rejects.toThrow(/already in use/);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });
});

describe('declaredMockPorts', () => {
  const base: WorkerInstance = { name: 'a', package: './workers/a', port: 0, config: {} };

  it('returns an empty array when mock is not set', () => {
    expect(runtime.declaredMockPorts(base)).toEqual([]);
  });

  it('returns an empty array when devices is not an array', () => {
    expect(runtime.declaredMockPorts({ ...base, config: { mock: true } })).toEqual([]);
  });

  it('collects the numeric ports of a mock worker\'s seed devices', () => {
    const worker: WorkerInstance = {
      ...base,
      config: {
        mock: true,
        devices: [{ id: 'a-0', opts: { port: 100 } }, { id: 'a-1', opts: {} }, { id: 'a-2', opts: { port: 200 } }],
      },
    };
    expect(runtime.declaredMockPorts(worker)).toEqual([100, 200]);
  });
});

describe('policyWarnings', () => {
  const bind = (...names: string[]) => ({ roles: [{ name: 'r', rules: [{ resources: ['*'], verbs: ['*'] }] }], bindings: [{ role: 'r', subjects: names.map((name) => ({ kind: 'ServiceAccount' as const, name })) }] });
  const app = { name: 'ops', package: 'p', config: {} };

  it('policyRefusal names a policy nobody could administer', () => {
    expect(runtime.policyRefusal(baseSpec())).toMatch(/binds nobody.*`mdk rbac init` would be refused.*Run `mdk rbac init` first, then `mdk run`/);
    expect(runtime.policyRefusal(baseSpec({ rbac: { roles: [], bindings: [] } }))).toMatch(/binds nobody/);
    expect(runtime.policyRefusal(baseSpec({ rbac: bind('someone') }))).toBeUndefined();
    // Only an app bound (a fresh stack after `mdk create app`): the Kernel would boot, and refuse every `mdk rbac init`.
    const appOnly = {
      roles: [{ name: 'app-ops', rules: [{ resources: ['workers'], verbs: ['list'] }] }],
      bindings: [{ role: 'app-ops', subjects: [{ kind: 'ServiceAccount' as const, name: 'app:ops' }] }],
    };
    expect(runtime.policyRefusal(baseSpec({ rbac: appOnly }))).toMatch(/binds no user, and lets nobody write the policy.*mdk rbac init/);
    // An explicit `policy: write` without wildcards is enough; one scoped by resourceNames never matches policy.
    const explicit = { ...appOnly, roles: [{ name: 'app-ops', rules: [{ resources: ['policy'], verbs: ['write'] }] }] };
    expect(runtime.policyRefusal(baseSpec({ rbac: explicit }))).toBeUndefined();
    const scoped = { ...appOnly, roles: [{ name: 'app-ops', rules: [{ resources: ['*'], verbs: ['*'], resourceNames: ['miner/*'] }] }] };
    expect(runtime.policyRefusal(baseSpec({ rbac: scoped }))).toMatch(/lets nobody write the policy/);
    // A hardened stack: a user bound, policy changes through mdk.yaml and a restart. It boots.
    const userOnly = {
      roles: [{ name: 'viewer', rules: [{ resources: ['devices'], verbs: ['read'] }] }],
      bindings: [{ role: 'viewer', subjects: [{ kind: 'User' as const, name: 'ops@example.com' }] }],
    };
    expect(runtime.policyRefusal(baseSpec({ rbac: userOnly }))).toBeUndefined();
    // A binding with no subjects grants nobody.
    expect(runtime.policyRefusal(baseSpec({ rbac: { ...bind(), bindings: [{ role: 'r', subjects: [] }] } }))).toMatch(/binds nobody/);
  });

  it('warns about a policy that binds nobody, an unbound CLI and unbound apps', () => {
    expect(runtime.policyWarnings(baseSpec())).toEqual([expect.stringMatching(/binds nobody.*mdk rbac init/)]);
    expect(runtime.policyWarnings(baseSpec({ apps: [app], rbac: bind('someone') }))).toEqual([
      expect.stringMatching(/does not bind mdk-cli/),
      expect.stringMatching(/does not bind mdk-mcp.*mdk run mcp/),
      expect.stringMatching(/does not bind mdk-gateway.*mdk run gateway/),
      expect.stringMatching(/app ops has no binding/),
    ]);
    expect(runtime.policyWarnings(baseSpec({ apps: [app], rbac: bind('mdk-cli', 'mdk-gateway', 'mdk-mcp', 'app:ops') }))).toEqual([]);
  });

  it('runKernel prints them', async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runtime.runKernel(makeTmpDir(), baseSpec());
    expect(write.mock.calls.some((c) => /warning.*binds nobody/.test(String(c[0])))).toBe(true);
  });
});

describe('runKernel', () => {
  it('boots the kernel with local discovery and logs its key', async () => {
    const fakeKernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };
    mockCore.getKernel.mockResolvedValue(fakeKernel);
    const dir = makeTmpDir();
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const kernel = await runtime.runKernel(dir);

    expect(kernel).toBe(fakeKernel);
    expect(mockCore.getKernel).toHaveBeenCalledWith(
      expect.objectContaining({
        keyFile: runtime.kernelKeyFile(dir),
        discovery: { mode: 'local', dir: runtime.workerKeysDir(dir) },
        trustedKeysDir: runtime.trustedKeysDir(dir),
      }),
    );
    expect(write.mock.calls.some((c) => String(c[0]).includes('ready ab'))).toBe(true);
  });

  it("applies the stack's spec.rbac at boot (null without one); without a spec the stored policy stays", async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const spec = (rbac?: unknown) =>
      ({ apiVersion: 'mdk/v1', kind: 'Stack', metadata: { name: 's' }, spec: { apps: [], ...(rbac ? { rbac } : {}) } }) as never;

    await runtime.runKernel(makeTmpDir(), spec({ roles: [] }));
    expect(mockCore.getKernel).toHaveBeenLastCalledWith(expect.objectContaining({ rbac: { roles: [] }, serviceAccounts: [{ name: 'mdk-cli', publicKey: expect.any(String) }, { name: 'mdk-gateway', publicKey: expect.any(String) }, { name: 'mdk-mcp', publicKey: expect.any(String) }] }));
    await runtime.runKernel(makeTmpDir(), spec());
    expect(mockCore.getKernel).toHaveBeenLastCalledWith(expect.objectContaining({ rbac: null }));
    await runtime.runKernel(makeTmpDir());
    expect(mockCore.getKernel.mock.lastCall?.[0]).not.toHaveProperty('rbac');
    expect(mockCore.getKernel.mock.lastCall?.[0]).not.toHaveProperty('serviceAccounts');
  });

  it("registers the stack's apps as service accounts, creating their credentials", async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const dir = makeTmpDir();
    const spec = { apiVersion: 'mdk/v1', kind: 'Stack', metadata: { name: 's' }, spec: { apps: [{ name: 'ops', package: 'p', config: {} }] } } as never;
    await runtime.runKernel(dir, spec);
    const passed = mockCore.getKernel.mock.lastCall?.[0].serviceAccounts;
    expect(passed).toEqual([
      { name: 'app:ops', publicKey: expect.stringMatching(/^[0-9a-f]{64}$/) },
      { name: 'mdk-cli', publicKey: expect.stringMatching(/^[0-9a-f]{64}$/) },
      { name: 'mdk-gateway', publicKey: expect.stringMatching(/^[0-9a-f]{64}$/) },
      { name: 'mdk-mcp', publicKey: expect.stringMatching(/^[0-9a-f]{64}$/) },
    ]);
  });

  it('logs "(unknown)" when the kernel has no getPublicKey', async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runtime.runKernel(makeTmpDir());
    expect(write.mock.calls.some((c) => String(c[0]).includes('(unknown)'))).toBe(true);
  });
});

describe('private DHT (spec.network.dht)', () => {
  const dhtSpec = (dht: Record<string, unknown>) => baseSpec({ network: { dht: { port: 49737, ...dht } } } as never);

  it('projectDht: nothing on the public DHT; the generated bootstrap or the listed one otherwise', () => {
    expect(runtime.projectDht(makeTmpDir(), baseSpec())).toEqual({});
    expect(runtime.projectDht(makeTmpDir(), dhtSpec({}))).toEqual({ bootstrap: ['127.0.0.1:49737'], dhtHost: '127.0.0.1' });
    expect(runtime.projectDht(makeTmpDir(), dhtSpec({ host: '10.0.0.7' }))).toEqual({ bootstrap: ['10.0.0.7:49737'], dhtHost: '10.0.0.7' });
    expect(runtime.projectDht(makeTmpDir(), dhtSpec({ host: '10.0.0.7', bootstrap: ['10.0.0.5:49737'] }))).toEqual({
      bootstrap: ['10.0.0.5:49737'],
      dhtHost: '10.0.0.7',
    });
    // A listed bootstrap without a host: no loopback bind, so a LAN bootstrap stays reachable.
    expect(runtime.projectDht(makeTmpDir(), dhtSpec({ bootstrap: ['10.0.0.5:49737'] }))).toEqual({ bootstrap: ['10.0.0.5:49737'] });
    // No mdk.yaml: the public DHT.
    expect(runtime.projectDht(makeTmpDir())).toEqual({});
  });

  it('projectDht fails closed on an mdk.yaml that does not load, instead of joining the public DHT', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'spec: [unclosed\n');
    expect(() => runtime.projectDht(dir)).toThrow(/not valid YAML/);
    writeFileSync(join(dir, 'mdk.yaml'), 'spec:\n  network:\n    dht:\n      host: localhost\n');
    expect(() => runtime.projectDht(dir)).toThrow(/dht\.host` must be an IP address/);
    // Errors outside spec.network do not block it: the CLI must still reach the Kernel to fix them.
    writeFileSync(join(dir, 'mdk.yaml'), 'kind: Nope\nspec:\n  network:\n    dht:\n      bootstrap: [10.0.0.5:49737]\n');
    expect(runtime.projectDht(dir)).toEqual({ bootstrap: ['10.0.0.5:49737'] });
  });

  it('runKernel runs the bootstrap, hands the Kernel the list, and closes it after the Kernel stops', async () => {
    const order: string[] = [];
    const close = vi.fn(async () => { order.push('bootstrap'); });
    mockCore.startDhtBootstrap.mockResolvedValue({ bootstrap: ['127.0.0.1:49737'], close });
    const stop = vi.fn(async () => { order.push('kernel'); });
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const kernel = await runtime.runKernel(makeTmpDir(), dhtSpec({}));
    expect(mockCore.startDhtBootstrap).toHaveBeenCalledWith({ host: '127.0.0.1', port: 49737 });
    expect(mockCore.getKernel).toHaveBeenLastCalledWith(
      expect.objectContaining({ hrpc: { bootstrap: ['127.0.0.1:49737'], dhtHost: '127.0.0.1' } }),
    );
    await kernel.stop();
    expect(order).toEqual(['kernel', 'bootstrap']);
  });

  it('runKernel joins a listed bootstrap without starting one, and closes its own when the Kernel fails', async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runtime.runKernel(makeTmpDir(), dhtSpec({ bootstrap: ['10.0.0.5:49737'], host: '10.0.0.7' }));
    expect(mockCore.startDhtBootstrap).not.toHaveBeenCalled();
    expect(mockCore.getKernel).toHaveBeenLastCalledWith(
      expect.objectContaining({ hrpc: { bootstrap: ['10.0.0.5:49737'], dhtHost: '10.0.0.7' } }),
    );

    const close = vi.fn(async () => {});
    mockCore.startDhtBootstrap.mockResolvedValue({ bootstrap: ['127.0.0.1:49737'], close });
    mockCore.getKernel.mockRejectedValueOnce(new Error('boom'));
    await expect(runtime.runKernel(makeTmpDir(), dhtSpec({}))).rejects.toThrow('boom');
    expect(close).toHaveBeenCalled();
  });

  it('runKernel on the public DHT starts no bootstrap and passes no hrpc override', async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runtime.runKernel(makeTmpDir(), baseSpec());
    expect(mockCore.startDhtBootstrap).not.toHaveBeenCalled();
    expect(mockCore.getKernel.mock.lastCall?.[0]).not.toHaveProperty('hrpc');
  });
});

/** A project with an app at `./apps/demo` and a Kernel key file. */
function makeAppProject(): string {
  const dir = makeTmpDir();
  mkdirSync(join(dir, 'apps', 'demo'), { recursive: true });
  writeFileSync(join(dir, 'apps', 'demo', 'mdk-app.yaml'), 'id: com.example.demo\n');
  mkdirSync(runtime.mdkDir(dir), { recursive: true });
  writeFileSync(runtime.kernelKeyFile(dir), 'cafebabe\n');
  return dir;
}

function baseSpec(overrides: Partial<StackSpec['spec']> = {}): StackSpec {
  return {
    apiVersion: 'mdk/v1',
    kind: 'Stack',
    metadata: { name: 'test-stack' },
    spec: {
      kernel: { port: 0 },
      gateway: { port: 21500 },
      mcp: {},
      workers: [],
      apps: [],
      ...overrides,
    },
  };
}

describe('runGateway', () => {
  it('boots in-process when a kernel handle is given, and reports where it listens', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    const cwdBefore = process.cwd();
    try {
      const gateway = await runtime.runGateway(dir, baseSpec(), {
        _cleanup: [],
        stop: vi.fn(),
      });
      expect(gateway.stop).toBeDefined();
      const out = stderr.mock.calls.join('');
      expect(out).toContain('listening on http://localhost:21500');
      expect(out).not.toMatch(/kernel (pending|connected)/);
      expect(mockCore.startGateway).toHaveBeenCalledWith(
        expect.objectContaining({ port: 21500, kernel: expect.anything() }),
      );
      const opts = mockCore.startGateway.mock.calls.at(-1)?.[0];
      expect(opts.authVerifier).toBeUndefined();
      expect(opts.gatewayCredential, 'in-process: the Kernel policy itself, no service account').toBeUndefined();
    } finally {
      process.chdir(cwdBefore);
    }
  });

  it('out of process, signs the Gateway in as mdk-gateway', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    mkdirSync(runtime.mdkDir(dir), { recursive: true });
    writeFileSync(runtime.kernelKeyFile(dir), 'ab'.repeat(32));
    const cwdBefore = process.cwd();
    try {
      await runtime.runGateway(dir, baseSpec({ gateway: { port: 21503 } }));
      const opts = mockCore.startGateway.mock.calls.at(-1)?.[0];
      expect(opts.gatewayCredential).toEqual({ name: 'mdk-gateway', privateKey: expect.stringContaining('PRIVATE KEY') });
      expect(opts.keyFile).toBe(runtime.kernelKeyFile(dir));
    } finally {
      process.chdir(cwdBefore);
    }
  });

  it('out of process from a relative dir, signs in with the project\'s mdk-gateway key, read before the chdir', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    mkdirSync(runtime.mdkDir(dir), { recursive: true });
    writeFileSync(runtime.kernelKeyFile(dir), 'ab'.repeat(32));
    const cwdBefore = process.cwd();
    try {
      // What the Kernel registered at its start (`mdk run kernel`).
      const { ensureAgentCredential, signingCredential } = await import('../../src/lib/credentials.js');
      const registered = signingCredential(ensureAgentCredential(dir, 'mdk-gateway'));
      process.chdir(dir);
      await runtime.runGateway('.', baseSpec({ gateway: { port: 21504 } }));
      const opts = mockCore.startGateway.mock.calls.at(-1)?.[0];
      expect(opts.gatewayCredential, 'not a new key under the Gateway state root').toEqual(registered);
      expect(existsSync(join(runtime.mdkDir(dir), 'gateway', '.mdk'))).toBe(false);
    } finally {
      process.chdir(cwdBefore);
    }
  });


  it('throws when no kernel is given and no key file exists (out-of-process)', async () => {
    const dir = makeTmpDir();
    await expect(runtime.runGateway(dir, baseSpec())).rejects.toThrow(/Kernel is not running/);
  });

  it('boots out-of-process using the key file', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    mkdirSync(runtime.mdkDir(dir), { recursive: true });
    writeFileSync(runtime.kernelKeyFile(dir), 'deadbeef', 'utf8');
    const cwdBefore = process.cwd();
    try {
      const gateway = await runtime.runGateway(dir, baseSpec({ gateway: { port: 21501 } }));
      expect(gateway.stop).toBeDefined();
      expect(mockCore.startGateway).toHaveBeenCalledWith(
        expect.objectContaining({ keyFile: runtime.kernelKeyFile(dir) }),
      );
    } finally {
      process.chdir(cwdBefore);
    }
  });

  it('passes each declared app (dir, runtime key file, mount) and the gateway key file, resolved before the chdir', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const cwdBefore = process.cwd();
    process.chdir(makeAppProject());
    const dir = process.cwd();
    try {
      await runtime.runGateway(
        '.',
        baseSpec({
          gateway: { port: 21502 },
          apps: [
            { name: 'demo', package: './apps/demo', config: { secret: 1 } },
            { name: 'root', package: './apps/demo', config: {}, mount: '/' },
          ],
        }),
        { _cleanup: [], stop: vi.fn() },
      );
      const call = mockCore.startGateway.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(call.apps).toEqual([
        { name: 'demo', appDir: join(dir, 'apps', 'demo'), keyFile: join(dir, '.mdk', 'apps', 'demo', 'runtime.key') },
        { name: 'root', appDir: join(dir, 'apps', 'demo'), keyFile: join(dir, '.mdk', 'apps', 'root', 'runtime.key'), mount: '/' },
      ]);
      expect(call.gatewayKeyFile).toBe(join(dir, '.mdk', 'gateway.key'));
      // Not `.mdk/gateway/.mdk/trusted-keys`, where other processes never look.
      expect(call.trustedKeysDir).toBe(join(dir, '.mdk', 'trusted-keys'));
    } finally {
      process.chdir(cwdBefore);
    }
  });

  it('rejects up front when the gateway port is already taken', async () => {
    const server = createServer();
    const port = await new Promise<number>((resolveListen) => {
      server.listen(0, '127.0.0.1', () => resolveListen((server.address() as { port: number }).port));
    });
    try {
      await expect(
        runtime.runGateway(makeTmpDir(), baseSpec({ gateway: { port } }), {
          _cleanup: [],
          stop: vi.fn(),
        }),
      ).rejects.toThrow(/already in use/);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });
});

describe('assertMcpPortFree', () => {
  it('resolves when the port is free', async () => {
    await expect(runtime.assertMcpPortFree(21998)).resolves.toBeUndefined();
  });

  it('throws a clear message when the port is bound', async () => {
    const server = createServer();
    const port = await new Promise<number>((resolveListen) => {
      server.listen(0, '127.0.0.1', () => resolveListen((server.address() as { port: number }).port));
    });
    try {
      await expect(runtime.assertMcpPortFree(port)).rejects.toThrow(/already in use/);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });
});

describe('runMcp', () => {
  it('throws when no kernel is given and no key file exists', async () => {
    const dir = makeTmpDir();
    await expect(runtime.runMcp(dir, baseSpec())).rejects.toThrow(/Kernel is not running/);
  });

  it('reads the kernel key from the key file when present', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    mkdirSync(runtime.mdkDir(dir), { recursive: true });
    writeFileSync(runtime.kernelKeyFile(dir), 'deadbeef', 'utf8');

    await runtime.runMcp(dir, baseSpec());

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.stringContaining('mcp'),
      21600,
      { kernelKey: 'deadbeef', kernelKeyPair: TEST_CALLER_KEYPAIR },
      [],
      [],
      { allowWrite: false, handleSignals: false, keyFile: runtime.mcpKeyFile(dir), credential: { name: 'mdk-mcp', privateKey: expect.stringContaining('PRIVATE KEY') } },
    );
  });

  it('uses an in-process kernel\'s public key when a kernel handle is passed', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), allowKey: vi.fn(), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(dir, baseSpec(), kernel);

    expect(kernel.allowKey).toHaveBeenCalledWith(TEST_CALLER_KEYPAIR.publicKey);
    expect(mockLocalDiscovery.publishTrustedKey).toHaveBeenCalledWith(
      runtime.trustedKeysDir(dir),
      'mcp',
      TEST_CALLER_KEYPAIR.publicKey,
    );

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21600,
      { kernelKey: 'ab', kernelKeyPair: TEST_CALLER_KEYPAIR },
      [],
      [],
      { allowWrite: false, handleSignals: false, keyFile: runtime.mcpKeyFile(dir), kernel },
    );
  });

  it('forwards spec.spec.gateway.config as the base config layer, the same way runGateway does', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    mkdirSync(runtime.mdkDir(dir), { recursive: true });
    writeFileSync(runtime.kernelKeyFile(dir), 'deadbeef', 'utf8');

    await runtime.runMcp(
      dir,
      baseSpec({
        gateway: { port: 21501, config: { auth: { superAdmin: 'root@example.com' } } },
      }),
    );

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21501 + runtime.DEFAULT_MCP_PORT_OFFSET,
      { auth: { superAdmin: 'root@example.com' }, kernelKey: 'deadbeef', kernelKeyPair: TEST_CALLER_KEYPAIR },
      [],
      [],
      { allowWrite: false, handleSignals: false, keyFile: runtime.mcpKeyFile(dir), credential: expect.objectContaining({ name: 'mdk-mcp' }) },
    );
  });

  it('passes spec.apps as the Gateway takes them: route table dir and runtime key file, no config', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeAppProject();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(
      dir,
      baseSpec({
        apps: [{ name: 'demo', package: './apps/demo', config: { auth: { superAdmin: 'root@example.com' } } }],
      }),
      kernel,
    );

    expect(mockMcp.createMcpServer.mock.calls.at(-1)?.[4]).toEqual([
      { name: 'demo', appDir: join(dir, 'apps', 'demo'), keyFile: runtime.appKeyFile(dir, 'demo') },
    ]);
  });

  it('defaults the port to gateway.port + DEFAULT_MCP_PORT_OFFSET when spec.mcp.port is unset', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(dir, baseSpec({ gateway: { port: 21503 } }), kernel);

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21503 + runtime.DEFAULT_MCP_PORT_OFFSET,
      expect.anything(),
      [],
      [],
      { allowWrite: false, handleSignals: false, keyFile: runtime.mcpKeyFile(dir), kernel },
    );
  });

  it('uses spec.mcp.port when set', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(dir, baseSpec({ gateway: { port: 21504 }, mcp: { port: 21999 } }), kernel);

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21999,
      expect.anything(),
      [],
      [],
      { allowWrite: false, handleSignals: false, keyFile: runtime.mcpKeyFile(dir), kernel },
    );
  });

  it('passes --allow-write and spec.mcp tool options, and the in-process Kernel for spec.rbac; never handleSignals', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockMcp.createMcpServer.mockResolvedValue({ close: vi.fn((cb?: () => void) => cb?.()) });
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };
    const mcp = { allowTools: ['demo.summary'] };

    const dir = makeTmpDir();
    await runtime.runMcp(dir, baseSpec({ gateway: { port: 21505, plugins: [] }, mcp }), kernel, {
      allowWrite: true,
    });

    expect(mockMcp.createMcpServer.mock.calls.at(-1)?.[5]).toEqual({
      allowWrite: true,
      allowTools: ['demo.summary'],
      kernel,
      handleSignals: false,
      keyFile: runtime.mcpKeyFile(dir),
    });
  });

  it('rejects up front when the mcp port is already taken', async () => {
    const server = createServer();
    const port = await new Promise<number>((resolveListen) => {
      server.listen(0, '127.0.0.1', () => resolveListen((server.address() as { port: number }).port));
    });
    try {
      const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };
      await expect(
        runtime.runMcp(makeTmpDir(), baseSpec({ mcp: { port } }), kernel),
      ).rejects.toThrow(/already in use/);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });

  it('returned stop() calls the server\'s close()', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    const handle = await runtime.runMcp(dir, baseSpec(), kernel);
    await handle.stop();

    expect(closeFn).toHaveBeenCalled();
  });
});

/**
 * Writes a minimal directory-loaded (contract-first) worker package: an
 * `mdk-contract.json` at its root and no `index.js`/module exports at all —
 * `require(dir)` must never be attempted against this fixture.
 */
function writeContractWorkerFixture(dir: string, name: string, opts: { mock?: boolean } = {}): string {
  const pkgDir = join(dir, 'workers', name);
  mkdirSync(join(pkgDir, 'src'), { recursive: true });
  writeFileSync(
    join(pkgDir, 'mdk-contract.json'),
    JSON.stringify({
      metadata: { provider: 'test', deviceFamily: 'test' },
      capabilities: {
        telemetry: [{ name: 'status', handler: 'src/status.js' }],
        commands: [],
      },
    }),
    'utf8',
  );
  writeFileSync(join(pkgDir, 'src', 'status.js'), 'module.exports = async () => ({ ok: true });\n', 'utf8');
  if (opts.mock) {
    mkdirSync(join(pkgDir, 'mock'), { recursive: true });
    writeFileSync(
      join(pkgDir, 'mock', 'server.js'),
      [
        'const net = require("node:net");',
        'module.exports = {',
        '  createServer(opts) {',
        '    const server = net.createServer();',
        '    server.listen(opts.port, opts.host || "127.0.0.1");',
        '    return { server, exit() { server.close(); } };',
        '  },',
        '};',
        '',
      ].join('\n'),
      'utf8',
    );
  }
  return pkgDir;
}

describe('runWorker', () => {
  it('boots via WorkerRuntimeV2 without ever requiring the package, and threads env through', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('cd', 'hex'),
      };
    });

    const dir = makeTmpDir();
    // No index.js/exports at all — writeContractWorkerFixture never creates one,
    // so a `require(dir)` attempt would throw MODULE_NOT_FOUND and fail this test.
    writeContractWorkerFixture(dir, 'a', { mock: true });
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { mock: true, devices: [{ id: 'a-0', opts: { host: '127.0.0.1', port: 22010 } }] },
      env: { TOKEN: 'abc123' },
    };

    const handle = await runtime.runWorker(dir, worker);

    expect(mockWorkerRuntimeV2Ctor).toHaveBeenCalledTimes(1);
    const [ctorDir, ctorOpts] = mockWorkerRuntimeV2Ctor.mock.calls[0] as [string, Record<string, unknown>];
    expect(ctorDir).toBe(join(dir, 'workers', 'a'));
    expect(ctorOpts.workerId).toBe('a');
    expect(ctorOpts.env).toEqual({ TOKEN: 'abc123' });
    expect(ctorOpts.storeDir).toBe(join(dir, '.mdk', 'workers', 'a', 'identity'));
    await handle.stop();
  });

  it('defaults env to {} when the worker has none', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('cd', 'hex'),
      };
    });

    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a', { mock: true });
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { mock: true, devices: [{ id: 'a-0', opts: { host: '127.0.0.1', port: 22011 } }] },
    };

    const handle = await runtime.runWorker(dir, worker);
    const ctorOpts = mockWorkerRuntimeV2Ctor.mock.calls[0][1] as Record<string, unknown>;
    expect(ctorOpts.env).toEqual({});
    await handle.stop();
  });

  it('resolves a worker installed as an npm package, not only a local path', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('ab', 'hex'),
      };
    });
    const dir = makeTmpDir();
    const installed = writeContractWorkerFixture(dir, 'rig');
    const pkgRoot = join(dir, 'node_modules', '@your-org', 'mdk-worker-rig');
    mkdirSync(dirname(pkgRoot), { recursive: true });
    symlinkSync(installed, pkgRoot);
    writeFileSync(join(installed, 'package.json'), JSON.stringify({ name: '@your-org/mdk-worker-rig' }));
    const worker: WorkerInstance = {
      name: 'rig',
      package: '@your-org/mdk-worker-rig',
      port: 0,
      config: { devices: [{ id: 'rig-0', opts: { host: '10.0.0.1', port: 502 } }] },
    };

    const handle = await runtime.runWorker(dir, worker);
    expect(mockWorkerRuntimeV2Ctor.mock.calls[0]![0]).toBe(realpathSync(installed));
    await handle.stop();

    await expect(
      runtime.runWorker(dir, { ...worker, package: '@your-org/not-installed' }),
    ).rejects.toThrow(/Package "@your-org\/not-installed" is not installed/);
  });

  it('throws when the local package path does not exist', async () => {
    const dir = makeTmpDir();
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/missing',
      port: 0,
      config: { devices: [{ id: 'a-0' }] },
    };
    await expect(runtime.runWorker(dir, worker)).rejects.toThrow(/does not exist/);
  });

  it('throws when the resolved package has no mdk-contract.json', async () => {
    const dir = makeTmpDir();
    // A real directory, but not a contract-first Worker Plugin.
    mkdirSync(join(dir, 'workers', 'a'), { recursive: true });
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { devices: [{ id: 'a-0' }] },
    };
    await expect(runtime.runWorker(dir, worker)).rejects.toThrow(/has no mdk-contract\.json/);
  });

  it('throws when there are no seed devices', async () => {
    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a');
    const worker: WorkerInstance = { name: 'a', package: './workers/a', port: 0, config: {} };
    await expect(runtime.runWorker(dir, worker)).rejects.toThrow(/nothing to run/);
  });

  it('throws when config.mock is set but there is no mock/server.js', async () => {
    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a');
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { mock: true, devices: [{ id: 'a-0', opts: { port: 18080 } }] },
    };
    await expect(runtime.runWorker(dir, worker)).rejects.toThrow(/has no mock\/server\.js/);
  });

  it('boots a mock device, registers with an in-process kernel, and stops cleanly', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('abcd', 'hex'),
      };
    });

    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a', { mock: true });
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { mock: true, devices: [{ id: 'a-0', opts: { host: '127.0.0.1', port: 22001 } }] },
    };
    const workerStop = vi.fn().mockResolvedValue(undefined);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return { start: vi.fn().mockResolvedValue(undefined), stop: workerStop, getPublicKey: () => Buffer.from('abcd', 'hex') };
    });
    const kernel = {
      registerWorker: vi.fn().mockResolvedValue(undefined),
      getClientPublicKey: () => Buffer.from('ff'.repeat(32), 'hex'),
      _cleanup: [] as Array<() => unknown>,
    };

    const handle = await runtime.runWorker(dir, worker, kernel as never);
    expect(kernel.registerWorker).toHaveBeenCalledWith(Buffer.from('abcd', 'hex'));
    expect(kernel._cleanup).toHaveLength(1);
    const ctorOpts = mockWorkerRuntimeV2Ctor.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(ctorOpts.allowedKeys, 'the Kernel client key only: callers it admits are not let past it').toEqual([Buffer.from('ff'.repeat(32), 'hex')]);
    expect(mockLocalDiscovery.trustKernel).toHaveBeenCalled();
    // The Kernel's own shutdown takes the worker down with it.
    await kernel._cleanup[0]!();
    expect(workerStop).toHaveBeenCalledTimes(1);
    await handle.stop();
  });

  it('publishes the worker key via local discovery when no kernel is given', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('ab', 'hex'),
      };
    });
    mockLocalDiscovery.readTrustedKeys.mockReturnValueOnce([
      { name: 'kernel', key: TEST_KERNEL_CLIENT_KEY },
      { name: 'gateway', key: 'aa'.repeat(32) },
    ]);
    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a', { mock: true });
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { mock: true, devices: [{ id: 'a-0', opts: { host: '127.0.0.1', port: 22002 } }] },
    };
    const handle = await runtime.runWorker(dir, worker);
    expect(mockLocalDiscovery.publishWorkerKey).toHaveBeenCalledWith(
      runtime.workerKeysDir(dir),
      'a',
      'ab',
    );
    const ctorOpts = mockWorkerRuntimeV2Ctor.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(ctorOpts.allowedKeys).toEqual([TEST_KERNEL_CLIENT_KEY]);
    expect(mockLocalDiscovery.trustKeysFromDir).toHaveBeenCalledWith(expect.anything(), runtime.trustedKeysDir(dir));
    await handle.stop();
  });

  it('refuses to boot a standalone worker before the Kernel published its key (fail closed)', async () => {
    mockLocalDiscovery.readTrustedKeys.mockReturnValueOnce([]);
    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a');
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { devices: [{ id: 'a-0', opts: {} }] },
    };
    await expect(runtime.runWorker(dir, worker)).rejects.toThrow(/Kernel is not running/);
    expect(mockWorkerRuntimeV2Ctor).not.toHaveBeenCalled();
  });

  it('relocates a mock device off an already-bound port', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('ab', 'hex'),
      };
    });
    const held = createServer();
    const busyPort = await new Promise<number>((resolveListen) => {
      held.listen(0, '127.0.0.1', () => resolveListen((held.address() as { port: number }).port));
    });
    try {
      const dir = makeTmpDir();
      writeContractWorkerFixture(dir, 'a', { mock: true });
      const worker: WorkerInstance = {
        name: 'a',
        package: './workers/a',
        port: 0,
        config: { mock: true, devices: [{ id: 'a-0', opts: { host: '127.0.0.1', port: busyPort } }] },
      };
      const handle = await runtime.runWorker(dir, worker);
      await handle.stop();
    } finally {
      await new Promise<void>((resolveClose) => held.close(() => resolveClose()));
    }
  });

  it('runs without a mock when config.mock is false, using the seed opts as-is', async () => {
    mockWorkerRuntimeV2Ctor.mockImplementation(function () {
      return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getPublicKey: () => Buffer.from('ab', 'hex'),
      };
    });
    const dir = makeTmpDir();
    writeContractWorkerFixture(dir, 'a');
    const worker: WorkerInstance = {
      name: 'a',
      package: './workers/a',
      port: 0,
      config: { devices: [{ id: 'a-0', opts: { host: '10.0.0.1', port: 502 } }] },
    };
    const handle = await runtime.runWorker(dir, worker);
    await handle.stop();
  });
});

describe('app runtimes', () => {
  const demoApp: AppInstance = { name: 'demo', package: './apps/demo', config: { greeting: 'hi' } };
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('resolves an app from a local path or an installed package subpath, requiring mdk-app.yaml', () => {
    const dir = makeAppProject();
    expect(runtime.resolveAppPackageDir(dir, './apps/demo')).toBe(join(dir, 'apps', 'demo'));
    expect(() => runtime.resolveAppPackageDir(dir, './apps')).toThrow(/has no mdk-app\.yaml/);

    const pkgRoot = join(dir, 'node_modules', '@your-org', 'apps');
    mkdirSync(join(pkgRoot, 'billing'), { recursive: true });
    writeFileSync(join(pkgRoot, 'package.json'), JSON.stringify({ name: '@your-org/apps' }));
    writeFileSync(join(pkgRoot, 'billing', 'mdk-app.yaml'), 'id: com.example.billing\n');
    expect(runtime.resolveAppPackageDir(dir, '@your-org/apps/billing')).toBe(realpathSync(join(pkgRoot, 'billing')));
  });

  it('runApp creates the runtime in-process with the app key files and stops it', async () => {
    const fake = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) };
    mockAppRuntime.createAppRuntime.mockReturnValue(fake);
    const dir = makeAppProject();

    const handle = await runtime.runApp(dir, demoApp);
    const state = join(dir, '.mdk', 'apps', 'demo');
    expect(mockAppRuntime.createAppRuntime).toHaveBeenCalledWith({
      name: 'demo',
      appDir: join(dir, 'apps', 'demo'),
      config: { greeting: 'hi' },
      kernelKey: 'cafebabe',
      storeDir: join(state, 'store'),
      allowedKeyFiles: [join(dir, '.mdk', 'gateway.key'), join(dir, '.mdk', 'mcp.key')],
      keyFile: join(state, 'runtime.key'),
      kernelKeyFile: join(runtime.trustedKeysDir(dir), 'app-demo.pub'),
      credentialFile: join(dir, '.mdk', 'credentials', 'apps', 'demo.json'),
    });
    await handle.stop();
    expect(fake.stop).toHaveBeenCalled();
  });

  // Child entry driven by its `config.mode`: `exit` dies and `error` reports a
  // failure before ready; otherwise it logs each launch's cwd, reports ready,
  // crashes once after the first launch and records the SIGTERM that stops it.
  const CHILD = [
    "const fs = require('fs')",
    'const { config, storeDir } = JSON.parse(process.env.MDK_APP_RUNTIME_OPTIONS)',
    "if (config.mode === 'exit') process.exit(3)",
    "else if (config.mode === 'error') process.send({ type: 'error', message: 'ERR_BOOM' })",
    'else {',
    "  const first = !fs.existsSync(storeDir + '/launches')",
    "  fs.appendFileSync(storeDir + '/launches', process.cwd() + '\\n')",
    "  process.on('SIGTERM', () => { fs.writeFileSync(storeDir + '/stopped', ''); process.exit(0) })",
    "  process.send({ type: 'ready' })",
    '  if (first) setTimeout(() => process.exit(1), 50)',
    '}',
    'setInterval(() => {}, 1000)',
  ].join('\n');
  function superviseChild(dir: string, mode?: string) {
    writeFileSync(join(dir, 'child.cjs'), CHILD);
    return runtime.superviseApp(dir, { ...demoApp, config: { mode } }, undefined, join(dir, 'child.cjs'));
  }

  it('superviseApp spawns the child in the project dir, restarts it after a crash and stops it with SIGTERM', async () => {
    const dir = makeAppProject();
    const app = await superviseChild(dir);
    await vi.waitFor(() => expect(vi.mocked(process.stderr.write).mock.calls.join('')).toContain('demo restarted'), {
      timeout: 5000,
    });
    await app.stop();
    const store = join(dir, '.mdk', 'apps', 'demo', 'store');
    const cwds = readFileSync(join(store, 'launches'), 'utf8').trim().split('\n').map((c) => realpathSync(c));
    expect(cwds).toEqual([realpathSync(dir), realpathSync(dir)]);
    expect(existsSync(join(store, 'stopped'))).toBe(true);
  });

  it('superviseApp restarts the child in the project dir even after the CLI has chdir\'d into the Gateway root', async () => {
    const dir = makeAppProject();
    writeFileSync(join(dir, 'child.cjs'), CHILD);
    const cwdBefore = process.cwd();
    process.chdir(dir);
    try {
      const app = await runtime.superviseApp('.', { ...demoApp, config: {} }, undefined, join(dir, 'child.cjs'));
      process.chdir(makeTmpDir());
      await vi.waitFor(() => expect(vi.mocked(process.stderr.write).mock.calls.join('')).toContain('demo restarted'), {
        timeout: 5000,
      });
      await app.stop();
    } finally {
      process.chdir(cwdBefore);
    }
    const launches = readFileSync(join(dir, '.mdk', 'apps', 'demo', 'store', 'launches'), 'utf8');
    expect(launches.trim().split('\n').map((c) => realpathSync(c))).toEqual([realpathSync(dir), realpathSync(dir)]);
  });

  it.each([
    ['reports an error', 'error', 'ERR_BOOM'],
    ['exits', 'exit', 'exited before it was ready (code 3)'],
  ])('superviseApp rejects when the child %s before it is ready', async (_, mode, message) => {
    await expect(superviseChild(makeAppProject(), mode)).rejects.toThrow(message);
  });

  // A second child, driven by `config.mode`, for the supervisor's less common paths.
  // `n` counts launches so a mode can behave differently on each restart.
  const CHILD_MODES = [
    "const fs = require('fs')",
    'const { config, storeDir } = JSON.parse(process.env.MDK_APP_RUNTIME_OPTIONS)',
    "const n = fs.existsSync(storeDir + '/n') ? Number(fs.readFileSync(storeDir + '/n', 'utf8')) + 1 : 1",
    "fs.writeFileSync(storeDir + '/n', String(n))",
    "const mode = config.mode",
    "if (mode === 'silent') {}",
    "else if (mode === 'error-bare') process.send({ type: 'error' })",
    "else if (mode === 'restart-fails' && n === 2) setTimeout(() => process.exit(4), 300)",
    'else {',
    "  if (mode === 'ignore-term') process.on('SIGTERM', () => {})",
    "  process.send({ type: 'ready' })",
    "  if (mode === 'chatty') { process.send({ type: 'ready' }); process.send({ type: 'error', message: 'late' }); process.send({ type: 'other' }) }",
    "  if (mode === 'restart-fails' && n === 1) setTimeout(() => process.exit(1), 50)",
    "  if (mode === 'crash-loop') setTimeout(() => process.exit(1), 20)",
    '}',
    'setInterval(() => {}, 1000)',
  ].join('\n');
  function superviseMode(dir: string, mode: string) {
    writeFileSync(join(dir, 'modes.cjs'), CHILD_MODES);
    return runtime.superviseApp(dir, { ...demoApp, config: { mode } }, undefined, join(dir, 'modes.cjs'));
  }
  const logged = (): string => vi.mocked(process.stderr.write).mock.calls.join('');

  it('superviseApp backs off while an app keeps crashing', async () => {
    const app = await superviseMode(makeAppProject(), 'crash-loop');
    await vi.waitFor(() => expect(logged()).toContain('restarting in 2s'), { timeout: 6000 });
    await app.stop();
    const delays = [...logged().matchAll(/restarting in (\d+)s/g)].map((m) => Number(m[1]));
    expect(delays.slice(0, 2)).toEqual([1, 2]);
  });

  it('superviseApp ignores messages after ready and unknown message types', async () => {
    const app = await superviseMode(makeAppProject(), 'chatty');
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
    expect(logged()).not.toContain('exited unexpectedly');
    await app.stop();
  });

  it('superviseApp reports an unnamed child error as "unknown error"', async () => {
    await expect(superviseMode(makeAppProject(), 'error-bare')).rejects.toThrow('unknown error');
  });

  it('superviseApp gives up waiting for a child that never reports ready', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const pending = superviseMode(makeAppProject(), 'silent');
      const outcome = expect(pending).rejects.toThrow(/did not report ready within 30000ms/);
      await vi.advanceTimersByTimeAsync(30_000);
      await outcome;
    } finally {
      vi.useRealTimers();
    }
  });

  it('superviseApp keeps retrying a restart that fails, until the app comes back', async () => {
    const app = await superviseMode(makeAppProject(), 'restart-fails');
    await vi.waitFor(() => expect(logged()).toContain('failed to restart'), { timeout: 5000 });
    await vi.waitFor(() => expect(logged()).toContain('restarted'), { timeout: 5000 });
    await app.stop();
  });

  it('superviseApp stays quiet about a restart that fails because it was stopped', async () => {
    const dir = makeAppProject();
    const app = await superviseMode(dir, 'restart-fails');
    const launches = join(dir, '.mdk', 'apps', 'demo', 'store', 'n');
    await vi.waitFor(() => expect(readFileSync(launches, 'utf8')).toBe('2'), { timeout: 5000 });
    await app.stop();
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    expect(logged()).not.toContain('failed to restart');
  });

  it('superviseApp stop() is safe to repeat, and kills a child that ignores SIGTERM', async () => {
    const dir = makeAppProject();
    const app = await superviseMode(dir, 'ignore-term');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const stopping = app.stop();
      await vi.advanceTimersByTimeAsync(3000);
      await stopping;
    } finally {
      vi.useRealTimers();
    }
    await expect(app.stop()).resolves.toBeUndefined();
  });

  it('wires the Gateway and every app runtime to the same key files', async () => {
    const dir = makeAppProject();
    const second: AppInstance = { name: 'second', package: './apps/demo', config: {} };
    const spec = baseSpec({ gateway: { port: 21503 }, apps: [demoApp, second] });
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const cwdBefore = process.cwd();
    try {
      await runtime.runGateway(dir, spec, { _cleanup: [], stop: vi.fn() });
    } finally {
      process.chdir(cwdBefore);
    }
    const gateway = mockCore.startGateway.mock.calls.at(-1)?.[0] as {
      apps: Array<{ name: string; keyFile: string }>;
      gatewayKeyFile: string;
    };

    const options = spec.spec.apps.map((app) => runtime.resolveAppOptions(dir, app));
    for (const [i, app] of spec.spec.apps.entries()) {
      // The Gateway looks for the key the runtime publishes ...
      expect(gateway.apps.find((a) => a.name === app.name)?.keyFile).toBe(options[i]!.keyFile);
      // ... and the runtime accepts only the keys the Gateway and the MCP server publish.
      expect(options[i]!.allowedKeyFiles).toEqual([gateway.gatewayKeyFile, runtime.mcpKeyFile(dir)]);
    }
    expect(new Set(options.map((o) => o.keyFile)).size).toBe(options.length);
    expect(new Set(options.map((o) => o.storeDir)).size).toBe(options.length);
  });
});
