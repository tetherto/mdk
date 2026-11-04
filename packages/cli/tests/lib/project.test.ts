import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DIRS,
  WORKSPACES,
  addFileDependency,
  ensureProjectGitignore,
  ensureProjectManifest,
  ensureProjectReadme,
  isFileLinkedFromProject,
  isWorkspaceMember,
  readStackName,
} from '../../src/lib/project.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

describe('DIRS / WORKSPACES', () => {
  it('declares the expected component directories and workspace globs', () => {
    expect(DIRS.workers).toBe('workers');
    expect(DIRS.apps).toBe('apps');
    expect(DIRS.dashboard).toBe(join('apps', 'dashboard'));
    expect(WORKSPACES).toEqual(['workers/*', 'plugins/*']);
  });
});

describe('ensureProjectManifest', () => {
  it('creates a manifest when none exists, without a workspaces key', () => {
    const dir = makeTmpDir();
    const action = ensureProjectManifest(dir, 'My Stack!');
    expect(action).toBe('created');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-stack');
    expect(pkg.private).toBe(true);
    expect(pkg.workspaces).toBeUndefined();
    const cli = pkg.devDependencies['@tetherto/mdk-cli'];
    expect(cli).toMatch(/^file:\.\.?\//);
    expect(resolve(dir, cli.slice('file:'.length))).toMatch(/packages[\\/]cli$/);
  });

  it('slugifies an unusual stack name, falling back to mdk-stack if empty', () => {
    const dir = makeTmpDir();
    ensureProjectManifest(dir, '   ');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('mdk-stack');
  });

  it('leaves an existing manifest without workspaces untouched', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'existing' }), 'utf8');
    const action = ensureProjectManifest(dir, 'stack');
    expect(action).toBe('present');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('existing');
    expect(pkg.workspaces).toBeUndefined();
  });

  it('leaves an existing manifest with workspaces untouched', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'existing', workspaces: ['custom/*'] }),
      'utf8',
    );
    const action = ensureProjectManifest(dir, 'stack');
    expect(action).toBe('present');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.workspaces).toEqual(['custom/*']);
  });

  it('leaves an unparseable manifest untouched', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'package.json'), '{ not json', 'utf8');
    expect(ensureProjectManifest(dir, 'stack')).toBe('present');
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe('{ not json');
  });
});

describe('isWorkspaceMember', () => {
  it('is false when the project has no workspaces field', () => {
    const dir = makeTmpDir();
    expect(isWorkspaceMember(dir, join(dir, 'workers', 'a'))).toBe(false);
  });

  it('is true for a package under a declared workspace glob', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'stack', workspaces: WORKSPACES }),
      'utf8',
    );
    expect(isWorkspaceMember(dir, join(dir, 'workers', 'demo'))).toBe(true);
    expect(isWorkspaceMember(dir, join(dir, 'plugins', 'demo'))).toBe(true);
  });

  it('is false for a package outside every declared glob', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'stack', workspaces: WORKSPACES }),
      'utf8',
    );
    expect(isWorkspaceMember(dir, join(dir, 'apps', 'dashboard'))).toBe(false);
  });

  it('is false for a path outside the project entirely', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'stack', workspaces: WORKSPACES }),
      'utf8',
    );
    const outside = makeTmpDir();
    expect(isWorkspaceMember(dir, outside)).toBe(false);
  });

  it('is false for a nested path that does not match glob segment count', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'stack', workspaces: WORKSPACES }),
      'utf8',
    );
    expect(isWorkspaceMember(dir, join(dir, 'workers', 'demo', 'nested'))).toBe(false);
  });
});

describe('isFileLinkedFromProject', () => {
  it('is false when there is no package.json', () => {
    const dir = makeTmpDir();
    expect(isFileLinkedFromProject(dir, join(dir, 'plugins', 'x'))).toBe(false);
  });

  it('is true for a package linked via dependencies', () => {
    const dir = makeTmpDir();
    const pluginDir = join(dir, 'plugins', 'x');
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { x: 'file:./plugins/x' } }),
      'utf8',
    );
    expect(isFileLinkedFromProject(dir, pluginDir)).toBe(true);
  });

  it('is true for a package linked via devDependencies', () => {
    const dir = makeTmpDir();
    const pluginDir = join(dir, 'plugins', 'x');
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { x: 'file:./plugins/x' } }),
      'utf8',
    );
    expect(isFileLinkedFromProject(dir, pluginDir)).toBe(true);
  });

  it('is false when no dependency points at the package', () => {
    const dir = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { lodash: '^4.0.0' } }),
      'utf8',
    );
    expect(isFileLinkedFromProject(dir, join(dir, 'plugins', 'x'))).toBe(false);
  });

  it('is false on an unparseable manifest', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'package.json'), '{ not json', 'utf8');
    expect(isFileLinkedFromProject(dir, join(dir, 'plugins', 'x'))).toBe(false);
  });
});

