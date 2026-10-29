import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse as parseYaml } from 'yaml';

// The shipped worker catalog is empty, so seeding a known device shape is
// exercised against a fixture entry.
vi.mock('../../src/lib/catalog.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/catalog.js')>()),
  findCatalogWorker: (pkg: string) =>
    pkg === '@test/mdk-worker-seeded' ? { value: pkg, label: 'seeded', hint: 'h', mock: true } : undefined,
}));

import {
  MOCK_PORT_BASE,
  STACK_FILE,
  StackSpecError,
  buildStackSpec,
  deviceId,
  deviceSerial,
  isLocalPackagePath,
  loadStackSpec,
  shortName,
} from '../../src/lib/spec.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

describe('isLocalPackagePath', () => {
  it('treats relative and absolute paths as local', () => {
    expect(isLocalPackagePath('./workers/foo')).toBe(true);
    expect(isLocalPackagePath('../workers/foo')).toBe(true);
    expect(isLocalPackagePath('/abs/path')).toBe(true);
  });

  it('treats bare and scoped package names as non-local', () => {
    expect(isLocalPackagePath('@tetherto/mdk-worker-antminer')).toBe(false);
    expect(isLocalPackagePath('lodash')).toBe(false);
  });
});

describe('shortName', () => {
  it('strips the mdk-worker- / mdk-plugin- / mdk- prefixes', () => {
    expect(shortName('@tetherto/mdk-worker-antminer')).toBe('antminer');
    expect(shortName('@tetherto/mdk-plugin-summary')).toBe('summary');
    expect(shortName('@tetherto/mdk-skill')).toBe('skill');
  });

  it('falls back to the base name when nothing matches', () => {
    expect(shortName('lodash')).toBe('lodash');
  });

  it('falls back to the full package name when stripping empties the string', () => {
    expect(shortName('mdk-')).toBe('mdk-');
  });
});

describe('deviceId / deviceSerial', () => {
  it('derives a stack-unique id and its uppercase serial', () => {
    expect(deviceId('demo-miner-a')).toBe('demo-miner-a-0');
    expect(deviceSerial('demo-miner-a')).toBe('DEMO-MINER-A-0');
  });
});

