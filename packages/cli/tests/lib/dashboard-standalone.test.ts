import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// This file exercises `createDashboard`'s *standalone* (no local monorepo
// checkout) branch. That branch is only reachable when the CLI's own location
// (CLI_ROOT, derived from `import.meta.url` at module load) has no
// `examples/mdk-ui-shell-template` above it — never true when tests run inside
// this monorepo. Faking `node:url`'s `fileURLToPath` relocates CLI_ROOT to a
// `/tmp` path with no such ancestor, so the module takes the GitHub-fetch path
// exactly as it would from a published, standalone install.
vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:url')>();
  return {
    ...actual,
    fileURLToPath: (url: string | URL) => {
      const real = actual.fileURLToPath(url);
      return real.endsWith('dashboard.ts') ? '/tmp/mdk-cli-fake-root/dist/lib/dashboard.js' : real;
    },
  };
});

const installDepsMock = vi.hoisted(() => vi.fn(() => ({ ok: true })));
vi.mock('../../src/lib/npm.js', () => ({ installDeps: installDepsMock }));

const fetchTemplateMock = vi.hoisted(() =>
  vi.fn(async (_url: string, dest: string) => {
    mkdirSync(join(dest, 'src', 'constants'), { recursive: true });
    writeFileSync(
      join(dest, 'package.json'),
      JSON.stringify({
        name: 'mdk-ui-shell-template',
        dependencies: { '@tetherto/mdk-ui-core': 'file:../../packages/ui-core' },
      }),
    );
    writeFileSync(join(dest, '.env.example'), 'VITE_GATEWAY_URL=http://localhost:3847\n', 'utf8');
    writeFileSync(
      join(dest, 'src', 'constants', 'env.ts'),
      "export const APP_NAME = 'placeholder';\n",
      'utf8',
    );
  }),
);
vi.mock('../../src/lib/fetch-template.js', () => ({ fetchTemplate: fetchTemplateMock }));

const { createDashboard } = await import('../../src/lib/dashboard.js');

afterEach(() => {
  cleanupTmpDirs();
  vi.clearAllMocks();
});

describe('createDashboard (standalone / GitHub template)', () => {
  it('fetches the template from GitHub and rewrites file: deps to a published range', async () => {
    const parentDir = makeTmpDir();
    const result = await createDashboard({ name: 'demo-dashboard', parentDir });

    expect(result.ok).toBe(true);
    expect(result.source).toBe('github');
    expect(fetchTemplateMock).toHaveBeenCalledWith(
      expect.stringContaining('mdk-ui-shell-template'),
      result.appPath,
      false,
    );

    const pkg = JSON.parse(readFileSync(join(result.appPath!, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo-dashboard');
    expect(pkg.dependencies['@tetherto/mdk-ui-core']).not.toMatch(/^file:/);

    const displayed = readFileSync(join(result.appPath!, 'src', 'constants', 'env.ts'), 'utf8');
    expect(displayed).toContain('APP_NAME = "demo-dashboard"');
  });

  it('reports a fetch failure without throwing', async () => {
    fetchTemplateMock.mockRejectedValueOnce(new Error('network down'));
    const parentDir = makeTmpDir();
    const result = await createDashboard({ name: 'demo-dashboard', parentDir });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Could not fetch the UI shell/);
    expect(result.detail).toBe('network down');
  });

  it('suggests --ref main when the release ref cannot be fetched', async () => {
    fetchTemplateMock.mockRejectedValueOnce(new Error('could not find commit hash'));
    const result = await createDashboard({ name: 'demo-dashboard', parentDir: makeTmpDir() });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/If v\d+\.\d+\.\d+\S* is not published yet, retry with --ref main\./);
  });

  it('does not suggest --ref main when the user passed their own ref', async () => {
    for (const ref of ['main', 'v0.0.1', 'abc1234']) {
      fetchTemplateMock.mockRejectedValueOnce(new Error('network down'));
      const result = await createDashboard({ name: 'demo-dashboard', parentDir: makeTmpDir(), ref });
      expect(result.ok).toBe(false);
      expect(result.message).not.toContain('--ref main');
    }
  });
});
