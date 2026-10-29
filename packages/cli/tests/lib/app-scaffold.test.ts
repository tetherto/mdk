import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateApp } from '../../src/lib/app-package.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');

const installScaffoldMock = vi.hoisted(() =>
  vi.fn(() => ({ ok: true, dir: '/does/not/matter' })),
);
// The starter UI's own install is skipped here (it is covered in
// app-scaffold-ui.test.ts), so createApp reports it as not built.
vi.mock('../../src/lib/npm.js', () => ({
  installScaffold: installScaffoldMock,
  installDeps: () => ({ ok: false, message: 'install skipped in tests' }),
  npmBin: () => 'npm',
  npmNeedsShell: () => false,
}));

const { createApp } = await import('../../src/lib/app-scaffold.js');

afterEach(() => {
  cleanupTmpDirs();
  installScaffoldMock.mockClear();
});

describe('createApp', () => {
  it('reports a write failure instead of throwing', () => {
    const dir = makeTmpDir();
    const blocker = join(dir, 'not-a-dir');
    writeFileSync(blocker, '');
    const result = createApp({ name: 'demo', parentDir: blocker });
    expect(result).toMatchObject({ ok: false, message: 'Could not scaffold the app.' });
    expect(result.detail).toBeTruthy();
  });

  it('scaffolds a package that passes `mdk validate app`', () => {
    const result = createApp({ name: 'valid-app', parentDir: makeTmpDir() });
    expect(result.ok).toBe(true);
    const validation = validateApp(result.appPath!);
    expect(validation.errors).toEqual([]);
  });

  it('rejects an invalid app name', () => {
    const result = createApp({ name: 'Bad Name', parentDir: makeTmpDir() });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Invalid app name/);
  });

  it('scaffolds the bundled template and sets both manifests', () => {
    const dir = makeTmpDir();
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.ok).toBe(true);
    expect(existsSync(result.appPath!)).toBe(true);
    const pkg = JSON.parse(readFileSync(join(result.appPath!, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('summary2');
    const manifest = JSON.parse(readFileSync(join(result.appPath!, 'plugin', 'mdk-plugin.json'), 'utf8'));
    expect(manifest.name).toBe('summary2');
    const app = parse(readFileSync(join(result.appPath!, 'mdk-app.yaml'), 'utf8'));
    expect(app).toMatchObject({ id: 'com.example.summary2', version: '0.1.0', displayName: 'summary2' });
  });

  it('scaffolds the ambient mdkClient pattern (lib/client, not services)', () => {
    const dir = makeTmpDir();
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.ok).toBe(true);
    const appPath = result.appPath!;
    const pluginPath = join(appPath, 'plugin');

    const clientPath = join(pluginPath, 'lib', 'client.js');
    expect(existsSync(clientPath)).toBe(true);
    const clientSrc = readFileSync(clientPath, 'utf8');
    expect(clientSrc).toContain("require('@tetherto/mdk-gateway/plugin')");
    expect(clientSrc).toContain('module.exports = config.mdkClient');
    expect(clientSrc).not.toContain('createMdkClient', 'the runtime owns the client; the app never dials with raw keys');
    expect(clientSrc).not.toMatch(/services\.mdkClient|mdkClient\s*=\s*services/);

    const summarySrc = readFileSync(join(pluginPath, 'controllers', 'summary.js'), 'utf8');
    expect(summarySrc).toContain("require('../lib/client')");
    expect(summarySrc).toMatch(/async function summary\s*\(\s*req\s*\)/);
    expect(summarySrc).not.toMatch(/\bservices\b/);
    expect(summarySrc).not.toMatch(/\{\s*mdkClient\s*\}\s*=\s*services/);

    const pkg = JSON.parse(readFileSync(join(appPath, 'package.json'), 'utf8'));
    // These tests run from the checkout, so the MDK backend dependency links to it.
    expect(pkg.dependencies['@tetherto/mdk-client']).toBe(`file:${join(REPO_ROOT, 'backend', 'core', 'client')}`);

    const readme = readFileSync(join(appPath, 'README.md'), 'utf8');
    expect(readme).toContain('@tetherto/mdk-gateway/plugin');
    expect(readme).toContain('plugin/lib/client.js');
    expect(readme).toMatch(/do \*\*not\*\* take `mdkClient`/);
  });

  it('refuses the name reserved for the dashboard', () => {
    const result = createApp({ name: 'dashboard', parentDir: makeTmpDir() });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/reserved for the dashboard/);
  });

  it('rejects an invalid --org, including one that would inject YAML keys', () => {
    for (const org of ['x\npermissions: []', '../x']) {
      const result = createApp({ name: 'demo', parentDir: makeTmpDir(), org });
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/Invalid --org/);
    }
  });

  it('ships its read route open and marked read-only, so `mdk run mcp` exposes it as a tool', () => {
    const result = createApp({ name: 'summary2', parentDir: makeTmpDir() });
    const manifest = JSON.parse(readFileSync(join(result.appPath!, 'plugin', 'mdk-plugin.json'), 'utf8'));
    expect('auth' in manifest.routes[0]).toBe(false);
    expect(manifest.routes[0]).toMatchObject({ http: { method: 'GET' }, safety: 'read-only' });
  });

  it('scopes the package name under --org, in the README snippet too', () => {
    const dir = makeTmpDir();
    const result = createApp({ name: 'summary2', parentDir: dir, org: 'demo' });
    expect(result.packageName).toBe('@demo/summary2');
    const readme = readFileSync(join(result.appPath!, 'README.md'), 'utf8');
    expect(readme).toContain('package: @demo/summary2');
    expect(readme).not.toMatch(/__[A-Z_]+__/);
  });

  it('refuses to overwrite without --force, and allows it with --force', () => {
    const dir = makeTmpDir();
    createApp({ name: 'summary2', parentDir: dir });
    const blocked = createApp({ name: 'summary2', parentDir: dir });
    expect(blocked.ok).toBe(false);

    const forced = createApp({ name: 'summary2', parentDir: dir, force: true });
    expect(forced.ok).toBe(true);
  });

  it('surfaces an install warning without failing the scaffold', () => {
    installScaffoldMock.mockReturnValueOnce({ ok: false, message: 'boom', dir: '/x' });
    const result = createApp({ name: 'summary2', parentDir: makeTmpDir() });
    expect(result.ok).toBe(true);
    expect(result.installWarning).toBe('boom');
  });

  it('links the project manifest with a file: dep when parentDir has an mdk.yaml', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'metadata:\n  name: my-stack\n', 'utf8');
    createApp({ name: 'summary2', parentDir: dir });
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.workspaces).toBeUndefined();
    expect(pkg.dependencies['summary2']).toBe('file:./apps/summary2');
  });

  it('still scaffolds when the existing package.json is unparseable, surfacing a link warning', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'metadata:\n  name: my-stack\n', 'utf8');
    writeFileSync(join(dir, 'package.json'), '{ not json', 'utf8');
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.ok).toBe(true);
    expect(existsSync(result.appPath!)).toBe(true);
    expect(result.installWarning).toMatch(/Could not link summary2/);
  });

  it('adds the app under spec.apps in mdk.yaml', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'mdk.yaml'),
      ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', ''].join('\n'),
      'utf8',
    );
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.stackFile).toBe('added');
    const { spec } = parse(readFileSync(join(dir, 'mdk.yaml'), 'utf8'));
    expect(spec.apps).toEqual([
      { name: 'summary2', package: 'summary2', config: {}, serviceAccount: 'app:summary2', permissionsDigest: expect.stringMatching(/^[0-9a-f]{16}$/) },
    ]);
  });

  it('grants the app what its manifest requests in spec.rbac, as `mdk add app` would', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), ['kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', ''].join('\n'), 'utf8');
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.grant).toEqual({ action: 'add', role: 'app-summary2', serviceAccount: 'app:summary2', written: true });
    const { spec } = parse(readFileSync(join(dir, 'mdk.yaml'), 'utf8'));
    expect(spec.rbac).toEqual({
      enforcement: 'deny',
      roles: [{ name: 'app-summary2', rules: [{ resources: ['workers'], verbs: ['list'] }] }],
      bindings: [{ role: 'app-summary2', subjects: [{ kind: 'ServiceAccount', name: 'app:summary2' }] }],
    });

    // A role the operator changed since is left alone and reported.
    writeFileSync(join(dir, 'mdk.yaml'), readFileSync(join(dir, 'mdk.yaml'), 'utf8').replace('- list', '- delete').replace(/ +permissionsDigest: .*\n/, ''), 'utf8');
    const again = createApp({ name: 'summary2', parentDir: dir, force: true });
    expect(again.stackFile).toBe('exists');
    expect(again.grant).toMatchObject({ action: 'conflict', written: false });
    expect(parse(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).spec.rbac.roles[0].rules[0].verbs).toEqual(['delete']);

    // No mdk.yaml, nothing to grant; a policy nothing should be written into is reported, not thrown.
    expect(createApp({ name: 'summary2', parentDir: makeTmpDir() }).grant).toBeUndefined();
    const broken = makeTmpDir();
    writeFileSync(join(broken, 'mdk.yaml'), ['kind: Stack', 'spec:', '  rbac:', '    enforcement: allow', ''].join('\n'), 'utf8');
    expect(createApp({ name: 'summary2', parentDir: broken }).grant).toEqual({ error: 'spec.rbac in mdk.yaml is invalid; fix it before adding an app.' });
  });

  it('reports "exists" when the app package is already listed', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'mdk.yaml'),
      [
        'kind: Stack',
        'apiVersion: mdk/v1',
        'spec:',
        '  gateway:',
        '    port: 3847',
        '  apps:',
        '    - name: summary2',
        '      package: summary2',
      ].join('\n'),
      'utf8',
    );
    const result = createApp({ name: 'summary2', parentDir: dir, force: true });
    expect(result.stackFile).toBe('exists');

    // Same app name, another package: a conflict, not a silent no-op.
    expect(createApp({ name: 'summary2', parentDir: dir, force: true, org: 'your-org' }).stackFile).toBe('name-taken');
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).not.toContain('@your-org/summary2');
  });

  it('reports "no-file" with no mdk.yaml, and skips entirely via updateStackFile:false', () => {
    const dir = makeTmpDir();
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.stackFile).toBe('no-file');

    const dir2 = makeTmpDir();
    const skipped = createApp({ name: 'summary2', parentDir: dir2, updateStackFile: false });
    expect(skipped.stackFile).toBeUndefined();
  });

  it('reports "error" when mdk.yaml cannot be stringified back', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), '{ not: valid: yaml', 'utf8');
    const result = createApp({ name: 'summary2', parentDir: dir });
    expect(result.stackFile).toBe('error');
  });
});