describe('buildStackSpec', () => {
  it('builds a minimal spec with no workers or apps', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: [],
      appPackages: [],
    });
    expect(spec.apiVersion).toBe('mdk/v1');
    expect(spec.kind).toBe('Stack');
    expect(spec.metadata.name).toBe('my-stack');
    expect(spec.spec.workers).toEqual([]);
    expect(spec.spec.apps).toEqual([]);
  });

  it("binds the CLI's account to an ordinary admin role, so a new stack can be administered", () => {
    const spec = buildStackSpec({ stackName: 's', gatewayPort: 1, kernelPort: 2, workerBasePort: 3, workerPackages: [], appPackages: [] });
    expect(spec.spec.rbac).toEqual({
      enforcement: 'deny',
      roles: [
        { name: 'admin', rules: [{ resources: ['*'], verbs: ['*'] }] },
        { name: 'gateway', rules: [{ resources: ['policy'], verbs: ['read'] }] },
      ],
      bindings: [
        { role: 'admin', subjects: [{ kind: 'ServiceAccount', name: 'mdk-cli' }] },
        {
          role: 'gateway',
          subjects: [
            { kind: 'ServiceAccount', name: 'mdk-gateway' },
            { kind: 'ServiceAccount', name: 'mdk-mcp' },
          ],
        },
      ],
    });
  });

  it('seeds a bundled worker (known device shape) with a mock device', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: ['@test/mdk-worker-seeded'],
      appPackages: [],
    });
    const worker = spec.spec.workers[0];
    expect(worker.name).toBe('seeded-a');
    expect(worker.package).toBe('@test/mdk-worker-seeded');
    expect(worker.port).toBe(3850);
    const config = worker.config as { mock: boolean; devices: Array<{ id: string; opts: Record<string, unknown> }> };
    expect(config.mock).toBe(true);
    expect(config.devices[0].id).toBe(deviceId('seeded-a'));
    expect(config.devices[0].opts.port).toBe(MOCK_PORT_BASE);
  });

  it('gives an unknown worker package an editable starter config', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: ['@org/mdk-worker-modbus'],
      appPackages: [],
    });
    expect(spec.spec.workers[0].config).toEqual({ pollIntervalMs: 2000 });
  });

  it('increments worker ports and mock ports for multiple selections', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: ['@tetherto/mdk-worker-antminer', '@tetherto/mdk-worker-antminer'],
      appPackages: [],
    });
    expect(spec.spec.workers[0].port).toBe(3850);
    expect(spec.spec.workers[1].port).toBe(3852);
  });

  it('threads gateway-level settings into spec.gateway.config', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: [],
      appPackages: [],
      gatewayConfig: { staticRootPath: './ui' },
    });
    expect(spec.spec.gateway.config).toEqual({ staticRootPath: './ui' });
  });

  it('threads per-plugin setup answers into that plugin\'s config entry', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: [],
      appPackages: ['@tetherto/mdk-plugin-auth', '@tetherto/mdk-app-agent'],
      pluginConfigs: {
        '@tetherto/mdk-plugin-auth': {
          auth: { superAdmin: 'root@example.com' },
          google: { clientId: 'id', clientSecret: 'secret' },
        },
      },
    });
    expect(spec.spec.apps[0]).toEqual({
      name: 'auth',
      package: '@tetherto/mdk-plugin-auth',
      config: {
        auth: { superAdmin: 'root@example.com' },
        google: { clientId: 'id', clientSecret: 'secret' },
      },
    });
    expect(spec.spec.apps[1].config).toEqual({});
    expect(spec.spec.apps[1].mount, 'the agent is served at the root, where the UI calls /agent/...').toBe('/');
    expect('mount' in spec.spec.apps[0], 'an app without a catalog mount keeps the /apps/<name> default').toBe(false);
    expect(spec.spec.gateway.config).toEqual({});
  });

  it('adds app config for known plugin kinds', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: [],
      appPackages: ['@tetherto/mdk-plugin-summary', '@tetherto/mdk-plugin-alerts', '@org/mdk-plugin-other'],
    });
    expect(spec.spec.apps[0].config).toEqual({ refreshIntervalMs: 5000 });
    expect(spec.spec.apps[1].config).toEqual({ evaluateIntervalMs: 10000 });
    expect(spec.spec.apps[2].config).toEqual({});
  });
});

function writeSpec(dir: string, content: string): void {
  writeFileSync(join(dir, STACK_FILE), content, 'utf8');
}

describe('loadStackSpec — spec.rbac', () => {
  const BASE = ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847'];

  it('carries a valid policy through, as written, and omits an absent one', () => {
    const dir = makeTmpDir();
    writeSpec(dir, [...BASE, '  rbac:', '    roles:', '      - name: viewer', '        rules: [{ resources: ["*"], verbs: [get, list] }]', ''].join('\n'));
    expect(loadStackSpec(dir).spec.rbac).toEqual({ roles: [{ name: 'viewer', rules: [{ resources: ['*'], verbs: ['get', 'list'] }] }] });

    const bare = makeTmpDir();
    writeSpec(bare, [...BASE, ''].join('\n'));
    expect(loadStackSpec(bare).spec).not.toHaveProperty('rbac');
  });

  it('lists every problem in an invalid policy', () => {
    const dir = makeTmpDir();
    writeSpec(dir, [...BASE, '  rbac:', '    enforcement: allow', '    bindings: [{ role: ghost, subjects: [{ kind: User, name: a }] }]', ''].join('\n'));
    expect(() => loadStackSpec(dir)).toThrow(StackSpecError);
    expect(() => loadStackSpec(dir)).toThrow(/`spec\.rbac` is invalid:\n {2}- spec\.rbac\.enforcement: must be "deny".*\n {2}- spec\.rbac\.bindings\[0\]\.role: no role named "ghost"/);
  });

  it('checks the fields install writes on an app', () => {
    const app = (extra: string[]) => {
      const dir = makeTmpDir();
      writeSpec(dir, [...BASE, '  apps:', '    - name: tuner', '      package: "@org/tuner"', ...extra, ''].join('\n'));
      return dir;
    };
    expect(loadStackSpec(app(['      serviceAccount: app:tuner', '      permissionsDigest: 0123456789abcdef'])).spec.apps[0]).toEqual({
      name: 'tuner',
      package: '@org/tuner',
      config: {},
      serviceAccount: 'app:tuner',
      permissionsDigest: '0123456789abcdef',
    });
    expect(() => loadStackSpec(app(['      serviceAccount: app:other']))).toThrow(/serviceAccount` must be "app:tuner"/);
    expect(() => loadStackSpec(app(['      permissionsDigest: hand-edited']))).toThrow(/permissionsDigest` is written by `mdk add app`/);
  });
});

