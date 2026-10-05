import { createServer } from 'node:net';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StackSpec, WorkerInstance } from '../../src/lib/spec.js';
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
// discovery helper lazily via `createRequire(import.meta.url)` — a *native*
// Node require, bypassing the ESM module graph vi.mock normally patches. This
// intercepts `node:module`'s `createRequire` itself so those three specifiers
// resolve to controllable fakes, while everything else (local worker plugin
// dirs, real npm packages) still goes through the real resolver.
const mockCore = vi.hoisted(() => ({
  getKernel: vi.fn(),
  startGateway: vi.fn(),
}));
const mockWorkerRuntimeV2Ctor = vi.hoisted(() => vi.fn());
const mockWorkerModule = vi.hoisted(() => ({
  WorkerRuntimeV2: mockWorkerRuntimeV2Ctor,
}));
const mockLocalDiscovery = vi.hoisted(() => ({ publishWorkerKey: vi.fn() }));
const mockMcp = vi.hoisted(() => ({ createMcpServer: vi.fn() }));

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
      /is not installed/,
    );
  });

  // How a stack declares one of the plugins MDK ships now that no Gateway
  // registers them unasked: they are subdirectories of one `@tetherto/mdk-plugins`
  // package, with no package.json of their own, so the package resolves and the
  // subpath is appended to it.
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
      runtime.resolveProjectPackageDir(makeTmpDir(), '@tetherto/mdk-plugins/telemetry'),
    ).toThrow(/npm install @tetherto\/mdk-plugins$/m);
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
      }),
    );
    expect(write.mock.calls.some((c) => String(c[0]).includes('ready ab'))).toBe(true);
  });

  it('logs "(unknown)" when the kernel has no getPublicKey', async () => {
    mockCore.getKernel.mockResolvedValue({ _cleanup: [], stop: vi.fn() });
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runtime.runKernel(makeTmpDir());
    expect(write.mock.calls.some((c) => String(c[0]).includes('(unknown)'))).toBe(true);
  });
});

function baseSpec(overrides: Partial<StackSpec['spec']> = {}): StackSpec {
  return {
    apiVersion: 'mdk/v1',
    kind: 'Stack',
    metadata: { name: 'test-stack' },
    spec: {
      kernel: { port: 0 },
      gateway: { port: 21500, plugins: [] },
      mcp: {},
      workers: [],
      ...overrides,
    },
  };
}

