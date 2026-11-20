import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';
import type { InstallResult } from '../../src/lib/npm.js';

const installDepsMock = vi.hoisted(() => vi.fn((): InstallResult => ({ ok: true })));
vi.mock('../../src/lib/npm.js', () => ({ installDeps: installDepsMock, npmBin: () => 'npm' }));

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  exitCode: number | null = null;
  signalCode: string | null = null;
  kill = vi.fn((_signal?: string) => {
    this.exitCode = 0;
    this.emit('exit', 0, null);
    return true;
  });
}

const spawnMock = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ spawn: spawnMock }));

const {
  createDashboard,
  dashboardNameFromStack,
  dashboardNames,
  findDashboardDir,
  rewriteDocLinks,
  runDashboard,
  shellTemplateUrl,
} = await import('../../src/lib/dashboard.js');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
});

describe('dashboardNameFromStack / shellTemplateUrl', () => {
  it('derives the dashboard package name from the stack name', () => {
    expect(dashboardNameFromStack('demo')).toBe('demo-dashboard');
  });

  it('builds the GitHub tree URL for a ref, defaulting to the CLI release tag', () => {
    const { version } = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'));
    expect(shellTemplateUrl()).toContain(`/tree/v${version}/examples/mdk-ui-shell-template`);
    expect(shellTemplateUrl('v1.2.3')).toContain('/tree/v1.2.3/');
    expect(() => shellTemplateUrl('../../evil')).toThrow(/Invalid git ref/);
  });
});

describe('rewriteDocLinks', () => {
  it('pins links that leave the app to GitHub and keeps the rest', () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, 'docs'));
    writeFileSync(
      join(dir, 'USAGE.md'),
      [
        '[apps](../../docs/guides/gateway/apps.md#manifest) and [site](../mvp-site/README.md)',
        '[utils](../../ui/packages/ui-foundation/src/utils/) [env](./src/constants/env.ts) [web](https://x.dev/a)',
        '[slug]: ../../packages/cli/README.md',
        '```md',
        '[kept](../../in/code.md)',
        '```',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(join(dir, 'docs', 'nested.md'), '[top](../README.md) [repo](../../../README.md)', 'utf8');

    rewriteDocLinks(dir, 'v9.9.9');

    const base = 'https://github.com/tetherto/mdk';
    expect(readFileSync(join(dir, 'USAGE.md'), 'utf8').split('\n')).toEqual([
      `[apps](${base}/blob/v9.9.9/docs/guides/gateway/apps.md#manifest) and [site](${base}/blob/v9.9.9/examples/mvp-site/README.md)`,
      `[utils](${base}/tree/v9.9.9/ui/packages/ui-foundation/src/utils) [env](./src/constants/env.ts) [web](https://x.dev/a)`,
      `[slug]: ${base}/blob/v9.9.9/packages/cli/README.md`,
      '```md',
      '[kept](../../in/code.md)',
      '```',
    ]);
    expect(readFileSync(join(dir, 'docs', 'nested.md'), 'utf8')).toBe(
      `[top](../README.md) [repo](${base}/blob/v9.9.9/README.md)`,
    );
  });
});

