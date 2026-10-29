import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { linkCheckoutBackend } from '../../src/lib/scaffold.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

const TEMPLATES = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

const writeJson = (file: string, value: unknown): void => writeFileSync(file, JSON.stringify(value));
const readDeps = (file: string): Record<string, string> | undefined =>
  (JSON.parse(readFileSync(file, 'utf8')) as { dependencies?: Record<string, string> }).dependencies;

/** A fake checkout: `<root>/packages/cli` plus the given `backend/core/<dir>` packages. */
function fakeCheckout(dirs: string[]): { root: string; cliRoot: string } {
  const root = makeTmpDir();
  const cliRoot = join(root, 'packages', 'cli');
  mkdirSync(cliRoot, { recursive: true });
  for (const dir of dirs) {
    mkdirSync(join(root, 'backend', 'core', dir), { recursive: true });
    writeJson(join(root, 'backend', 'core', dir, 'package.json'), { name: dir });
  }
  return { root, cliRoot };
}

describe('linkCheckoutBackend', () => {
  it('links the MDK backend packages the package depends on to the checkout', () => {
    const { root, cliRoot } = fakeCheckout(['client', 'mdk-worker']);
    const pkg = join(makeTmpDir(), 'package.json');
    writeJson(pkg, { dependencies: { '@tetherto/mdk-client': '^0.10.0', debug: '4.4.1' } });

    linkCheckoutBackend(pkg, cliRoot);

    expect(readDeps(pkg)).toEqual({
      '@tetherto/mdk-client': `file:${join(root, 'backend', 'core', 'client')}`,
      debug: '4.4.1',
    });
  });

  it('keeps the published range for a package the checkout does not have', () => {
    const { cliRoot } = fakeCheckout([]);
    const pkg = join(makeTmpDir(), 'package.json');
    writeJson(pkg, { dependencies: { '@tetherto/mdk-worker': '^0.10.0' } });

    linkCheckoutBackend(pkg, cliRoot);

    expect(readDeps(pkg)).toEqual({ '@tetherto/mdk-worker': '^0.10.0' });
  });

  it('changes nothing for a standalone CLI or a package without dependencies', () => {
    const pkg = join(makeTmpDir(), 'package.json');
    writeJson(pkg, { dependencies: { '@tetherto/mdk-client': '^0.10.0' } });
    linkCheckoutBackend(pkg, join(makeTmpDir(), 'node_modules', '@tetherto', 'mdk-cli'));
    expect(readDeps(pkg)).toEqual({ '@tetherto/mdk-client': '^0.10.0' });

    const { cliRoot } = fakeCheckout(['client']);
    const bare = join(makeTmpDir(), 'package.json');
    writeJson(bare, { name: 'bare' });
    linkCheckoutBackend(bare, cliRoot);
    expect(readDeps(bare)).toBeUndefined();
  });
});

describe('scaffold templates', () => {
  // A `@tetherto/*` dep the checkout link misses falls back to its registry range and 404s on install.
  it.each(['worker', 'app'])('links every @tetherto/* dependency of the %s template to this checkout', (template) => {
    const pkg = join(makeTmpDir(), 'package.json');
    copyFileSync(join(TEMPLATES, template, 'package.json'), pkg);
    const { devDependencies = {} } = JSON.parse(readFileSync(pkg, 'utf8')) as { devDependencies?: Record<string, string> };

    linkCheckoutBackend(pkg);

    const unlinked = Object.entries({ ...readDeps(pkg), ...devDependencies })
      .filter(([name, range]) => name.startsWith('@tetherto/') && !range.startsWith('file:'))
      .map(([name]) => name);
    expect(unlinked).toEqual([]);
  });
});
