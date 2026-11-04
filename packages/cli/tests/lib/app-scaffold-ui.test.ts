import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const installDepsMock = vi.hoisted(() => vi.fn());
const spawnSyncMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/npm.js', () => ({
  installDeps: installDepsMock,
  installScaffold: () => ({ ok: true, dir: '/does/not/matter' }),
  npmBin: () => 'npm',
  npmNeedsShell: () => false,
}));
vi.mock('node:child_process', () => ({ spawnSync: spawnSyncMock }));
// Whether this checkout's UI packages are built depends on the machine, so it is set per test.
const unbuiltPackagesMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/checkout.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/checkout.js')>()),
  unbuiltPackages: unbuiltPackagesMock,
}));

const { createApp } = await import('../../src/lib/app-scaffold.js');

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');
const read = (dir: string, file: string): string => readFileSync(join(dir, file), 'utf8');

beforeEach(() => {
  installDepsMock.mockReset().mockReturnValue({ ok: true });
  spawnSyncMock.mockReset().mockReturnValue({ status: 0, stdout: '', stderr: '' });
  unbuiltPackagesMock.mockReset().mockReturnValue([]);
});
afterEach(cleanupTmpDirs);

describe('createApp — starter UI', () => {
  it('writes ui-src/ across the three UI layers, with the app filled in', () => {
    const dir = createApp({ name: 'ops-center', parentDir: makeTmpDir(), install: false }).appPath!;

    const entry = read(dir, 'ui-src/index.tsx');
    // Filled in from the generated mdk-app.yaml, so the UI's id always matches it.
    expect(entry).toContain("id: 'com.example.ops-center'");
    expect(entry).toContain("displayName: 'ops-center'");
    expect(read(dir, 'ui-src/data/summary.ts')).toContain("from '@tetherto/mdk-ui-foundation'");
    // The template's route, under the app's mount: GET /apps/<name>/api/<name>/summary.
    expect(read(dir, 'ui-src/hooks/use-summary.ts')).toContain("apiUrl('/api/ops-center/summary')");
    expect(read(dir, 'ui-src/components/summary-panel.tsx')).toContain("from '@tetherto/mdk-react-devkit'");
    expect(read(dir, 'ui-src/vite.config.ts')).toContain('MDK_APP_SHARED_MODULES');
    expect(read(dir, 'ui-src/vite.config.ts')).toContain("outDir: '../ui'");
    for (const file of ['ui-src/index.tsx', 'ui-src/data/summary.ts', 'ui-src/styles.css', 'ui-src/pages/overview-page.tsx']) {
      expect(read(dir, file)).not.toMatch(/__APP_[A-Z_]+__/);
    }
    expect(read(dir, '.gitignore')).toContain('node_modules/');
    // The app gets its own tsconfig; the template's editor-only one stays behind.
    expect(JSON.parse(read(dir, 'ui-src/tsconfig.json')).compilerOptions).toMatchObject({ jsx: 'react-jsx', strict: true });
    expect(read(dir, 'ui-src/tsconfig.json')).not.toContain('paths');
    // The controllers type-check through ui-src's TypeScript, against plugin/.
    expect(JSON.parse(read(dir, 'ui-src/tsconfig.plugin.json'))).toMatchObject({
      compilerOptions: { allowJs: true, module: 'nodenext', noEmit: true },
      include: ['../plugin'],
    });
    expect(existsSync(join(dir, 'tsconfig.json'))).toBe(false);
  });

  it('keeps CSS class names valid for a name with dots', () => {
    const dir = createApp({ name: 'fleet.watch', parentDir: makeTmpDir(), install: false }).appPath!;
    expect(read(dir, 'ui-src/styles.css')).toContain('.fleet-watch-page');
    expect(read(dir, 'ui-src/pages/overview-page.tsx')).toContain('className="fleet-watch-page"');
  });

  it("gives the UI build its own package, so it never installs the app's backend dependencies", () => {
    const dir = createApp({ name: 'demo', parentDir: makeTmpDir(), install: false }).appPath!;
    const pkg = JSON.parse(read(dir, 'package.json'));
    expect(pkg.scripts).toEqual({
      'build:ui': 'npm --prefix ui-src run build',
      'dev:ui': 'npm --prefix ui-src run dev',
      'typecheck:ui': 'npm --prefix ui-src run typecheck',
      'typecheck:plugin': 'npm --prefix ui-src run typecheck:plugin',
      typecheck: 'npm run typecheck:plugin && npm run typecheck:ui',
    });
    expect(pkg.devDependencies).toBeUndefined();
    expect(pkg.files).toEqual(['mdk-app.yaml', 'plugin/', 'ui/', 'README.md']);

    const ui = JSON.parse(read(dir, 'ui-src/package.json'));
    expect(ui).toMatchObject({ name: 'demo-ui', private: true, scripts: { build: 'vite build' } });
    expect(Object.keys(ui.devDependencies)).toEqual(
      expect.arrayContaining(['vite', 'react', '@tetherto/mdk-react-adapter', '@tetherto/mdk-react-devkit']),
    );
    expect(ui.dependencies).toBeUndefined();
  });

  it('installs and builds the UI by default', () => {
    const result = createApp({ name: 'demo', parentDir: makeTmpDir() });
    expect(installDepsMock).toHaveBeenCalledWith(join(result.appPath!, 'ui-src'));
    expect(spawnSyncMock).toHaveBeenCalledWith('npm', ['run', 'build:ui'], expect.objectContaining({ cwd: result.appPath }));
    expect(result).toMatchObject({ ok: true, uiBuilt: true });
  });

  it('still scaffolds, with the placeholder UI and a warning, when the install fails', () => {
    installDepsMock.mockReturnValue({ ok: false, message: 'npm install exited with code 1.' });
    const result = createApp({ name: 'demo', parentDir: makeTmpDir() });
    expect(result).toMatchObject({ ok: true, uiBuilt: false, uiWarning: 'npm install exited with code 1.' });
    expect(spawnSyncMock).not.toHaveBeenCalled();
    expect(read(result.appPath!, 'ui/index.js')).toContain('"routes": []');
  });

  it("reports the build's error output when the build fails", () => {
    spawnSyncMock.mockReturnValue({ status: 1, stdout: '', stderr: 'ui-src/index.tsx: Unexpected token' });
    const result = createApp({ name: 'demo', parentDir: makeTmpDir() });
    expect(result.uiBuilt).toBe(false);
    expect(result.uiWarning).toMatch(/build:ui exited with code 1[\s\S]*Unexpected token/);
  });

  it('links the MDK UI packages relative to ui-src/, so the manifest can be committed', () => {
    const dir = createApp({ name: 'demo', parentDir: makeTmpDir(), install: false }).appPath!;
    const { devDependencies } = JSON.parse(read(dir, 'ui-src/package.json')) as { devDependencies: Record<string, string> };
    // These tests run from the checkout, so the MDK UI packages link to it.
    const spec = devDependencies['@tetherto/mdk-react-devkit']!;
    expect(spec).toMatch(/^file:\.\.?\//);
    expect(resolve(dir, 'ui-src', spec.slice('file:'.length))).toBe(join(REPO_ROOT, 'ui', 'packages', 'react-devkit'));
  });

  it("does not try to build against the checkout's UI packages before they are built", () => {
    unbuiltPackagesMock.mockReturnValue([join(REPO_ROOT, 'ui', 'packages', 'react-devkit')]);
    const result = createApp({ name: 'demo', parentDir: makeTmpDir() });
    expect(installDepsMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, uiBuilt: false });
    expect(result.uiWarning).toContain('ui/packages/react-devkit');
    expect(result.uiWarning).toContain('npm run setup:ui && npm run build:ui');
  });

  it('skips install and build with install: false', () => {
    const result = createApp({ name: 'demo', parentDir: makeTmpDir(), install: false });
    expect(installDepsMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, uiBuilt: false, uiWarning: 'install skipped (--no-install)' });
  });
});
