import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMap, isSeq, parse as parseYaml, parseDocument, stringify as toYaml, YAMLMap, YAMLSeq, type Document } from 'yaml';

const require = createRequire(import.meta.url);

/**
 * `spec.rbac` in mdk.yaml: the only place policy is written. Validation and
 * evaluation live in @tetherto/mdk-rbac (shared with the Kernel, Gateway and MCP
 * server); this module is the CLI's side: checking the stack file, and the role
 * and binding `mdk add app` writes for an app's own service account.
 */

// --- @tetherto/mdk-rbac (typeless CommonJS, lazily required) ----------------

export interface RbacRule {
  resources: string[];
  verbs: string[];
  resourceNames?: string[];
}
export interface RbacRole {
  name: string;
  rules: RbacRule[];
}
export interface RbacSubject {
  kind: 'User' | 'Group' | 'ServiceAccount';
  name: string;
}
export interface RbacBinding {
  role: string;
  subjects: RbacSubject[];
}
export interface RbacPolicy {
  enforcement?: 'deny';
  roles?: RbacRole[];
  bindings?: RbacBinding[];
}
interface AppGrant {
  serviceAccount: string;
  role: RbacRole | null;
  binding: RbacBinding | null;
}
interface MdkRbac {
  validatePolicy(rbac: unknown, at?: string): Required<RbacPolicy>;
  compilePolicy(rbac: unknown): { version: string };
  appGrant(appName: string, permissions: unknown[]): AppGrant;
  validateAppPermissions(permissions: unknown, at?: string): string[];
  permissionsDigest(permissions: unknown[]): string;
  serviceAccountFor(appName: string): string;
  roleNameFor(appName: string): string;
}

export function mdkRbac(): MdkRbac {
  return require('@tetherto/mdk-rbac') as MdkRbac;
}

/** Every problem with `rbac` (spec.rbac), or `[]`. */
export function rbacProblems(rbac: unknown): string[] {
  try {
    mdkRbac().validatePolicy(rbac);
    return [];
  } catch (error) {
    const errors = (error as { errors?: string[] }).errors;
    if (errors) return errors;
    throw error;
  }
}

/** The version the Kernel will record for `rbac` (a digest of the normalized policy). */
export function rbacVersion(rbac: unknown): string {
  return mdkRbac().compilePolicy(rbac).version;
}

// --- install grants ---------------------------------------------------------

/**
 * What `mdk add app` does to spec.rbac for one app:
 *   - add      no `app-<name>` role yet: write the requested role and its binding
 *   - keep     the package requests what it did at the last install: the role is
 *              the operator's now (narrowed, or removed) and is left alone
 *   - record   the role already equals the request: only record the digest
 *   - replace  the request changed and the operator accepted it (--accept-permissions)
 *   - remove   the package now requests nothing and the operator accepted it
 *   - conflict the request changed: refused until --accept-permissions or --keep-permissions
 *   - none     nothing requested, nothing to grant
 */
export type GrantAction = 'add' | 'keep' | 'record' | 'replace' | 'remove' | 'conflict' | 'none';

export interface GrantPlan {
  action: GrantAction;
  appName: string;
  serviceAccount: string;
  roleName: string;
  digest: string;
  /** The role to write (null when the app requests nothing). */
  requested: RbacRole | null;
  /** The `app-<name>` role in mdk.yaml now, if any. */
  current: RbacRole | null;
}

/** What granting an app did to its role in spec.rbac, as every command that grants one reports it. */
export interface GrantSummary {
  action: GrantAction;
  role: string;
  serviceAccount: string;
  written: boolean;
}

export interface GrantChoice {
  /** Replace an operator-edited role with what the package now requests. */
  accept?: boolean;
  /** Keep the role in mdk.yaml as it is, and stop asking for this request. */
  keep?: boolean;
}

interface StackDoc {
  spec?: { apps?: Array<Record<string, unknown>>; rbac?: RbacPolicy };
}