describe('loadStackSpec — spec.network.dht', () => {
  const BASE = ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847'];
  const load = (lines: string[]) => {
    const dir = makeTmpDir();
    writeSpec(dir, [...BASE, ...lines].join('\n'));
    return loadStackSpec(dir);
  };

  it('is absent unless set, and leaves host unset unless given', () => {
    expect(load([]).spec).not.toHaveProperty('network');
    expect(load(['  network:', '    dht: {}']).spec.network).toEqual({ dht: { port: 49737 } });
    expect(load(['  network:', '    dht:', '      host: 10.0.0.7', '      bootstrap: [10.0.0.5:49737]']).spec.network).toEqual({
      dht: { host: '10.0.0.7', port: 49737, bootstrap: ['10.0.0.5:49737'] },
    });
    expect(load(['  network:', '    dht:', '      bootstrap: [10.0.0.5:49737]']).spec.network).toEqual({
      dht: { port: 49737, bootstrap: ['10.0.0.5:49737'] },
    });
  });

  it('refuses public bootstrap nodes, hostnames as bind hosts and bad ports', () => {
    expect(() => load(['  network:', '    dht:', '      bootstrap: [node1.hyperdht.org:49737]'])).toThrow(/public HyperDHT bootstrap node/);
    expect(() => load(['  network:', '    dht:', '      bootstrap: [88.99.3.86:49737]'])).toThrow(/public HyperDHT bootstrap node/);
    expect(() => load(['  network:', '    dht:', '      host: localhost'])).toThrow(/dht\.host` must be an IP address/);
    expect(() => load(['  network:', '    dht:', '      port: 70000'])).toThrow(/dht\.port` must be a UDP port/);
    expect(() => load(['  network:', '    dht:', '      bootstrap: [nope]'])).toThrow(/host:port entries/);
    expect(() => load(['  network:', '    dht:', '      bootstrap: [10.0.0.5:99999]'])).toThrow(/host:port entries/);
    // mdk-core strips a suggested-ip prefix before checking for public nodes.
    expect(() => load(['  network:', '    dht:', '      bootstrap: [10.0.0.1@88.99.3.86:49737]'])).toThrow(/public HyperDHT bootstrap node/);
  });

  it('refuses a loopback host toward a non-loopback bootstrap', () => {
    expect(() => load(['  network:', '    dht:', '      host: 127.0.0.1', '      bootstrap: [10.0.0.5:49737]'])).toThrow(
      /dht\.host`: a DHT node bound to 127\.0\.0\.1 cannot reach the bootstrap node 10\.0\.0\.5:49737/,
    );
  });
});

describe('loadStackSpec', () => {
  it('throws when mdk.yaml is missing', () => {
    const dir = makeTmpDir();
    expect(() => loadStackSpec(dir)).toThrow(StackSpecError);
    expect(() => loadStackSpec(dir)).toThrow(/No mdk\.yaml found/);
  });

  it('resolves ${VAR} in a worker env from the process environment, and ignores non-string values', () => {
    process.env.MDK_TEST_TOKEN = 's3cret';
    delete process.env.MDK_TEST_UNSET;
    try {
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
          '      env:',
          '        TOKEN: ${MDK_TEST_TOKEN}',
          '        MISSING: ${MDK_TEST_UNSET}',
          '        PLAIN: literal',
          '        COUNT: 5',
        ].join('\n'),
      );
      // The secret stays out of mdk.yaml; an unset variable is left as written so the
      // problem is visible in the worker, not silently blank.
      expect(loadStackSpec(dir).spec.workers[0]?.env).toEqual({
        TOKEN: 's3cret',
        MISSING: '${MDK_TEST_UNSET}',
        PLAIN: 'literal',
      });
    } finally {
      delete process.env.MDK_TEST_TOKEN;
    }
  });

  it('throws on invalid YAML', () => {
    const dir = makeTmpDir();
    writeSpec(dir, '{ not: valid: yaml');
    expect(() => loadStackSpec(dir)).toThrow(/not valid YAML/);
  });

  it('throws when the document is empty', () => {
    const dir = makeTmpDir();
    writeSpec(dir, '');
    expect(() => loadStackSpec(dir)).toThrow(/empty or not a mapping/);
  });

  it('throws when the document is not a mapping (e.g. a plain scalar)', () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'just a string');
    expect(() => loadStackSpec(dir)).toThrow(/empty or not a mapping/);
  });

  it('throws when kind is not Stack', () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: NotAStack\napiVersion: mdk/v1\n');
    expect(() => loadStackSpec(dir)).toThrow(/expected `kind: Stack`/);
  });

  it('throws when apiVersion is missing', () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\n');
    expect(() => loadStackSpec(dir)).toThrow(/missing `apiVersion`/);
  });

  it('throws when spec is missing', () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\n');
    expect(() => loadStackSpec(dir)).toThrow(/missing `spec` mapping/);
  });

  it('throws when spec.gateway is missing', () => {
    const dir = makeTmpDir();
    writeSpec(dir, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  workers: []\n');
    expect(() => loadStackSpec(dir)).toThrow(/missing `spec\.gateway` mapping/);
  });

  it('throws when spec.gateway.port is not a number', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: "abc"\n',
    );
    expect(() => loadStackSpec(dir)).toThrow(/spec\.gateway\.port.*must be a number/);
  });

  it('parses spec.gateway.config and defaults it to an empty mapping', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '    config:',
        '      authSecret: s3cret',
        '      agent:',
        '        approvalTimeoutMs: 5000',
      ].join('\n'),
    );
    const spec = loadStackSpec(dir);
    expect(spec.spec.gateway.config).toEqual({
      authSecret: 's3cret',
      agent: { approvalTimeoutMs: 5000 },
    });

    const dir2 = makeTmpDir();
    writeSpec(dir2, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    expect(loadStackSpec(dir2).spec.gateway.config).toEqual({});
  });

  it('throws when spec.gateway.config is not a mapping', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '    config: [1, 2]',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(/spec\.gateway\.config.*must be a mapping/);
  });

  it('parses spec.mcp.port and defaults mcp to an empty mapping when absent', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', '  mcp:', '    port: 3947'].join(
        '\n',
      ),
    );
    expect(loadStackSpec(dir).spec.mcp).toEqual({ port: 3947 });

    const dir2 = makeTmpDir();
    writeSpec(dir2, 'kind: Stack\napiVersion: mdk/v1\nspec:\n  gateway:\n    port: 3847\n');
    expect(loadStackSpec(dir2).spec.mcp).toEqual({});
  });

  it('throws when spec.mcp.port is not a number', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  mcp:',
        '    port: "abc"',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(StackSpecError);
    expect(() => loadStackSpec(dir)).toThrow(/spec\.mcp\.port.*must be a number/);
  });

  it('throws when spec.mcp is not a mapping', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', '  mcp: [1, 2]'].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(StackSpecError);
    expect(() => loadStackSpec(dir)).toThrow(/spec\.mcp.*must be a mapping/);
  });

  it.each([
    [['    plugins: []'], /spec\.gateway\.plugins. is not supported\. Apps are declared under .spec\.apps/],
    [['  apps: {}'], /spec\.apps. must be a list/],
    [['  apps:', '    - name: Bad_Name', '      package: ./a'], /apps\[0\]\.name/],
    [['  apps:', '    - name: a', '      package: ./a', '    - name: a', '      package: ./b'], /duplicate app name "a"/],
    [['  apps:', '    - name: a'], /apps\[0\]\.package/],
    [['  apps:', '    - name: a', '      package: ./a', '      config: [1]'], /apps\[0\]\.config. must be a mapping/],
    [['  apps:', '    - name: a', '      package: ./a', '      mount: 1'], /apps\[0\]\.mount. must be a path/],
    [['  apps:', '    - name: a', '      package: ./a', '      mount: agent'], /apps\[0\]\.mount. must be a path/],
    [['  apps:', '    - name: a', '      package: ./a', '      mount: /x/:id'], /apps\[0\]\.mount. must be a path/],
    [['  apps:', '    - name: a', '      package: ./a', '      mount: /x/../y'], /apps\[0\]\.mount. must be a path/],
  ])('rejects spec.gateway.plugins and invalid spec.apps: %j', (lines, error) => {
    const dir = makeTmpDir();
    writeSpec(dir, ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', ...lines].join('\n'));
    expect(() => loadStackSpec(dir)).toThrow(error);
  });

  it('answers a spec.gateway.plugins list with the spec.apps entries to paste', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '    plugins:',
        '      - package: "@tetherto/mdk-plugin-demo"',
        '      - package: "@your-org/mdk-app-ops"',
        '        config: { region: eu }',
      ].join('\n'),
    );
    let message = '';
    try {
      loadStackSpec(dir);
    } catch (error) {
      message = (error as Error).message;
    }
    const snippet = message.split('\n\n')[1]!.split('\n').map((line) => line.slice(4)).join('\n');
    expect(parseYaml(snippet)).toEqual({
      apps: [
        { name: 'demo', package: '@tetherto/mdk-plugin-demo' },
        { name: 'ops', package: '@your-org/mdk-app-ops', config: { region: 'eu' } },
      ],
    });
    expect(message).toContain('mdk validate app');
  });

  it('throws when a worker has no name or no package', () => {
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
        '    - package: ./workers/a',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(/workers\[0\]\.name.*non-empty string/);

    const dir2 = makeTmpDir();
    writeSpec(
      dir2,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  workers:',
        '    - name: a',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir2)).toThrow(/workers\[0\]\.package.*non-empty string/);
  });

  it('throws on duplicate worker names', () => {
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
        '    - name: a',
        '      package: ./workers/b',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(/duplicate worker name "a"/);
  });

  it('throws on duplicate device ids across workers', () => {
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
        '      config:',
        '        devices:',
        '          - id: dev-0',
        '    - name: b',
        '      package: ./workers/b',
        '      config:',
        '        devices:',
        '          - id: dev-0',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(/duplicate device id "dev-0"/);
  });

  it('loads a full, valid spec with defaults filled in', () => {
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
        '    - name: summary',
        '      package: "@tetherto/mdk-plugin-summary"',
        '      mount: /',
        '  workers:',
        '    - name: a',
        '      package: ./workers/a',
        '      config:',
        '        devices:',
        '          - id: dev-0',
        '            opts: { port: 1 }',
      ].join('\n'),
    );
    const spec = loadStackSpec(dir);
    expect(spec.metadata.name).toBe('mdk-stack');
    expect(spec.spec.kernel.port).toBe(0);
    expect(spec.spec.apps).toEqual([
      { name: 'summary', package: '@tetherto/mdk-plugin-summary', config: {}, mount: '/' },
    ]);
    expect(spec.spec.workers[0].port).toBe(0);
  });

  it('reads metadata.name and kernel.port when present', () => {
    const dir = makeTmpDir();
    writeSpec(
      dir,
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'metadata:',
        '  name: named-stack',
        'spec:',
        '  kernel:',
        '    port: 3848',
        '  gateway:',
        '    port: 3847',
      ].join('\n'),
    );
    const spec = loadStackSpec(dir);
    expect(spec.metadata.name).toBe('named-stack');
    expect(spec.spec.kernel.port).toBe(3848);
  });
});

describe('loadStackSpec security', () => {
  const base = 'apiVersion: mdk/v1\nkind: Stack\nspec:\n  gateway:\n    port: 3847\n';

  it('rejects a worker name that is not a single safe path segment', () => {
    for (const bad of ['../../etc', 'a/b', '.hidden', 'Upper']) {
      const dir = makeTmpDir();
      writeSpec(dir, `${base}  workers:\n    - name: ${JSON.stringify(bad)}\n      package: ./w\n`);
      expect(() => loadStackSpec(dir)).toThrow(/spec\.workers\[0\]\.name.*is invalid/);
    }
  });

  it('resolves ${VAR} in gateway and app config from the environment, then the project .env', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, '.env'), "MDK_AUTH_SECRET='from-file'\nMDK_SHADOWED=file\n", 'utf8');
    vi.stubEnv('MDK_SHADOWED', 'process');
    writeSpec(
      dir,
      'apiVersion: mdk/v1\nkind: Stack\nspec:\n  gateway:\n    port: 3847\n' +
        '    config: { common: "${MDK_SHADOWED}" }\n' +
        '  apps:\n    - name: p\n      package: p\n      config: { google: { secret: "${MDK_AUTH_SECRET}", list: ["${MDK_UNSET_X}"] } }\n',
    );
    const spec = loadStackSpec(dir);
    expect(spec.spec.gateway.config).toEqual({ common: 'process' });
    expect(spec.spec.apps[0].config).toEqual({
      google: { secret: 'from-file', list: ['${MDK_UNSET_X}'] },
    });
    vi.unstubAllEnvs();
  });

  it('refuses spec.gateway.config.authVerifier: spec.rbac governs every route', () => {
    const dir = makeTmpDir();
    writeSpec(dir, ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', '    config: { authVerifier: loopback }', ''].join('\n'));
    expect(() => loadStackSpec(dir)).toThrow(/authVerifier` is no longer supported/);
  });

  it('reads spec.mcp tool options and validates their types; a static token or identity is refused', () => {
    const dir = makeTmpDir();
    writeSpec(dir, `${base}  mcp:\n    allowWrite: true\n    allowTools: [a.b]\n`);
    expect(loadStackSpec(dir).spec.mcp).toEqual({ allowWrite: true, allowTools: ['a.b'] });

    writeSpec(dir, `${base}  mcp:\n    token: abc\n`);
    expect(() => loadStackSpec(dir)).toThrow(/spec\.mcp\.token` is no longer supported.*mdk sa add/);
    writeSpec(dir, `${base}  mcp:\n    identity: { user: agent }\n`);
    expect(() => loadStackSpec(dir)).toThrow(/spec\.mcp\.identity` is no longer supported/);

    writeSpec(dir, `${base}  mcp:\n    allowWrite: "yes"\n`);
    expect(() => loadStackSpec(dir)).toThrow(/spec\.mcp\.allowWrite/);
    writeSpec(dir, `${base}  mcp:\n    allowTools: [1]\n`);
    expect(() => loadStackSpec(dir)).toThrow(/spec\.mcp\.allowTools/);
  });
});
