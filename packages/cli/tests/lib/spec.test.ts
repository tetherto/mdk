import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
  it('builds a minimal spec with no workers or gateway plugins', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: [],
      gatewayPackages: [],
    });
    expect(spec.apiVersion).toBe('mdk/v1');
    expect(spec.kind).toBe('Stack');
    expect(spec.metadata.name).toBe('my-stack');
    expect(spec.spec.workers).toEqual([]);
    expect(spec.spec.gateway.plugins).toEqual([]);
  });

  it('seeds a bundled worker (known device shape) with a mock device', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: ['@tetherto/mdk-worker-demo'],
      gatewayPackages: [],
    });
    const worker = spec.spec.workers[0];
    expect(worker.name).toBe('demo-a');
    expect(worker.package).toBe('@tetherto/mdk-worker-demo');
    expect(worker.port).toBe(3850);
    const config = worker.config as { mock: boolean; devices: Array<{ id: string; opts: Record<string, unknown> }> };
    expect(config.mock).toBe(true);
    expect(config.devices[0].id).toBe(deviceId('demo-a'));
    expect(config.devices[0].opts.port).toBe(MOCK_PORT_BASE);
  });

  it('gives an unknown worker package an editable starter config', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: ['@org/mdk-worker-modbus'],
      gatewayPackages: [],
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
      gatewayPackages: [],
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
      gatewayPackages: [],
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
      gatewayPackages: ['@tetherto/mdk-plugin-auth', '@tetherto/mdk-plugin-agent'],
      pluginConfigs: {
        '@tetherto/mdk-plugin-auth': {
          auth: { superAdmin: 'root@example.com' },
          google: { clientId: 'id', clientSecret: 'secret' },
        },
      },
    });
    expect(spec.spec.gateway.plugins[0]).toEqual({
      package: '@tetherto/mdk-plugin-auth',
      config: {
        auth: { superAdmin: 'root@example.com' },
        google: { clientId: 'id', clientSecret: 'secret' },
      },
    });
    expect(spec.spec.gateway.plugins[1].config).toEqual({});
    expect(spec.spec.gateway.config).toEqual({});
  });

  it('adds gateway plugin config for known plugin kinds', () => {
    const spec = buildStackSpec({
      stackName: 'my-stack',
      gatewayPort: 3847,
      kernelPort: 3848,
      workerBasePort: 3850,
      workerPackages: [],
      gatewayPackages: ['@tetherto/mdk-plugin-summary', '@tetherto/mdk-plugin-alerts', '@org/mdk-plugin-other'],
    });
    expect(spec.spec.gateway.plugins[0].config).toEqual({ refreshIntervalMs: 5000 });
    expect(spec.spec.gateway.plugins[1].config).toEqual({ evaluateIntervalMs: 10000 });
    expect(spec.spec.gateway.plugins[2].config).toEqual({});
  });
});

function writeSpec(dir: string, content: string): void {
  writeFileSync(join(dir, STACK_FILE), content, 'utf8');
}

describe('loadStackSpec', () => {
  it('throws when mdk.yaml is missing', () => {
    const dir = makeTmpDir();
    expect(() => loadStackSpec(dir)).toThrow(StackSpecError);
    expect(() => loadStackSpec(dir)).toThrow(/No mdk\.yaml found/);
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

  it('throws when a gateway plugin has no package', () => {
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
        '      - config: {}',
      ].join('\n'),
    );
    expect(() => loadStackSpec(dir)).toThrow(/plugins\[0\]\.package.*non-empty string/);
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
        '    plugins:',
        '      - package: "@tetherto/mdk-plugin-summary"',
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
    expect(spec.spec.gateway.plugins).toHaveLength(1);
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
