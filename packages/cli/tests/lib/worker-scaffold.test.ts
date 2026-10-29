import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');

const installScaffoldMock = vi.hoisted(() =>
  vi.fn(() => ({ ok: true, dir: '/does/not/matter' })),
);
vi.mock('../../src/lib/npm.js', () => ({ installScaffold: installScaffoldMock }));

const { createWorker } = await import('../../src/lib/worker-scaffold.js');

afterEach(() => {
  cleanupTmpDirs();
  installScaffoldMock.mockClear();
});

describe('createWorker', () => {
  it('reports a write failure instead of throwing', () => {
    const dir = makeTmpDir();
    const blocker = join(dir, 'not-a-dir');
    writeFileSync(blocker, '');
    const result = createWorker({ name: 'demo', parentDir: blocker });
    expect(result).toMatchObject({ ok: false, message: 'Could not scaffold the worker.' });
    expect(result.detail).toBeTruthy();
  });

  it('rejects an invalid worker name', () => {
    const result = createWorker({ name: 'Not Valid!', parentDir: makeTmpDir() });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Invalid worker name/);
    expect(installScaffoldMock).not.toHaveBeenCalled();
  });

  it('scaffolds the bundled template, substituting the name and setting package.json', () => {
    const dir = makeTmpDir();
    const result = createWorker({ name: 'demo-miner', parentDir: dir, install: true });
    expect(result.ok).toBe(true);
    expect(result.workerPath).toBe(join(dir, 'workers', 'demo-miner'));
    expect(existsSync(result.workerPath!)).toBe(true);

    const pkg = JSON.parse(readFileSync(join(result.workerPath!, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo-miner');
    // These tests run from the checkout, so the MDK backend dependency links to it.
    expect(pkg.dependencies['@tetherto/mdk-worker']).toBe(`file:${join(REPO_ROOT, 'backend', 'core', 'mdk-worker')}`);
    expect(installScaffoldMock).toHaveBeenCalledWith(dir, result.workerPath, true);
  });

  it('rejects an --org that is not a valid npm scope', () => {
    const result = createWorker({ name: 'demo', parentDir: makeTmpDir(), org: 'evil\nid: x' });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Invalid --org/);
  });

  it('scaffolds a client that never logs credential values', () => {
    const result = createWorker({ name: 'safe-log', parentDir: makeTmpDir() });
    const client = readFileSync(join(result.workerPath!, 'src', 'client.js'), 'utf8');
    const logCall = client.slice(client.indexOf('logger('), client.indexOf(')\n', client.indexOf('logger(')));
    expect(logCall).toContain('Object.keys(env');
    expect(logCall).not.toMatch(/,\s*env\s*[,)]/);
    expect(logCall).not.toMatch(/,\s*opts\s*[,)]/);
  });

  it('scopes the package name under --org', () => {
    const dir = makeTmpDir();
    const result = createWorker({ name: 'demo-miner', parentDir: dir, org: '@demo' });
    expect(result.packageName).toBe('@demo/demo-miner');
  });

  it('refuses to overwrite an existing target without --force', () => {
    const dir = makeTmpDir();
    createWorker({ name: 'demo-miner', parentDir: dir });
    const result = createWorker({ name: 'demo-miner', parentDir: dir });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/already exists/);
  });

  it('overwrites an existing target with --force', () => {
    const dir = makeTmpDir();
    createWorker({ name: 'demo-miner', parentDir: dir });
    const result = createWorker({ name: 'demo-miner', parentDir: dir, force: true });
    expect(result.ok).toBe(true);
  });

  it('reports the install warning without failing the scaffold', () => {
    installScaffoldMock.mockReturnValueOnce({ ok: false, message: 'npm exploded', dir: '/x' });
    const dir = makeTmpDir();
    const result = createWorker({ name: 'demo-miner', parentDir: dir });
    expect(result.ok).toBe(true);
    expect(result.installWarning).toBe('npm exploded');
  });

  it('links the project manifest with a file: dep when the parent dir already has an mdk.yaml', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'metadata:\n  name: my-stack\n', 'utf8');
    createWorker({ name: 'demo-miner', parentDir: dir });
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.workspaces).toBeUndefined();
    expect(pkg.dependencies['demo-miner']).toBe('file:./workers/demo-miner');
  });

  it('still scaffolds when the existing package.json is unparseable, surfacing a link warning', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'metadata:\n  name: my-stack\n', 'utf8');
    writeFileSync(join(dir, 'package.json'), '{ not json', 'utf8');
    const result = createWorker({ name: 'demo-miner', parentDir: dir });
    expect(result.ok).toBe(true);
    expect(existsSync(result.workerPath!)).toBe(true);
    expect(result.installWarning).toMatch(/Could not link demo-miner/);
  });

  it('adds the worker to spec.workers in mdk.yaml when present', () => {
    const dir = makeTmpDir();
    writeFileSync(
      dir + '/mdk.yaml',
      ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  workers: []', ''].join('\n'),
      'utf8',
    );
    const result = createWorker({ name: 'demo-miner', parentDir: dir });
    expect(result.stackFile).toBe('added');
    const content = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    expect(content).toContain('demo-miner');
    expect(content).toContain('mock: true');
  });

  it('reports "exists" when the worker is already declared, and picks the next free mock port', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'mdk.yaml'),
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  workers:',
        '    - name: demo-miner',
        '      package: ./workers/demo-miner',
        '      config:',
        '        devices:',
        '          - id: demo-miner-0',
        '            opts: { port: 18080 }',
      ].join('\n'),
      'utf8',
    );
    const other = createWorker({ name: 'other-miner', parentDir: dir });
    expect(other.mockPort).toBe(18081);

    const dup = createWorker({ name: 'demo-miner', parentDir: dir, force: true });
    expect(dup.stackFile).toBe('exists');

    const yaml = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    writeFileSync(join(dir, 'mdk.yaml'), yaml.replace('package: ./workers/demo-miner', 'package: @your-org/other-rig'), 'utf8');
    expect(createWorker({ name: 'demo-miner', parentDir: dir, force: true }).stackFile).toBe('name-taken');
  });

  it('reports "no-file" when there is no mdk.yaml, and "no-stack-entry"-style skip via updateStackFile:false', () => {
    const dir = makeTmpDir();
    const result = createWorker({ name: 'demo-miner', parentDir: dir });
    expect(result.stackFile).toBe('no-file');

    const dir2 = makeTmpDir();
    const skipped = createWorker({ name: 'demo-miner', parentDir: dir2, updateStackFile: false });
    expect(skipped.stackFile).toBeUndefined();
  });

  it('reports "error" when mdk.yaml exists but cannot be parsed', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), '{ not: valid: yaml', 'utf8');
    const result = createWorker({ name: 'demo-miner', parentDir: dir });
    expect(result.stackFile).toBe('error');
  });
});