describe('runGateway', () => {
  it('boots in-process when a kernel handle is given, and reports "kernel connected"', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ mdkClient: {}, stop: vi.fn() });
    const dir = makeTmpDir();
    const cwdBefore = process.cwd();
    try {
      const gateway = await runtime.runGateway(dir, baseSpec(), {
        _cleanup: [],
        stop: vi.fn(),
      });
      expect(gateway.mdkClient).toBeDefined();
      expect(mockCore.startGateway).toHaveBeenCalledWith(
        expect.objectContaining({ port: 21500, kernel: expect.anything() }),
      );
    } finally {
      process.chdir(cwdBefore);
    }
  });

  it('throws when no kernel is given and no key file exists (out-of-process)', async () => {
    const dir = makeTmpDir();
    await expect(runtime.runGateway(dir, baseSpec())).rejects.toThrow(/Kernel is not running/);
  });

  it('boots out-of-process using the key file, reporting "kernel pending"', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    mkdirSync(runtime.mdkDir(dir), { recursive: true });
    writeFileSync(runtime.kernelKeyFile(dir), 'deadbeef', 'utf8');
    const cwdBefore = process.cwd();
    try {
      const gateway = await runtime.runGateway(dir, baseSpec({ gateway: { port: 21501, plugins: [] } }));
      expect(gateway.mdkClient).toBeUndefined();
      expect(mockCore.startGateway).toHaveBeenCalledWith(
        expect.objectContaining({ keyFile: runtime.kernelKeyFile(dir) }),
      );
    } finally {
      process.chdir(cwdBefore);
    }
  });

  it('resolves extraPluginDirs for declared gateway plugins, carrying per-plugin config', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockCore.startGateway.mockResolvedValue({ stop: vi.fn() });
    const dir = makeTmpDir();
    linkRealPackage(dir, 'yaml');
    const cwdBefore = process.cwd();
    try {
      await runtime.runGateway(
        dir,
        baseSpec({
          gateway: {
            port: 21502,
            plugins: [
              { package: 'yaml', config: { auth: { superAdmin: 'root@example.com' } } },
              { package: 'yaml', config: {} },
            ],
          },
        }),
        { _cleanup: [], stop: vi.fn() },
      );
      const call = mockCore.startGateway.mock.calls.at(-1)?.[0] as {
        extraPluginDirs?: Array<{ dir: string; config?: Record<string, unknown> }>;
      };
      expect(call.extraPluginDirs?.[0]?.dir).toMatch(/yaml$/);
      expect(call.extraPluginDirs?.[0]?.config).toEqual({ auth: { superAdmin: 'root@example.com' } });
      expect(call.extraPluginDirs?.[1]).toEqual({ dir: call.extraPluginDirs?.[0]?.dir });
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
        runtime.runGateway(makeTmpDir(), baseSpec({ gateway: { port, plugins: [] } }), {
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
      { kernelKey: 'deadbeef' },
      [],
      [],
    );
  });

  it('uses an in-process kernel\'s public key when a kernel handle is passed', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(dir, baseSpec(), kernel);

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21600,
      { kernelKey: 'ab' },
      [],
      [],
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
        gateway: { port: 21501, plugins: [], config: { auth: { superAdmin: 'root@example.com' } } },
      }),
    );

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21501 + runtime.DEFAULT_MCP_PORT_OFFSET,
      { auth: { superAdmin: 'root@example.com' }, kernelKey: 'deadbeef' },
      [],
      [],
    );
  });

  it('builds gatewayPluginDirs from spec.spec.gateway.plugins, carrying per-plugin config', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    linkRealPackage(dir, 'yaml');
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(
      dir,
      baseSpec({
        gateway: {
          port: 21500,
          plugins: [{ package: 'yaml', config: { auth: { superAdmin: 'root@example.com' } } }],
        },
      }),
      kernel,
    );

    const call = mockMcp.createMcpServer.mock.calls.at(-1) as [
      string,
      number,
      Record<string, unknown>,
      string[],
      Array<{ dir: string; config?: Record<string, unknown> }>,
    ];
    expect(call[4][0].dir).toMatch(/yaml$/);
    expect(call[4][0].config).toEqual({ auth: { superAdmin: 'root@example.com' } });
  });

  it('defaults the port to gateway.port + DEFAULT_MCP_PORT_OFFSET when spec.mcp.port is unset', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(dir, baseSpec({ gateway: { port: 21503, plugins: [] } }), kernel);

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21503 + runtime.DEFAULT_MCP_PORT_OFFSET,
      expect.anything(),
      [],
      [],
    );
  });

  it('uses spec.mcp.port when set', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const closeFn = vi.fn((cb?: () => void) => cb?.());
    mockMcp.createMcpServer.mockResolvedValue({ close: closeFn });
    const dir = makeTmpDir();
    const kernel = { getPublicKey: () => Buffer.from('ab', 'hex'), _cleanup: [], stop: vi.fn() };

    await runtime.runMcp(dir, baseSpec({ gateway: { port: 21504, plugins: [] }, mcp: { port: 21999 } }), kernel);

    expect(mockMcp.createMcpServer).toHaveBeenCalledWith(
      expect.any(String),
      21999,
      expect.anything(),
      [],
      [],
    );
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
    const kernel = { registerWorker: vi.fn().mockResolvedValue(undefined), _cleanup: [] as Array<() => unknown> };

    const handle = await runtime.runWorker(dir, worker, kernel as never);
    expect(kernel.registerWorker).toHaveBeenCalledWith(Buffer.from('abcd', 'hex'));
    expect(kernel._cleanup).toHaveLength(1);
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
    await handle.stop();
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
