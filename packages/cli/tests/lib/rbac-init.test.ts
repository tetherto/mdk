import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const applyMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/rbac-kernel.js', () => ({ applyStackRbac: applyMock }));

const { initPolicy } = await import('../../src/lib/rbac-init.js');

afterEach(() => {
  cleanupTmpDirs();
  applyMock.mockReset();
});

/** A local app package (path-backed, so no install) requesting `permissions`. */
function app(dir: string, name: string, permissions: string): void {
  const root = join(dir, 'apps', name);
  mkdirSync(join(root, 'plugin', 'controllers'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name, version: '0.1.0' }));
  writeFileSync(join(root, 'mdk-app.yaml'), `id: com.example.${name}\nversion: 0.1.0\ndisplayName: ${name}\npermissions: ${permissions}\n`);
  writeFileSync(join(root, 'plugin', 'mdk-plugin.json'), JSON.stringify({ name, version: '0.1.0', routes: [{ id: `${name}.s`, handler: './controllers/s.js', http: { method: 'GET', path: '/s' }, safety: 'read-only' }] }));
  writeFileSync(join(root, 'plugin', 'controllers', 's.js'), 'module.exports = async () => ({})\n');
}

function project(rbac = ''): string {
  const dir = makeTmpDir();
  app(dir, 'tuner', '[{ resources: [devices], verbs: [read] }]');
  app(dir, 'quiet', '[]');
  writeFileSync(join(dir, 'mdk.yaml'), [
    '# my stack', 'kind: Stack', 'apiVersion: mdk/v1', 'spec:', '  gateway:', '    port: 3847', '  apps:',
    '    - name: tuner', '      package: ./apps/tuner', '    - name: quiet', '      package: ./apps/quiet', '    - name: broken', '      package: ./apps/none',
    rbac,
  ].join('\n'));
  return dir;
}

describe('initPolicy', () => {
  it('binds the CLI, grants each app, and applies', async () => {
    const dir = project();
    applyMock.mockResolvedValue({ ok: true, local: { version: 'v' } });
    const res = await initPolicy(dir);
    expect(res.cli).toEqual({ roleCreated: true, bound: true });
    expect(res.gateway).toEqual({ roleCreated: true, bound: true });
    expect(res.mcp).toEqual({ roleCreated: false, bound: true });
    expect(res.apps.map((a) => [a.app, a.action])).toEqual([['tuner', 'add'], ['quiet', 'none'], ['broken', 'error']]);
    const { spec } = parse(readFileSync(join(dir, 'mdk.yaml'), 'utf8'));
    expect(spec.rbac.roles.map((r: { name: string }) => r.name)).toEqual(['admin', 'gateway', 'app-tuner']);
    expect(spec.rbac.roles[1]).toEqual({ name: 'gateway', rules: [{ resources: ['policy'], verbs: ['read'] }] });
    expect(spec.rbac.bindings).toEqual([
      { role: 'admin', subjects: [{ kind: 'ServiceAccount', name: 'mdk-cli' }] },
      { role: 'gateway', subjects: [{ kind: 'ServiceAccount', name: 'mdk-gateway' }] },
      { role: 'gateway', subjects: [{ kind: 'ServiceAccount', name: 'mdk-mcp' }] },
      { role: 'app-tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:tuner' }] },
    ]);
    expect(spec.apps[1].serviceAccount).toBe('app:quiet');
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).toContain('# my stack');
    expect(applyMock).toHaveBeenCalledWith(dir);
  });

  it('leaves a role the operator changed and reports it; a second run changes nothing', async () => {
    const dir = project('  rbac:\n    roles: [{ name: app-tuner, rules: [{ resources: [devices], verbs: [read], resourceNames: ["miner/*"] }] }]\n');
    applyMock.mockResolvedValue({ ok: false, message: 'Kernel down' });
    const res = await initPolicy(dir);
    expect(res.apps[0]).toMatchObject({ app: 'tuner', action: 'conflict', message: expect.stringMatching(/--accept-permissions/) });
    const after = readFileSync(join(dir, 'mdk.yaml'), 'utf8');
    expect(parse(after).spec.rbac.roles[0].rules[0].resourceNames).toEqual(['miner/*']);
    await initPolicy(dir);
    expect(readFileSync(join(dir, 'mdk.yaml'), 'utf8')).toBe(after);
  });
});