describe('addFileDependency', () => {
  it('throws when there is no package.json', () => {
    const dir = makeTmpDir();
    const checkout = makeTmpDir();
    expect(() => addFileDependency(dir, '@tetherto/mdk-worker-antminer', checkout)).toThrow(
      /no package.json/,
    );
  });

  it('writes a relative file: spec for an in-project path', () => {
    const dir = makeTmpDir();
    ensureProjectManifest(dir, 'stack');
    const local = join(dir, 'workers', 'demo');
    addFileDependency(dir, '@org/demo', local);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@org/demo']).toBe('file:./workers/demo');
    expect(pkg.workspaces).toBeUndefined();
  });

  it('writes a relative file: spec for an out-of-project checkout, never bare "*"', () => {
    const dir = makeTmpDir();
    const checkout = makeTmpDir();
    ensureProjectManifest(dir, 'stack');
    addFileDependency(dir, '@tetherto/mdk-worker-antminer', checkout);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@tetherto/mdk-worker-antminer']).toMatch(/^file:\.\./);
    expect(pkg.dependencies['@tetherto/mdk-worker-antminer']).not.toBe('*');
    expect(pkg.workspaces).toBeUndefined();
  });

  it('is idempotent when the dependency is already declared', () => {
    const dir = makeTmpDir();
    const checkout = makeTmpDir();
    ensureProjectManifest(dir, 'stack');
    addFileDependency(dir, '@tetherto/mdk-worker-antminer', checkout);
    const before = readFileSync(join(dir, 'package.json'), 'utf8');
    addFileDependency(dir, '@tetherto/mdk-worker-antminer', checkout);
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe(before);
  });

  it('preserves other dependencies already present', () => {
    const dir = makeTmpDir();
    const checkout = makeTmpDir();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { lodash: '^4.0.0' } }),
      'utf8',
    );
    addFileDependency(dir, '@tetherto/mdk-worker-antminer', checkout);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.lodash).toBe('^4.0.0');
    expect(pkg.dependencies['@tetherto/mdk-worker-antminer']).toMatch(/^file:\.\./);
  });
});

describe('readStackName', () => {
  it('returns null when there is no mdk.yaml', () => {
    const dir = makeTmpDir();
    expect(readStackName(dir)).toBeNull();
  });

  it('reads metadata.name from mdk.yaml', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'metadata:\n  name: my-stack\n', 'utf8');
    expect(readStackName(dir)).toBe('my-stack');
  });

  it('falls back to the directory basename when metadata.name is absent', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), 'kind: Stack\n', 'utf8');
    expect(readStackName(dir)).toBe(dir.split('/').pop());
  });

  it('falls back to the directory basename on unparseable YAML', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'mdk.yaml'), '{ not: valid: yaml', 'utf8');
    expect(readStackName(dir)).toBe(dir.split('/').pop());
  });
});

describe('ensureProjectGitignore', () => {
  it('creates a .gitignore with the MDK block when absent', () => {
    const dir = makeTmpDir();
    expect(ensureProjectGitignore(dir)).toBe('created');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toContain('.mdk/');
  });

  it('appends the MDK block to an existing .gitignore without it', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, '.gitignore'), 'dist/', 'utf8');
    expect(ensureProjectGitignore(dir)).toBe('updated');
    const content = readFileSync(join(dir, '.gitignore'), 'utf8');
    expect(content).toContain('dist/');
    expect(content).toContain('.mdk/');
  });

  it('leaves a .gitignore that already has the MDK block and .env untouched', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, '.gitignore'), '.mdk/\n.env\n', 'utf8');
    expect(ensureProjectGitignore(dir)).toBe('present');
  });

  it('adds .env to an MDK .gitignore that lacks it (it holds setup secrets)', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, '.gitignore'), '.mdk/', 'utf8');
    expect(ensureProjectGitignore(dir)).toBe('updated');
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toBe('.mdk/\n.env\n');
  });
});

describe('ensureProjectReadme', () => {
  it('does not overwrite an existing README', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'README.md'), 'custom content', 'utf8');
    expect(ensureProjectReadme(dir, { stackName: 'x', workerNames: [] })).toBe('present');
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('custom content');
  });

  it('writes a README with both the together-run and per-component run flows', () => {
    const dir = makeTmpDir();
    const action = ensureProjectReadme(dir, { stackName: 'my-stack', workerNames: ['a'] });
    expect(action).toBe('created');
    const content = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(content).toContain('# my-stack');
    expect(content).toContain('mdk run');
    expect(content).toContain('mdk run kernel');
    expect(content).toContain('mdk run worker a');
    expect(content).not.toContain('Dashboard');
  });

  it('tells the reader to create the first operator once the stack runs', () => {
    const dir = makeTmpDir();
    ensureProjectReadme(dir, { stackName: 'my-stack', workerNames: [] });
    const content = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(content).toContain('mdk user add <name> --admin');
    expect(content).toMatch(/second terminal/);
    expect(content).toMatch(/sign in/i);
  });

  it('lists each worker in the per-component commands, or a placeholder with none', () => {
    const dir = makeTmpDir();
    ensureProjectReadme(dir, { stackName: 'my-stack', workerNames: ['a', 'b'] });
    const content = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(content).toContain('mdk run kernel');
    expect(content).toContain('mdk run worker a');
    expect(content).toContain('mdk run worker b');

    const dir2 = makeTmpDir();
    ensureProjectReadme(dir2, { stackName: 'my-stack', workerNames: [] });
    expect(readFileSync(join(dir2, 'README.md'), 'utf8')).toContain('mdk run worker <name>');
  });

  it('includes a Dashboard section when dashboardDir is given', () => {
    const dir = makeTmpDir();
    ensureProjectReadme(dir, {
      stackName: 'my-stack',
      workerNames: [],
      dashboardDir: 'apps/dashboard',
    });
    const content = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(content).toContain('## Dashboard');
    expect(content).toContain('mdk run dashboard');
    expect(content).not.toContain('cd apps/dashboard');
    expect(content).toMatch(/sign in as the operator/i);
  });
});
