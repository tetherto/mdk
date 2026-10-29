import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  appGrantProblems,
  conflictMessage,
  grantApp,
  mdkRbac,
  planAppGrant,
  rbacProblems,
  rbacVersion,
  writeAppGrant,
  type GrantPlan,
} from '../../src/lib/rbac.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

afterEach(() => cleanupTmpDirs());

const TUNER = [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/*'] }];
const NARROW = [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/antminer-a/*'] }];

function project(spec: string): string {
  const dir = makeTmpDir();
  writeFileSync(join(dir, 'mdk.yaml'), `apiVersion: mdk/v1\nkind: Stack\nmetadata:\n  name: s\nspec:\n${spec}`);
  return dir;
}
const text = (dir: string) => readFileSync(join(dir, 'mdk.yaml'), 'utf8');
const yamlOf = (dir: string) => parse(text(dir));
const digest = (p: unknown[]) => mdkRbac().permissionsDigest(p);

const APP = '  apps:\n    - name: tuner\n      package: "@org/tuner"\n';
const ROLE = (rules: unknown[]) =>
  `  rbac:\n    roles:\n      - name: app-tuner\n        rules: ${JSON.stringify(rules)}\n` +
  '    bindings:\n      - role: app-tuner\n        subjects: [{ kind: ServiceAccount, name: "app:tuner" }]\n';

describe('rbacProblems / rbacVersion', () => {
  it('lists every problem in a policy, and none for a valid or absent one', () => {
    expect(rbacProblems(undefined)).toEqual([]);
    expect(rbacProblems({ roles: [{ name: 'r', rules: [{ resources: ['*'], verbs: ['get'] }] }] })).toEqual([]);
    const problems = rbacProblems({ enforcement: 'allow', bindings: [{ role: 'nope', subjects: [] }] });
    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatch(/spec\.rbac\.enforcement/);
  });

  it('versions a policy the way the Kernel records it', () => {
    expect(rbacVersion(null)).toBe(rbacVersion({}));
    expect(rbacVersion({ roles: [] })).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('planAppGrant', () => {
  it('adds a role for a first install, and grants nothing when nothing is requested', () => {
    const dir = project(APP);
    expect(planAppGrant(dir, 'tuner', TUNER)).toMatchObject({
      action: 'add',
      roleName: 'app-tuner',
      serviceAccount: 'app:tuner',
      digest: digest(TUNER),
      requested: { name: 'app-tuner', rules: TUNER },
      current: null,
    });
    expect(planAppGrant(dir, 'tuner', []).action).toBe('none');
  });

  it('leaves an operator-narrowed role alone while the package requests what it did before', () => {
    const dir = project(APP.replace('"@org/tuner"\n', `"@org/tuner"\n      permissionsDigest: ${digest(TUNER)}\n`) + ROLE(NARROW));
    expect(planAppGrant(dir, 'tuner', TUNER).action).toBe('keep');
  });

  it('only records the digest when the role already equals the request', () => {
    expect(planAppGrant(project(APP + ROLE(TUNER)), 'tuner', TUNER).action).toBe('record');
  });

  it('refuses a changed request until the operator accepts or keeps it', () => {
    const dir = project(APP.replace('"@org/tuner"\n', `"@org/tuner"\n      permissionsDigest: ${digest(NARROW)}\n`) + ROLE(NARROW));
    const plan = planAppGrant(dir, 'tuner', TUNER);
    expect(plan.action).toBe('conflict');
    expect(plan.current?.rules).toEqual(NARROW);
    expect(planAppGrant(dir, 'tuner', TUNER, { accept: true }).action).toBe('replace');
    expect(planAppGrant(dir, 'tuner', TUNER, { keep: true }).action).toBe('keep');
    expect(planAppGrant(dir, 'tuner', [], { accept: true }).action).toBe('remove');
    expect(planAppGrant(dir, 'tuner', []).action).toBe('conflict');
  });

  it('throws for ungrantable permissions or an invalid spec.rbac', () => {
    const dir = project(APP);
    expect(() => planAppGrant(dir, 'tuner', [{ resources: ['ops/x'], verbs: ['get'] }])).toThrow(/ERR_RBAC_APP_PERMISSIONS_INVALID/);
    expect(() => planAppGrant(dir, 'devices', [])).toThrow(/ERR_RBAC_APP_NAME_RESERVED/);
    try {
      planAppGrant(project(`${APP}  rbac:\n    enforcement: allow\n`), 'tuner', TUNER);
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toMatch(/spec\.rbac in mdk\.yaml is invalid/);
      expect((error as { errors: string[] }).errors[0]).toMatch(/enforcement/);
    }
  });

  it('plans against an empty stack when there is no mdk.yaml', () => {
    expect(planAppGrant(makeTmpDir(), 'tuner', TUNER).action).toBe('add');
  });
});

describe('writeAppGrant', () => {
  it('writes the role, binding and app entry fields, keeping comments', () => {
    const dir = project(`  # the apps\n${APP}  workers: []\n`);
    expect(writeAppGrant(dir, planAppGrant(dir, 'tuner', TUNER))).toBe(true);

    const doc = yamlOf(dir);
    expect(doc.spec.apps[0]).toMatchObject({ serviceAccount: 'app:tuner', permissionsDigest: digest(TUNER) });
    expect(doc.spec.rbac).toEqual({
      enforcement: 'deny',
      roles: [{ name: 'app-tuner', rules: TUNER }],
      bindings: [{ role: 'app-tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:tuner' }] }],
    });
    expect(text(dir)).toContain('# the apps');
    expect(rbacProblems(doc.spec.rbac)).toEqual([]);
  });

  it('replaces a role in place without duplicating its binding, and appends to flow lists in block style', () => {
    const dir = project(APP + ROLE(NARROW));
    writeAppGrant(dir, planAppGrant(dir, 'tuner', TUNER, { accept: true }));
    const { rbac } = yamlOf(dir).spec;
    expect(rbac.roles).toEqual([{ name: 'app-tuner', rules: TUNER }]);
    expect(rbac.bindings).toHaveLength(1);

    const flow = project(`${APP}  rbac:\n    roles: []\n    bindings: []\n`);
    writeAppGrant(flow, planAppGrant(flow, 'tuner', TUNER));
    expect(text(flow)).not.toMatch(/roles: \[/);
    expect(yamlOf(flow).spec.rbac.enforcement).toBe('deny');
  });

  it('removes the role and every binding to it', () => {
    const dir = project(APP + ROLE(TUNER).replace('    bindings:\n', '    bindings:\n      - role: app-tuner\n        subjects: [{ kind: User, name: a@b.c }]\n'));
    writeAppGrant(dir, planAppGrant(dir, 'tuner', [], { accept: true }));
    const { rbac } = yamlOf(dir).spec;
    expect(rbac.roles).toEqual([]);
    expect(rbac.bindings).toEqual([]);
  });

  it('records only the digest for keep, record and none', () => {
    const dir = project(APP + ROLE(NARROW));
    const before = yamlOf(dir).spec.rbac;
    writeAppGrant(dir, planAppGrant(dir, 'tuner', TUNER, { keep: true }));
    expect(yamlOf(dir).spec.rbac).toEqual(before);
    expect(yamlOf(dir).spec.apps[0].permissionsDigest).toBe(digest(TUNER));
  });

  it('refuses a conflict, and reports false without a file or app entry', () => {
    const dir = project(APP + ROLE(NARROW));
    const conflict = planAppGrant(dir, 'tuner', TUNER);
    expect(() => writeAppGrant(dir, conflict)).toThrow(/conflicting/);
    const add = { ...conflict, action: 'add' } as GrantPlan;
    expect(writeAppGrant(makeTmpDir(), add)).toBe(false);
    expect(writeAppGrant(project('  apps: []\n'), add)).toBe(false);
  });
});

describe('conflictMessage', () => {
  it('shows both rule sets and the two ways forward', () => {
    const dir = project(APP + ROLE(NARROW));
    const msg = conflictMessage(planAppGrant(dir, 'tuner', TUNER), '@org/tuner');
    expect(msg).toContain('role "app-tuner"');
    expect(msg).toContain('miner/antminer/antminer-a/*');
    expect(msg).toContain('miner/antminer/*');
    expect(msg).toContain('--accept-permissions');
    expect(msg).toContain('--keep-permissions');
    expect(conflictMessage(planAppGrant(dir, 'tuner', []), '@org/tuner')).toContain('(nothing)');
  });
});

describe('bindSubject', () => {
  it('binds once, writing the admin role only when missing', async () => {
    const { bindSubject } = await import('../../src/lib/rbac.js');
    const dir = project(APP);
    expect(bindSubject(dir, 'admin', { kind: 'User', name: 'ankit' })).toEqual({ roleCreated: true, bound: true });
    expect(bindSubject(dir, 'admin', { kind: 'User', name: 'ankit' })).toEqual({ roleCreated: false, bound: false });
    expect(bindSubject(dir, 'admin', { kind: 'Group', name: 'ops' })).toEqual({ roleCreated: false, bound: true });
    expect(yamlOf(dir).spec.rbac.bindings).toHaveLength(2);
    expect(() => bindSubject(dir, 'viewer', { kind: 'User', name: 'x' })).toThrow(/no role named "viewer"/);
    expect(() => bindSubject(makeTmpDir(), 'admin', { kind: 'User', name: 'x' })).toThrow(/No mdk\.yaml/);
  });

  it('keeps an existing admin role as the operator wrote it', async () => {
    const { bindSubject } = await import('../../src/lib/rbac.js');
    const dir = project(`${APP}  rbac:\n    roles:\n      - name: admin\n        rules: [{ resources: ["ops-center/*"], verbs: ["*"] }]\n`);
    expect(bindSubject(dir, 'admin', { kind: 'User', name: 'ankit' })).toEqual({ roleCreated: false, bound: true });
    expect(yamlOf(dir).spec.rbac.roles[0].rules[0].resources).toEqual(['ops-center/*']);
  });
});

describe('appGrantProblems', () => {
  const CLI = '  rbac:\n    roles: [{ name: admin, rules: [{ resources: ["*"], verbs: ["*"] }] }]\n' +
    '    bindings: [{ role: admin, subjects: [{ kind: ServiceAccount, name: mdk-cli }] }]\n';

  it('reports a policy that binds nobody, a missing role, a changed request and a missing binding', () => {
    expect(appGrantProblems(project(APP), 'tuner', TUNER)).toEqual([expect.stringMatching(/binds nobody.*mdk rbac init.*mdk run/)]);
    expect(appGrantProblems(project(APP + CLI), 'tuner', TUNER)).toEqual([expect.stringMatching(/no role "app-tuner".*mdk rbac init/)]);
    expect(appGrantProblems(project(APP + ROLE(NARROW)), 'tuner', TUNER)).toEqual([
      expect.stringMatching(/role "app-tuner".*differs.*--accept-permissions or --keep-permissions/),
    ]);
    const unbound = ROLE(TUNER).replace('name: "app:tuner"', 'name: "app:other"');
    expect(appGrantProblems(project(APP + unbound), 'tuner', TUNER)).toEqual([expect.stringMatching(/binds app:tuner to nothing/)]);
  });

  it('is quiet for a granted app, a role kept on purpose, and an app that requests nothing', () => {
    expect(appGrantProblems(project(APP + ROLE(TUNER)), 'tuner', TUNER)).toEqual([]);
    const kept = `${APP}      permissionsDigest: ${digest(TUNER)}\n${ROLE(NARROW)}`;
    expect(appGrantProblems(project(kept), 'tuner', TUNER)).toEqual([]);
    expect(appGrantProblems(project(APP + CLI), 'tuner', [])).toEqual([]);
    // Nothing requested, nothing to check: even on a stack that binds nobody.
    expect(appGrantProblems(project(APP), 'tuner', [])).toEqual([]);
  });

  it('grantApp plans and writes in one step, and leaves a conflict unwritten', () => {
    const dir = project(APP + CLI);
    expect(grantApp(dir, 'tuner', TUNER)).toEqual({ action: 'add', role: 'app-tuner', serviceAccount: 'app:tuner', written: true });
    expect(yamlOf(dir).spec.rbac.roles.map((r: { name: string }) => r.name)).toEqual(['admin', 'app-tuner']);
    // The same request again is kept (the digest matches); a changed one, once the digest is gone, is a conflict.
    expect(grantApp(dir, 'tuner', TUNER)).toMatchObject({ action: 'keep', written: true });
    writeFileSync(join(dir, 'mdk.yaml'), text(dir).replace(/ +permissionsDigest: .*\n/, ''));
    expect(grantApp(dir, 'tuner', NARROW)).toMatchObject({ action: 'conflict', written: false });
    expect(yamlOf(dir).spec.rbac.roles[1].rules).toEqual(TUNER);
    expect(() => grantApp(dir, 'actions', TUNER)).toThrow(/ERR_RBAC_APP_NAME_RESERVED/);
  });

  it('reports a request the policy cannot grant, in one line', () => {
    const problems = appGrantProblems(project(APP + CLI), 'tuner', [{ resources: ['telemetry'], verbs: ['read'] }]);
    expect(problems).toEqual([expect.stringMatching(/^mdk\.yaml: ERR_RBAC_APP_PERMISSIONS_INVALID: tuner$/)]);
  });
});
