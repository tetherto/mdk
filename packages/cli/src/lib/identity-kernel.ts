import { createRequire } from 'node:module';
import {
  createAgentCredential,
  listCredentials,
  parseAccount,
  readCredential,
  removeCredential,
  rotateCredential,
  signingCredential,
  type Credential,
} from './credentials.js';
import {
  isRefusal,
  withKernelClient,
  type IdentityServiceAccount,
  type IdentityUser,
  type KernelRefusal,
  type MdkClient,
} from './kernel-client.js';
import { applyStackRbac, type RbacApplyResult } from './rbac-kernel.js';
import { ADMIN_ROLE, bindSubject, type BindResult } from './rbac.js';

const require = createRequire(import.meta.url);

/**
 * `mdk user` and `mdk sa`: users live in the Kernel's token issuer (so their
 * commands need it running), service-account credentials live in this
 * instance's `.mdk/credentials` (registered with a running Kernel at once, and
 * with any Kernel at its next start).
 */

const KERNEL_TIMEOUT_MS = 10000;
const call = { timeout: KERNEL_TIMEOUT_MS };

interface MdkIdentity {
  checkPassword(password: string): void;
  createAssertion(opts: { name: string; privateKey: string }): string;
}
const mdkIdentity = (): MdkIdentity => require('@tetherto/mdk-identity') as MdkIdentity;
/** Throws ERR_IDENTITY_PASSWORD_WEAK before anything is sent. */
export function checkPassword(password: string): void {
  mdkIdentity().checkPassword(password);
}

export interface Outcome<T> {
  ok: boolean;
  value?: T;
  message?: string;
  errors?: string[];
}

const failed = <T>(message: string, errors?: string[]): Outcome<T> => ({ ok: false, message, ...(errors ? { errors } : {}) });

/** Runs one Kernel call, turning "down" and refusals into a failed outcome. */
async function kernelCall<T extends object>(projectDir: string, fn: (client: MdkClient) => Promise<T | KernelRefusal>): Promise<Outcome<T>> {
  const res = await withKernelClient(projectDir, fn);
  if ('down' in res) return failed(`${res.down}. Users live in the Kernel, so it must be running.`);
  if (isRefusal(res.value)) return failed(`the Kernel refused: ${res.value.error}`);
  return { ok: true, value: res.value as T };
}

// --- users ------------------------------------------------------------------

export interface AddUserOptions {
  name: string;
  email?: string;
  groups?: string[];
  password?: string;
  /** Also bind the user to the `admin` role in spec.rbac (written if missing) and apply it. */
  admin?: boolean;
}

export interface AddUserResult {
  created: boolean;
  user: IdentityUser;
  binding?: BindResult;
  applied?: RbacApplyResult;
}

/** Creates or updates a user; with `admin`, the bootstrap binding too. mdk.yaml changes only once the Kernel took the user. */
export async function addUser(projectDir: string, opts: AddUserOptions): Promise<Outcome<AddUserResult>> {
  if (opts.password !== undefined) checkPassword(opts.password);
  const res = await kernelCall<{ created: boolean; user: IdentityUser }>(projectDir, (client) =>
    client.upsertUser(
      {
        name: opts.name,
        ...(opts.email !== undefined ? { email: opts.email } : {}),
        ...(opts.groups?.length ? { groups: opts.groups } : {}),
        ...(opts.password !== undefined ? { password: opts.password } : {}),
      },
      call,
    ),
  );
  if (!res.ok || !res.value) return res as Outcome<AddUserResult>;
  const result: AddUserResult = { ...res.value };
  if (!opts.admin) return { ok: true, value: result };

  try {
    result.binding = bindSubject(projectDir, ADMIN_ROLE.name, { kind: 'User', name: opts.name });
  } catch (error) {
    const err = error as Error & { errors?: string[] };
    return { ok: false, value: result, message: `the user was saved, but the admin binding was not: ${err.message}`, ...(err.errors ? { errors: err.errors } : {}) };
  }
  result.applied = await applyStackRbac(projectDir);
  return { ok: result.applied.ok, value: result, ...(result.applied.ok ? {} : { message: result.applied.message }) };
}

export function setPassword(projectDir: string, name: string, password: string): Promise<Outcome<{ created: boolean; user: IdentityUser }>> {
  checkPassword(password);
  return kernelCall(projectDir, (client) => client.upsertUser({ name, password }, call));
}

export function setDisabled(projectDir: string, name: string, disabled: boolean): Promise<Outcome<{ created: boolean; user: IdentityUser }>> {
  return kernelCall(projectDir, (client) => client.upsertUser({ name, disabled }, call));
}

