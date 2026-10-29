import { createRequire } from 'node:module';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mdkDir } from './runtime.js';
import type { StackSpec } from './spec.js';

const require = createRequire(import.meta.url);

/**
 * Service-account credentials for this instance: an Ed25519 keypair per app
 * (`app:<name>`) and per AI agent. The private key never leaves the project's
 * `.mdk/credentials` (0700 dir, 0600 files) and is never part of a package; the
 * Kernel only learns the public key, from the list `mdk run` hands it at boot
 * (or `mdk sa` while it runs).
 *
 *   .mdk/credentials/apps/<app>.json     { name: "app:<app>", publicKey, privateKeyPem, createdAt }
 *   .mdk/credentials/agents/<name>.json  { name: "<name>", ... }
 */

interface MdkIdentity {
  generateCredential(): { publicKey: string; privateKeyPem: string };
}
function mdkIdentity(): MdkIdentity {
  return require('@tetherto/mdk-identity') as MdkIdentity;
}

export type CredentialKind = 'app' | 'agent';

export interface Credential {
  /** The service account: `app:<name>` or the agent's name. */
  name: string;
  kind: CredentialKind;
  publicKey: string;
  createdAt: string;
  file: string;
}

interface CredentialFile {
  name: string;
  publicKey: string;
  privateKeyPem: string;
  createdAt: string;
}

/** An agent's name: lowercase letters, digits and dashes (an app's account is `app:<app>`). */
export const AGENT_NAME = /^[a-z][a-z0-9-]{0,62}$/;

/**
 * The account the `mdk` CLI signs in to the Kernel as. It is an ordinary agent
 * account: it may do what spec.rbac binds it to (`mdk rbac init` binds it to
 * `admin`), nothing more.
 */
export const CLI_ACCOUNT = 'mdk-cli';

/**
 * The account a Gateway in its own process signs in to the Kernel as, to read
 * the policy it enforces (`policy: read`, bound by `mdk rbac init`).
 */
export const GATEWAY_ACCOUNT = 'mdk-gateway';

/** The account the MCP server signs in to the Kernel as, to read the policy it enforces on agents. */
export const MCP_ACCOUNT = 'mdk-mcp';

export function credentialsDir(projectDir: string): string {
  return join(mdkDir(projectDir), 'credentials');
}

function fileFor(projectDir: string, kind: CredentialKind, short: string): string {
  return join(credentialsDir(projectDir), kind === 'app' ? 'apps' : 'agents', `${short}.json`);
}

function read(file: string, kind: CredentialKind): Credential | null {
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, 'utf8')) as CredentialFile;
  return { name: data.name, kind, publicKey: data.publicKey, createdAt: data.createdAt, file };
}

function write(file: string, name: string): Credential {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(dirname(dirname(file)), 0o700);
  const { publicKey, privateKeyPem } = mdkIdentity().generateCredential();
  const createdAt = new Date().toISOString();
  const body: CredentialFile = { name, publicKey, privateKeyPem, createdAt };
  // Written fresh (no `wx`): rotation replaces the file in place.
  writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  return { name, kind: name.startsWith('app:') ? 'app' : 'agent', publicKey, createdAt, file };
}

/** Splits `app:<app>` / `<agent>` into kind and file name, or throws for a name that is neither. */
export function parseAccount(name: string): { kind: CredentialKind; short: string } {
  if (name.startsWith('app:')) {
    const short = name.slice(4);
    if (/^[a-z][a-z0-9-]*$/.test(short)) return { kind: 'app', short };
  } else if (AGENT_NAME.test(name)) {
    return { kind: 'agent', short: name };
  }
  throw new Error(`"${name}" is not a service account name: use app:<app> or an agent name of lowercase letters, digits and dashes.`);
}

export function readCredential(projectDir: string, name: string): Credential | null {
  const { kind, short } = parseAccount(name);
  return read(fileFor(projectDir, kind, short), kind);
}

/** The app's credential, created on first use. */
export function ensureAppCredential(projectDir: string, appName: string): Credential & { created: boolean } {
  const file = fileFor(projectDir, 'app', appName);
  const existing = read(file, 'app');
  if (existing) return { ...existing, created: false };
  return { ...write(file, `app:${appName}`), created: true };
}

/** An agent's credential, created on first use. */
export function ensureAgentCredential(projectDir: string, name: string): Credential & { created: boolean } {
  const { kind, short } = parseAccount(name);
  if (kind !== 'agent') throw new Error(`"${name}" is not an agent account.`);
  const file = fileFor(projectDir, 'agent', short);
  const existing = read(file, 'agent');
  if (existing) return { ...existing, created: false };
  return { ...write(file, name), created: true };
}

/** What a Kernel client signs in with: the account name and its private key. */
export function signingCredential(credential: Credential): { name: string; privateKey: string } {
  const body = JSON.parse(readFileSync(credential.file, 'utf8')) as CredentialFile;
  return { name: body.name, privateKey: body.privateKeyPem };
}

/** A new agent credential; throws when one exists (rotate it instead). */
export function createAgentCredential(projectDir: string, name: string): Credential {
  const { kind, short } = parseAccount(name);
  if (kind !== 'agent') throw new Error(`An app's credential is created by \`mdk add app\`; rotate it with \`mdk sa rotate ${name}\`.`);
  const file = fileFor(projectDir, 'agent', short);
  if (existsSync(file)) throw new Error(`Service account "${name}" already has a credential (${file}); rotate it with \`mdk sa rotate ${name}\`.`);
  return write(file, name);
}

/** Replaces a credential's keypair; the Kernel then ends the old key's sessions. */
export function rotateCredential(projectDir: string, name: string): Credential {
  const { kind, short } = parseAccount(name);
  const file = fileFor(projectDir, kind, short);
  if (!existsSync(file)) throw new Error(`No credential for "${name}" in ${credentialsDir(projectDir)}.`);
  return write(file, name);
}

export function removeCredential(projectDir: string, name: string): boolean {
  const { kind, short } = parseAccount(name);
  const file = fileFor(projectDir, kind, short);
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}

export function listCredentials(projectDir: string): Credential[] {
  const out: Credential[] = [];
  for (const kind of ['app', 'agent'] as const) {
    const dir = join(credentialsDir(projectDir), kind === 'app' ? 'apps' : 'agents');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const c = read(join(dir, f), kind);
      if (c) out.push(c);
    }
  }
  return out;
}

/**
 * The service accounts the Kernel registers at boot: every app in the stack
 * (its credential created if missing, say for an app added to mdk.yaml by
 * hand), the CLI's own account, and every agent with a credential. An app no longer in the stack is
 * left out, so its account is removed.
 */
export function stackServiceAccounts(projectDir: string, spec: StackSpec): Array<{ name: string; publicKey: string }> {
  ensureAgentCredential(projectDir, CLI_ACCOUNT);
  ensureAgentCredential(projectDir, GATEWAY_ACCOUNT);
  ensureAgentCredential(projectDir, MCP_ACCOUNT);
  const apps = spec.spec.apps.map((a) => ensureAppCredential(projectDir, a.name));
  const agents = listCredentials(projectDir).filter((c) => c.kind === 'agent');
  return [...apps, ...agents].map(({ name, publicKey }) => ({ name, publicKey }));
}
