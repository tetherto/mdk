import { readFileSync, statSync } from 'node:fs';
import { createPrivateKey } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createAgentCredential,
  credentialsDir,
  ensureAppCredential,
  listCredentials,
  parseAccount,
  readCredential,
  removeCredential,
  rotateCredential,
  stackServiceAccounts,
} from '../../src/lib/credentials.js';
import type { StackSpec } from '../../src/lib/spec.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

const mode = (path: string) => statSync(path).mode & 0o777;

describe('service-account credentials', () => {
  it('creates an app credential once, private to this instance', () => {
    const dir = makeTmpDir();
    const first = ensureAppCredential(dir, 'ops-center');
    expect(first).toMatchObject({ name: 'app:ops-center', kind: 'app', created: true });
    expect(first.publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(first.file).toBe(`${credentialsDir(dir)}/apps/ops-center.json`);
    expect(mode(first.file)).toBe(0o600);
    expect(mode(credentialsDir(dir))).toBe(0o700);

    const body = JSON.parse(readFileSync(first.file, 'utf8'));
    expect(createPrivateKey(body.privateKeyPem).asymmetricKeyType).toBe('ed25519');

    const again = ensureAppCredential(dir, 'ops-center');
    expect(again).toMatchObject({ created: false, publicKey: first.publicKey });
  });

  it('creates, rotates and removes agent credentials', () => {
    const dir = makeTmpDir();
    const agent = createAgentCredential(dir, 'operator-agent');
    expect(agent).toMatchObject({ name: 'operator-agent', kind: 'agent' });
    expect(() => createAgentCredential(dir, 'operator-agent')).toThrow(/already has a credential/);
    expect(() => createAgentCredential(dir, 'app:x')).toThrow(/created by `mdk add app`/);

    const rotated = rotateCredential(dir, 'operator-agent');
    expect(rotated.publicKey).not.toBe(agent.publicKey);
    expect(readCredential(dir, 'operator-agent')?.publicKey).toBe(rotated.publicKey);
    expect(() => rotateCredential(dir, 'ghost')).toThrow(/No credential for "ghost"/);

    expect(removeCredential(dir, 'operator-agent')).toBe(true);
    expect(removeCredential(dir, 'operator-agent')).toBe(false);
    expect(readCredential(dir, 'operator-agent')).toBeNull();
  });

  it('lists apps then agents, and rejects names that are neither', () => {
    const dir = makeTmpDir();
    expect(listCredentials(dir)).toEqual([]);
    createAgentCredential(dir, 'b-agent');
    ensureAppCredential(dir, 'zeta');
    createAgentCredential(dir, 'a-agent');
    expect(listCredentials(dir).map((c) => c.name)).toEqual(['app:zeta', 'a-agent', 'b-agent']);
    for (const bad of ['', 'Agent', 'app:', 'app:Bad', 'a/b', 'app:x:y']) expect(() => parseAccount(bad)).toThrow(/not a service account name/);
    expect(parseAccount('app:ops')).toEqual({ kind: 'app', short: 'ops' });
  });

  it('registers every app in the stack and every agent here, creating missing app credentials', () => {
    const dir = makeTmpDir();
    ensureAppCredential(dir, 'removed-app');
    const agent = createAgentCredential(dir, 'operator-agent');
    const spec = { spec: { apps: [{ name: 'ops-center', package: 'p', config: {} }] } } as unknown as StackSpec;
    const list = stackServiceAccounts(dir, spec);
    expect(list.map((s) => s.name)).toEqual(['app:ops-center', 'mdk-cli', 'mdk-gateway', 'mdk-mcp', 'operator-agent']);
    expect(list[4]!.publicKey).toBe(agent.publicKey);
    expect(readCredential(dir, 'app:ops-center')).not.toBeNull();
  });
});