export function listUsers(projectDir: string): Promise<Outcome<{ users: IdentityUser[] }>> {
  return kernelCall(projectDir, (client) => client.listUsers(call));
}

export function removeUser(projectDir: string, name: string): Promise<Outcome<{ deleted: boolean }>> {
  return kernelCall(projectDir, (client) => client.deleteUser(name, call));
}

// --- service accounts -----------------------------------------------------

export interface AccountChange {
  credential: Credential | null;
  /** The running Kernel took the change; false: it was down and applies it at its next start. */
  registered: boolean;
  message?: string;
}

/** Hands a credential's public key to a running Kernel, if there is one. */
async function register(projectDir: string, credential: Credential): Promise<AccountChange> {
  const res = await withKernelClient(projectDir, (client) =>
    client.upsertServiceAccount({ name: credential.name, publicKey: credential.publicKey }, call),
  );
  if ('down' in res) return { credential, registered: false, message: `${res.down}; it is registered when the Kernel next starts` };
  if (isRefusal(res.value)) return { credential, registered: false, message: `the Kernel refused: ${res.value.error}` };
  return { credential, registered: true };
}

export async function addAgent(projectDir: string, name: string): Promise<AccountChange> {
  return register(projectDir, createAgentCredential(projectDir, name));
}

export async function rotateAccount(projectDir: string, name: string): Promise<AccountChange> {
  return register(projectDir, rotateCredential(projectDir, name));
}

/** Removes an agent's credential and its registration. An app's account goes with the app. */
export async function removeAgent(projectDir: string, name: string): Promise<AccountChange & { removed: boolean }> {
  if (parseAccount(name).kind === 'app') {
    throw new Error(`"${name}" belongs to an app: remove the app from spec.apps and its account goes at the next \`mdk run\`.`);
  }
  const removed = removeCredential(projectDir, name);
  const res = await withKernelClient(projectDir, (client) => client.deleteServiceAccount(name, call));
  if ('down' in res) return { removed, credential: null, registered: false, message: `${res.down}; it is removed when the Kernel next starts` };
  if (isRefusal(res.value)) return { removed, credential: null, registered: false, message: `the Kernel refused: ${res.value.error}` };
  return { removed, credential: null, registered: true };
}

export interface AccountRow {
  name: string;
  kind: 'app' | 'agent';
  /** This instance holds its credential. */
  local: boolean;
  /** Registered with the running Kernel; null when the Kernel is down. */
  registered: boolean | null;
  /** The registered key differs from the local credential (restart or `mdk sa rotate` to resync). */
  stale: boolean;
}

export async function listAccounts(projectDir: string): Promise<{ rows: AccountRow[]; kernel: 'up' | 'down'; message?: string }> {
  const local = listCredentials(projectDir);
  const res = await withKernelClient(projectDir, (client) => client.listServiceAccounts(call));
  const remote: IdentityServiceAccount[] | null = 'down' in res || isRefusal(res.value) ? null : res.value.serviceAccounts;

  const names = [...new Set([...local.map((c) => c.name), ...(remote ?? []).map((s) => s.name)])].sort();
  const rows = names.map((name): AccountRow => {
    const cred = local.find((c) => c.name === name);
    const reg = remote?.find((s) => s.name === name);
    return {
      name,
      kind: name.startsWith('app:') ? 'app' : 'agent',
      local: !!cred,
      registered: remote ? !!reg : null,
      stale: !!cred && !!reg && reg.publicKey !== cred.publicKey,
    };
  });
  const message = 'down' in res ? res.down : isRefusal(res.value) ? res.value.error : undefined;
  return { rows, kernel: remote ? 'up' : 'down', ...(message ? { message } : {}) };
}

/**
 * A bearer access token for a service account with a credential here (an AI
 * agent's, say, to configure its MCP client), signed in with its own key. Not
 * bound to this CLI, so it works over HTTP; it expires like any access token.
 */
export async function serviceAccountToken(
  projectDir: string,
  name: string,
): Promise<Outcome<{ accessToken: string; expiresIn: number; refreshToken: string; refreshExpiresIn: number }>> {
  const credential = readCredential(projectDir, name);
  if (!credential) return failed(`No credential for "${name}" here; create one with \`mdk sa add ${name}\`.`);
  const assertion = mdkIdentity().createAssertion(signingCredential(credential));
  const res = await withKernelClient(projectDir, (client) => client.serviceAccountToken(assertion, { bind: false }, call), { asService: true });
  if ('down' in res) return failed(res.down);
  if (isRefusal(res.value)) return failed(`the Kernel refused: ${res.value.error}`);
  return { ok: true, value: res.value };
}

export { readCredential };