describe('findDashboardDir', () => {
  it('returns null when there is no apps/ directory at all', () => {
    expect(findDashboardDir(makeTmpDir())).toBeNull();
  });

  it('finds the canonical apps/dashboard when it has a dev script', () => {
    const dir = makeTmpDir();
    const appPath = join(dir, 'apps', 'dashboard');
    mkdirSync(appPath, { recursive: true });
    writeFileSync(join(appPath, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
    expect(findDashboardDir(dir)).toBe(appPath);
  });

  it('falls back to scanning apps/* for the first app with a dev script', () => {
    const dir = makeTmpDir();
    const noDev = join(dir, 'apps', 'aaa-no-dev');
    mkdirSync(noDev, { recursive: true });
    writeFileSync(join(noDev, 'package.json'), JSON.stringify({ scripts: {} }));
    const withDev = join(dir, 'apps', 'bbb-custom');
    mkdirSync(withDev, { recursive: true });
    writeFileSync(join(withDev, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
    expect(findDashboardDir(dir)).toBe(withDev);
  });

  it('returns null when apps/ exists but nothing inside has a dev script', () => {
    const dir = makeTmpDir();
    const noDev = join(dir, 'apps', 'not-an-app');
    mkdirSync(noDev, { recursive: true });
    writeFileSync(join(noDev, 'package.json'), '{ not json');
    expect(findDashboardDir(dir)).toBeNull();
  });

  // A project can hold more than one dashboard (`mdk create dashboard ui2`),
  // so a named request is `apps/<name>` or nothing — never a neighbour.
  it('selects apps/<name> when given a name, over the canonical dashboard', () => {
    const dir = makeTmpDir();
    for (const name of ['dashboard', 'ui2']) {
      const appPath = join(dir, 'apps', name);
      mkdirSync(appPath, { recursive: true });
      writeFileSync(join(appPath, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
    }
    expect(findDashboardDir(dir, 'ui2')).toBe(join(dir, 'apps', 'ui2'));
    expect(findDashboardDir(dir, 'dashboard')).toBe(join(dir, 'apps', 'dashboard'));
  });

  it('returns null for a named dashboard that does not exist, rather than falling back', () => {
    const dir = makeTmpDir();
    const appPath = join(dir, 'apps', 'dashboard');
    mkdirSync(appPath, { recursive: true });
    writeFileSync(join(appPath, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
    expect(findDashboardDir(dir, 'nope')).toBeNull();
  });

  it('returns null for a named app with no dev script', () => {
    const dir = makeTmpDir();
    const appPath = join(dir, 'apps', 'plain-app');
    mkdirSync(appPath, { recursive: true });
    writeFileSync(join(appPath, 'package.json'), JSON.stringify({ scripts: { 'dev:ui': 'vite build --watch' } }));
    expect(findDashboardDir(dir, 'plain-app')).toBeNull();
  });

  // The command validates the name first; this is the backstop behind it.
  it('refuses a name that would escape apps/', () => {
    const dir = makeTmpDir();
    const appPath = join(dir, 'apps', 'dashboard');
    mkdirSync(appPath, { recursive: true });
    writeFileSync(join(appPath, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
    for (const name of ['..', '../..', join('..', '..'), '']) {
      expect(findDashboardDir(dir, name)).toBeNull();
    }
  });
});

describe('dashboardNames', () => {
  it('lists every app with a dev script, sorted, and nothing else', () => {
    const dir = makeTmpDir();
    const write = (name: string, scripts: Record<string, string>) => {
      const appPath = join(dir, 'apps', name);
      mkdirSync(appPath, { recursive: true });
      writeFileSync(join(appPath, 'package.json'), JSON.stringify({ scripts }));
    };
    write('ui2', { dev: 'vite' });
    write('dashboard', { dev: 'vite' });
    // A scaffolded app declares `dev:ui`, not `dev` — it is not a dashboard.
    write('ops-center', { 'dev:ui': 'npm --prefix ui-src run dev' });
    expect(dashboardNames(dir)).toEqual(['dashboard', 'ui2']);
  });

  it('is empty when there is no apps/ directory', () => {
    expect(dashboardNames(makeTmpDir())).toEqual([]);
  });
});

describe('runDashboard', () => {
  const listening = (child: FakeChild): boolean =>
    child.stdout.emit('data', Buffer.from('  ➜  Local:   http://localhost:3030/\n'));

  it('resolves once the dev server prints its URL, and stops it with SIGTERM', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);

    let resolved = false;
    const promise = runDashboard('/some/dir').then((handle) => ((resolved = true), handle));
    child.emit('spawn');
    child.stdout.emit('data', Buffer.from('> vite\n'));
    await Promise.resolve();
    expect(resolved, 'not before the dev server is up').toBe(false);
    listening(child);
    const handle = await promise;

    expect(spawnMock).toHaveBeenCalledWith('npm', ['run', 'dev'], expect.objectContaining({ cwd: '/some/dir' }));
    expect(stdout.mock.calls.join(''), "the dev server's output is passed on").toContain('> vite');
    await handle.stop();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(await Promise.race([handle.crashed, Promise.resolve('none')]), 'a stop is not a crash').toBe('none');
    stdout.mockRestore();
  });

  it('sees a URL split across stdout chunks', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const promise = runDashboard('/some/dir');
    child.stdout.emit('data', Buffer.from('  ➜  Local:   http:'));
    child.stdout.emit('data', Buffer.from('//localhost:3030/\n'));
    await expect(promise).resolves.toMatchObject({ process: child });
    stdout.mockRestore();
  });

  it("waits for Vite's Local: line, not just any URL, and reads it through colour codes", async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    let resolved = false;
    const promise = runDashboard('/some/dir').then((handle) => ((resolved = true), handle));
    child.stdout.emit('data', Buffer.from('Docs: https://docs.example.com\n'));
    await Promise.resolve();
    expect(resolved, 'a banner URL is not the dev server listening').toBe(false);
    child.stdout.emit('data', Buffer.from('  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m3030\x1b[22m/\x1b[39m\n'));
    await expect(promise).resolves.toMatchObject({ process: child });
    stdout.mockRestore();
  });

  it('counts a dev server that never prints the Local: line as up after 30s, with a warning', async () => {
    vi.useFakeTimers();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const child = new FakeChild();
      spawnMock.mockReturnValue(child);
      const promise = runDashboard('/some/dir');
      await vi.advanceTimersByTimeAsync(30_000);
      await expect(promise).resolves.toMatchObject({ process: child });
      expect(stderr.mock.calls.join('')).toContain('printed no Local: URL within 30s');
    } finally {
      stderr.mockRestore();
      vi.useRealTimers();
    }
  });

  it('rejects when the dev server exits before it is up', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const promise = runDashboard('/some/dir');
    child.emit('spawn');
    child.emit('exit', 127, null);
    await expect(promise).rejects.toThrow('The dashboard dev server exited with code 127 before it started.');
  });

  it('reports a dev server that exits after it is up through crashed', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const promise = runDashboard('/some/dir');
    listening(child);
    const handle = await promise;
    child.emit('exit', null, 'SIGKILL');
    await expect(handle.crashed).resolves.toBe('signal SIGKILL');
    stdout.mockRestore();
  });

  it('hands the installed apps to the dev server in MDK_DASHBOARD_APPS', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const apps = [
      { name: 'sentinel', id: 'io.tether.sentinel', version: '0.1.0', displayName: 'Sentinel', apiBase: '/apps/sentinel', dir: '/a' },
    ];

    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const promise = runDashboard('/some/dir', apps);
    listening(child);
    await promise;
    stdout.mockRestore();

    const { env } = spawnMock.mock.calls.at(-1)![2] as { env: NodeJS.ProcessEnv };
    expect(JSON.parse(env.MDK_DASHBOARD_APPS!)).toEqual(apps);
  });

  it('resolves stop() immediately when the child already exited', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const promise = runDashboard('/some/dir');
    listening(child);
    const handle = await promise;
    stdout.mockRestore();

    Object.defineProperty(child, 'exitCode', { value: 0 });
    await handle.stop();
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('rejects with a clear message when npm is missing (ENOENT)', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const promise = runDashboard('/some/dir');
    const err = Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' });
    child.emit('error', err);
    await expect(promise).rejects.toThrow(/npm was not found on PATH/);
  });

  it('rejects with the underlying message for any other spawn error', async () => {
    const child = new FakeChild();
    spawnMock.mockReturnValue(child);
    const promise = runDashboard('/some/dir');
    child.emit('error', new Error('kaboom'));
    await expect(promise).rejects.toThrow(/Failed to start the dashboard dev server: kaboom/);
  });
});

describe('createDashboard (monorepo template)', () => {
  it('rejects an unsafe name and a target outside <parentDir>/apps before touching disk', async () => {
    const parentDir = makeTmpDir();
    for (const name of ["x'; alert(1); '", '../../etc', 'A']) {
      expect((await createDashboard({ name, parentDir })).message).toMatch(/Invalid dashboard name/);
    }
    for (const subdir of ['apps', '..', join('apps', '..', '..', 'victim')]) {
      const result = await createDashboard({ name: 'ok', parentDir, subdir, force: true });
      expect(result.message).toMatch(/Refusing to scaffold outside/);
    }
    expect(existsSync(parentDir)).toBe(true);
    expect(installDepsMock).not.toHaveBeenCalled();
  });

  it('refuses to overwrite an existing target without force', async () => {
    const parentDir = makeTmpDir();
    mkdirSync(join(parentDir, 'apps', 'dashboard'), { recursive: true });
    const result = await createDashboard({ name: 'x-dashboard', parentDir });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/already exists/);
    expect(installDepsMock).not.toHaveBeenCalled();
  });

  it('scaffolds from the local monorepo template, installs, and configures the gateway URL', async () => {
    const parentDir = makeTmpDir();
    writeFileSync(
      join(parentDir, 'mdk.yaml'),
      'spec:\n  gateway:\n    port: 4001\n',
      'utf8',
    );
    const result = await createDashboard({ name: 'demo-dashboard', parentDir });

    expect(result.ok).toBe(true);
    expect(result.source).toBe('monorepo');
    expect(existsSync(result.appPath!)).toBe(true);
    expect(installDepsMock).toHaveBeenCalledWith(result.appPath, true);

    const pkg = JSON.parse(readFileSync(join(result.appPath!, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo-dashboard');
    // The MDK packages link to this checkout relative to the dashboard, so its package.json can be committed.
    const devkit: string = pkg.dependencies['@tetherto/mdk-react-devkit'];
    expect(devkit).toMatch(/^file:\.\.?\//);
    expect(resolve(result.appPath!, devkit.slice('file:'.length))).toBe(
      resolve(import.meta.dirname, '..', '..', '..', '..', 'ui', 'packages', 'react-devkit'),
    );

    const env = readFileSync(join(result.appPath!, '.env'), 'utf8');
    expect(env).toContain('VITE_GATEWAY_URL=http://localhost:4001');
    expect(env).toContain('VITE_OAUTH_BASE_URL=http://localhost:4001');
    expect(env).toContain('VITE_AUTH_MODE=password');
    expect(env).toContain('VITE_AUTH_BYPASS=false');

    // Excluded scaffold artifacts never make it into the copy.
    expect(existsSync(join(result.appPath!, 'node_modules'))).toBe(false);

    // Docs links out of the template point at GitHub; none dangle from the new location.
    const usage = readFileSync(join(result.appPath!, 'USAGE.md'), 'utf8');
    expect(usage).toContain('](https://github.com/tetherto/mdk/blob/');
    expect(usage).not.toMatch(/\]\(\.\.\//);
    expect(readFileSync(join(result.appPath!, 'README.md'), 'utf8')).not.toMatch(/\]\(\.\.\//);
  });

  it('accepts an explicit gatewayUrl and an explicit subdir', async () => {
    const parentDir = makeTmpDir();
    const result = await createDashboard({
      name: 'demo-dashboard',
      parentDir,
      subdir: join('apps', 'custom'),
      gatewayUrl: 'http://localhost:9999',
    });
    expect(result.appPath).toBe(join(parentDir, 'apps', 'custom'));
    const env = readFileSync(join(result.appPath!, '.env'), 'utf8');
    expect(env).toContain('http://localhost:9999');
  });

  it('surfaces an install warning without failing the scaffold', async () => {
    installDepsMock.mockReturnValueOnce({ ok: false, message: 'npm exploded' });
    const parentDir = makeTmpDir();
    const result = await createDashboard({ name: 'demo-dashboard', parentDir });
    expect(result.ok).toBe(true);
    expect(result.installWarning).toBe('npm exploded');
  });

  it('retries a failed npm install with --legacy-peer-deps', async () => {
    // npm 11.0 to 11.5 crash on the template's nested optional peers ("reading 'edgesOut'").
    installDepsMock.mockReturnValueOnce({ ok: false, message: 'npm install exited with code 1.', exitCode: 1 });
    const parentDir = makeTmpDir();
    const result = await createDashboard({ name: 'demo-dashboard', parentDir });

    expect(installDepsMock).toHaveBeenNthCalledWith(1, result.appPath, true);
    expect(installDepsMock).toHaveBeenNthCalledWith(2, result.appPath, true, ['--legacy-peer-deps']);
    expect(result.ok).toBe(true);
    expect(result.installRetried).toBe(true);
    expect(result.installWarning).toBeUndefined();
  });

  it('warns with an npm upgrade hint when the retry fails too', async () => {
    installDepsMock
      .mockReturnValueOnce({ ok: false, message: 'npm install exited with code 1.', exitCode: 1 })
      .mockReturnValueOnce({ ok: false, message: 'npm install exited with code 1.', exitCode: 1 });
    const result = await createDashboard({ name: 'demo-dashboard', parentDir: makeTmpDir() });

    expect(installDepsMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    expect(result.installRetried).toBe(true);
    expect(result.installWarning).toMatch(/exited with code 1\. .*npm 11\.6 or newer/);
  });

  it('does not retry when npm never started', async () => {
    installDepsMock.mockReturnValueOnce({ ok: false, message: 'npm was not found on PATH' });
    const result = await createDashboard({ name: 'demo-dashboard', parentDir: makeTmpDir() });

    expect(installDepsMock).toHaveBeenCalledTimes(1);
    expect(result.installRetried).toBeUndefined();
    expect(result.installWarning).toBe('npm was not found on PATH');
  });

  it('does not retry a skipped install', async () => {
    const result = await createDashboard({ name: 'demo-dashboard', parentDir: makeTmpDir(), install: false });
    expect(installDepsMock).toHaveBeenCalledTimes(1);
    expect(installDepsMock).toHaveBeenCalledWith(result.appPath, false);
    expect(result.installRetried).toBeUndefined();
  });

  it('overwrites an existing target with force', async () => {
    const parentDir = makeTmpDir();
    mkdirSync(join(parentDir, 'apps', 'dashboard'), { recursive: true });
    writeFileSync(join(parentDir, 'apps', 'dashboard', 'marker.txt'), 'stale', 'utf8');
    const result = await createDashboard({ name: 'demo-dashboard', parentDir, force: true });
    expect(result.ok).toBe(true);
    expect(existsSync(join(result.appPath!, 'marker.txt'))).toBe(false);
  });
});