function readStack(dir: string): StackDoc {
  const file = resolve(dir, 'mdk.yaml');
  return existsSync(file) ? ((parseYaml(readFileSync(file, 'utf8')) ?? {}) as StackDoc) : {};
}

const sameRules = (a: RbacRule[], b: RbacRule[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Decides what installing `appName` with `permissions` does to spec.rbac. Throws
 * when the permissions are not grantable (a non-Kernel resource, a reserved name),
 * or when spec.rbac is already invalid, since nothing should be written into it.
 */
export function planAppGrant(dir: string, appName: string, permissions: unknown[], choice: GrantChoice = {}): GrantPlan {
  const rbac = mdkRbac();
  const grant = rbac.appGrant(appName, permissions);
  const stack = readStack(dir);

  const problems = rbacProblems(stack.spec?.rbac);
  if (problems.length) {
    throw Object.assign(new Error('spec.rbac in mdk.yaml is invalid; fix it before adding an app.'), { errors: problems });
  }

  const roleName = rbac.roleNameFor(appName);
  const digest = rbac.permissionsDigest(permissions);
  const current = stack.spec?.rbac?.roles?.find((r) => r.name === roleName) ?? null;
  const entry = stack.spec?.apps?.find((a) => a.name === appName);
  const base = { appName, serviceAccount: grant.serviceAccount, roleName, digest, requested: grant.role, current };

  if (entry?.permissionsDigest === digest) return { ...base, action: 'keep' };
  if (!current) return { ...base, action: grant.role ? 'add' : 'none' };
  if (grant.role && sameRules(current.rules, grant.role.rules)) return { ...base, action: 'record' };
  if (choice.keep) return { ...base, action: 'keep' };
  if (choice.accept) return { ...base, action: grant.role ? 'replace' : 'remove' };
  return { ...base, action: 'conflict' };
}

/** The refusal for a `conflict` plan: both rule sets, and the two ways forward. */
export function conflictMessage(plan: GrantPlan, reference: string): string {
  const show = (rules: RbacRule[] | undefined): string =>
    rules?.length
      ? toYaml(rules).trimEnd().split('\n').map((l) => `      ${l}`).join('\n')
      : '      (nothing)';
  return [
    `${reference} now requests different Kernel access than role "${plan.roleName}" in spec.rbac grants; mdk.yaml was not changed.`,
    '    in mdk.yaml:',
    show(plan.current?.rules),
    `    ${reference} requests:`,
    show(plan.requested?.rules),
    'Re-run with --accept-permissions to grant exactly what it requests (any narrowing you made is replaced),',
    'or with --keep-permissions to keep the role as it is.',
  ].join('\n');
}

function block(seq: unknown): seq is YAMLSeq {
  if (!isSeq(seq)) return false;
  // `[]` is a flow sequence: anything added would render inline.
  seq.flow = false;
  return true;
}

function ensureSeq(doc: Document, path: string[]): YAMLSeq {
  const existing = doc.getIn(path);
  if (block(existing)) return existing;
  const seq = new YAMLSeq();
  doc.setIn(path, seq);
  return seq;
}

function hasBinding(bindings: YAMLSeq, role: string, serviceAccount: string): boolean {
  return bindings.items.some((b) => {
    if (!isMap(b) || b.get('role') !== role) return false;
    const subjects = b.get('subjects');
    return isSeq(subjects) && subjects.items.some((s) => isMap(s) && s.get('kind') === 'ServiceAccount' && s.get('name') === serviceAccount);
  });
}

/**
 * Writes a plan into `<dir>/mdk.yaml` through the parsed document, so the
 * operator's comments and formatting survive: the app entry's `serviceAccount`
 * and `permissionsDigest`, and for add/replace/remove the role and its binding.
 * The app entry must already exist. Returns false when nothing could be written.
 */
export function writeAppGrant(dir: string, plan: GrantPlan): boolean {
  if (plan.action === 'conflict') throw new Error(`refusing to write a conflicting grant for ${plan.appName}`);
  const file = resolve(dir, 'mdk.yaml');
  if (!existsSync(file)) return false;

  const doc = parseDocument(readFileSync(file, 'utf8'));
  const apps = doc.getIn(['spec', 'apps']);
  const entry = isSeq(apps) ? apps.items.find((a): a is YAMLMap => isMap(a) && a.get('name') === plan.appName) : undefined;
  if (!entry) return false;
  entry.set('serviceAccount', plan.serviceAccount);
  entry.set('permissionsDigest', plan.digest);

  if (plan.action === 'add' || plan.action === 'replace') {
    if (!doc.hasIn(['spec', 'rbac', 'enforcement'])) doc.setIn(['spec', 'rbac', 'enforcement'], 'deny');
    const roles = ensureSeq(doc, ['spec', 'rbac', 'roles']);
    const node = doc.createNode(plan.requested);
    const at = roles.items.findIndex((r) => isMap(r) && r.get('name') === plan.roleName);
    if (at === -1) roles.add(node);
    else roles.items[at] = node;

    const bindings = ensureSeq(doc, ['spec', 'rbac', 'bindings']);
    if (!hasBinding(bindings, plan.roleName, plan.serviceAccount)) {
      bindings.add(doc.createNode({ role: plan.roleName, subjects: [{ kind: 'ServiceAccount', name: plan.serviceAccount }] }));
    }
  } else if (plan.action === 'remove') {
    const roles = doc.getIn(['spec', 'rbac', 'roles']);
    if (isSeq(roles)) roles.items = roles.items.filter((r) => !(isMap(r) && r.get('name') === plan.roleName));
    // A binding to a role that no longer exists would make spec.rbac invalid.
    const bindings = doc.getIn(['spec', 'rbac', 'bindings']);
    if (isSeq(bindings)) bindings.items = bindings.items.filter((b) => !(isMap(b) && b.get('role') === plan.roleName));
  }

  writeFileSync(file, doc.toString(), 'utf8');
  return true;
}

/**
 * Grants `appName` what it requests in `<dir>/mdk.yaml`, as `mdk add app`,
 * `mdk create app`, `mdk onboard` and `mdk rbac init` all do: plans the grant
 * and writes it, unless the request changed since the role was written (a
 * conflict, left for --accept-permissions or --keep-permissions). Throws what
 * planAppGrant throws: an invalid policy, a reserved or invalid app name,
 * permissions the policy cannot grant.
 */
export function grantApp(dir: string, appName: string, permissions: unknown[], choice: GrantChoice = {}): GrantSummary {
  const plan = planAppGrant(dir, appName, permissions, choice);
  const written = plan.action !== 'conflict' && writeAppGrant(dir, plan);
  return { action: plan.action, role: plan.roleName, serviceAccount: plan.serviceAccount, written };
}

/**
 * What keeps the app from getting the Kernel access it requests, in `<dir>/mdk.yaml`:
 * a spec.rbac that binds nobody (the Kernel refuses every call, and the fix is
 * `mdk rbac init` before `mdk run`), no role for the app yet, a role that differs
 * from the request and was not kept on purpose, or a role whose service account
 * is bound to nothing. `mdk validate app <name>` reports these; `[]` when the
 * grant is in order, or the app requests nothing.
 */
export function appGrantProblems(dir: string, appName: string, permissions: unknown[]): string[] {
  if (!permissions.length) return [];
  let plan: GrantPlan;
  try {
    plan = planAppGrant(dir, appName, permissions);
  } catch (error) {
    return [`mdk.yaml: ${(error instanceof Error ? error.message : String(error)).split('\n')[0]}`];
  }
  const bindings = readStack(dir).spec?.rbac?.bindings ?? [];
  if (!bindings.length) {
    return ['mdk.yaml: spec.rbac binds nobody, so the Kernel refuses every call. Run `mdk rbac init`, then `mdk run`.'];
  }
  const problems: string[] = [];
  if (plan.action === 'add') {
    problems.push(`mdk.yaml: spec.rbac has no role "${plan.roleName}" granting ${appName} the Kernel access mdk-app.yaml requests. Run \`mdk rbac init\`.`);
  } else if (plan.action === 'conflict') {
    problems.push(
      `mdk.yaml: role "${plan.roleName}" in spec.rbac differs from what mdk-app.yaml now requests. ` +
        'Update the role, remove it and run `mdk rbac init`, or re-add the app with --accept-permissions or --keep-permissions.',
    );
  }
  const bound = bindings.some((b) => b.subjects.some((s) => s.kind === 'ServiceAccount' && s.name === plan.serviceAccount));
  if (plan.current && !bound) {
    problems.push(`mdk.yaml: spec.rbac binds ${plan.serviceAccount} to nothing, so the Kernel refuses the app's calls.`);
  }
  return problems;
}

// --- bootstrap: the first admin ----------------------------------------------

/** Full access: an ordinary role holding wildcards, nothing special to the evaluator. */
export const ADMIN_ROLE: RbacRole = { name: 'admin', rules: [{ resources: ['*'], verbs: ['*'] }] };

/** What a Gateway in its own process needs from the Kernel: to read the policy it enforces. */
export const GATEWAY_ROLE: RbacRole = { name: 'gateway', rules: [{ resources: ['policy'], verbs: ['read'] }] };

/** Roles bindSubject writes when they are missing. */
const BUILTIN_ROLES: Record<string, RbacRole> = { [ADMIN_ROLE.name]: ADMIN_ROLE, [GATEWAY_ROLE.name]: GATEWAY_ROLE };

export interface BindResult {
  /** The role (`admin` or `gateway`) was missing and was written. */
  roleCreated: boolean;
  /** A new binding was written (false: the subject already had it). */
  bound: boolean;
}

/**
 * Binds `subject` to `role` in `<dir>/mdk.yaml`, through the parsed document so
 * comments survive. Binding to `admin` or `gateway` writes ADMIN_ROLE or
 * GATEWAY_ROLE when no role of that name exists; any other role must already exist. The result must still be a
 * valid spec.rbac, or nothing is written.
 */
export function bindSubject(dir: string, role: string, subject: RbacSubject): BindResult {
  const file = resolve(dir, 'mdk.yaml');
  if (!existsSync(file)) throw new Error(`No mdk.yaml in ${dir}.`);
  const doc = parseDocument(readFileSync(file, 'utf8'));
  if (!doc.hasIn(['spec', 'rbac', 'enforcement'])) doc.setIn(['spec', 'rbac', 'enforcement'], 'deny');

  const roles = ensureSeq(doc, ['spec', 'rbac', 'roles']);
  let roleCreated = false;
  if (!roles.items.some((r) => isMap(r) && r.get('name') === role)) {
    const builtin = BUILTIN_ROLES[role];
    if (!builtin) throw new Error(`spec.rbac has no role named "${role}".`);
    roles.add(doc.createNode(builtin));
    roleCreated = true;
  }

  const bindings = ensureSeq(doc, ['spec', 'rbac', 'bindings']);
  const already = bindings.items.some((b) => {
    if (!isMap(b) || b.get('role') !== role) return false;
    const subjects = b.get('subjects');
    return isSeq(subjects) && subjects.items.some((s) => isMap(s) && s.get('kind') === subject.kind && s.get('name') === subject.name);
  });
  if (!already) bindings.add(doc.createNode({ role, subjects: [subject] }));

  const problems = rbacProblems((doc.toJS() as StackDoc).spec?.rbac);
  if (problems.length) {
    throw Object.assign(new Error('spec.rbac would be invalid; mdk.yaml was not changed.'), { errors: problems });
  }
  if (roleCreated || !already) writeFileSync(file, doc.toString(), 'utf8');
  return { roleCreated, bound: !already };
}
