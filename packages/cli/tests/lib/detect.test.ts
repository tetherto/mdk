import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectEnvironment, nodeVersionWarning } from '../../src/lib/detect.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

describe('detectEnvironment', () => {
  it('defaults to npm, no git, no spec, no agent client in an empty directory', () => {
    const dir = makeTmpDir();
    const env = detectEnvironment(dir);
    expect(env.packageManager).toBe('npm');
    expect(env.git).toBe(false);
    expect(env.existingSpec).toBe(false);
    expect(env.agentClient).toBe('none');
    expect(env.nodeVersion).toBe(process.versions.node);
  });

  it('reports the running Node major version against the >= 20 requirement', () => {
    const env = detectEnvironment(makeTmpDir());
    const major = Number(process.versions.node.split('.')[0]);
    expect(env.nodeOk).toBe(major >= 24);
  });

  it('detects pnpm via pnpm-lock.yaml', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
    expect(detectEnvironment(dir).packageManager).toBe('pnpm');
  });

  it('detects yarn via yarn.lock', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'yarn.lock'), '');
    expect(detectEnvironment(dir).packageManager).toBe('yarn');
  });

  it('detects bun via bun.lockb', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'bun.lockb'), '');
    expect(detectEnvironment(dir).packageManager).toBe('bun');
  });

  it('detects a git repo, an existing spec, and each agent client', () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, 'mdk.yaml'), '');
    mkdirSync(join(dir, '.cursor'));
    const env = detectEnvironment(dir);
    expect(env.git).toBe(true);
    expect(env.existingSpec).toBe(true);
    expect(env.agentClient).toBe('cursor');
  });

  it('detects claude, codex and cline agent clients', () => {
    const claude = makeTmpDir();
    mkdirSync(join(claude, '.claude'));
    expect(detectEnvironment(claude).agentClient).toBe('claude');

    const codex = makeTmpDir();
    mkdirSync(join(codex, '.codex'));
    expect(detectEnvironment(codex).agentClient).toBe('codex');

    const cline = makeTmpDir();
    mkdirSync(join(cline, '.cline'));
    expect(detectEnvironment(cline).agentClient).toBe('cline');
  });

  it('defaults cwd to process.cwd() when omitted', () => {
    const env = detectEnvironment();
    expect(typeof env.packageManager).toBe('string');
  });
});

describe('nodeVersionWarning', () => {
  it('warns below Node 24, naming the consequence, and is silent from 24 up', () => {
    expect(nodeVersionWarning('things may break', '22.12.0')).toBe(
      'Node 22.12.0 is too old; MDK needs Node >= 24, so things may break.',
    );
    expect(nodeVersionWarning('things may break', '24.0.0')).toBeUndefined();
    expect(nodeVersionWarning('things may break', '25.1.0')).toBeUndefined();
  });
});
