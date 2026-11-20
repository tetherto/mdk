import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLI_ACCOUNT, ensureAgentCredential, signingCredential } from './credentials.js';
import { readSession, sessionTokenSource, type IssuedTokens } from './session.js';
import { kernelKeyFile, localDiscovery, mdkDir, projectDht, trustedKeysDir, type CallerKeyPair } from './runtime.js';

const require = createRequire(import.meta.url);

// --- @tetherto/mdk-client (typeless CommonJS, lazily required) --------------

export interface RegisteredWorker {
  workerId: string;
  state?: string;
  healthState?: string;
  deviceIds?: string[];
  deviceCount?: number;
}
export interface KernelStatus {
  workers: RegisteredWorker[];
  totalDevices: number;
}
/** The spec.rbac record the Kernel enforces (see PolicyStore in @tetherto/mdk-rbac). */
export interface RbacRecord {
  version: string;
  appliedAt: string;
  source: string;
  by?: string;
  previous: string | null;
  policy: unknown;
}
/** A Kernel reply that refused the request. */
export interface KernelRefusal {
  error: string;
  errors?: string[];
}
/** A user as the Kernel's issuer reports it (no password hash ever leaves it). */
export interface IdentityUser {
  name: string;
  email?: string;
  groups: string[];
  disabled: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface IdentityServiceAccount {
  name: string;
  kind: 'app' | 'agent';
  publicKey: string;
  createdAt: string;
  updatedAt: string;
}
type Reply<T> = Promise<T | KernelRefusal>;
type CallOpts = Record<string, unknown>;

export interface MdkClient {
  connect(opts?: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
  getStatus(opts?: Record<string, unknown>): Promise<KernelStatus>;
  getRbac(opts?: Record<string, unknown>): Promise<{ record: RbacRecord | null } | KernelRefusal>;
  applyRbac(
    rbac: unknown,
    opts?: Record<string, unknown>,
  ): Promise<{ changed: boolean; version: string; appliedAt: string; previous?: string | null } | KernelRefusal>;
  listUsers(opts?: CallOpts): Reply<{ users: IdentityUser[] }>;
  upsertUser(
    user: { name: string; email?: string | null; groups?: string[]; password?: string; disabled?: boolean },
    opts?: CallOpts,
  ): Reply<{ created: boolean; user: IdentityUser }>;
  deleteUser(name: string, opts?: CallOpts): Reply<{ deleted: boolean }>;
  listServiceAccounts(opts?: CallOpts): Reply<{ serviceAccounts: IdentityServiceAccount[] }>;
  upsertServiceAccount(
    sa: { name: string; publicKey: string },
    opts?: CallOpts,
  ): Reply<{ created: boolean; changed: boolean; serviceAccount: IdentityServiceAccount }>;
  deleteServiceAccount(name: string, opts?: CallOpts): Reply<{ deleted: boolean }>;
  login(username: string, password: string, opts?: CallOpts): Reply<IssuedTokens & { tokenType: string }>;
  refreshToken(refreshToken: string, opts?: CallOpts): Reply<IssuedTokens & { tokenType: string }>;
  logout(refreshToken: string, opts?: CallOpts): Reply<{ revoked: boolean }>;
  serviceAccountToken(assertion: string, bind?: { bind?: boolean }, opts?: CallOpts): Reply<IssuedTokens & { tokenType: string }>;
  /** The issuer's public keys. A sign-in action: it carries no token, so it answers whatever the session holds. */
  getJwks(opts?: CallOpts): Reply<unknown>;
}
interface MdkClientModule {
  /** Reads the Kernel key from `config.kernelKey`; without one every call fails with ERR_MDK_CLIENT_UNAVAILABLE. */
  createMdkClient(
    config: {
      kernelKey: string;
      kernelKeyPair?: CallerKeyPair;
      kernelCredential?: { name: string; privateKey: string };
      /** Private DHT (spec.network.dht): where the client's DHT node joins and binds. */
      kernelBootstrap?: string[];
      kernelDhtHost?: string;
    },
    opts?: { tokenSource?: { getToken(): Promise<string>; reset(): void } },
  ): MdkClient;
}

function mdkClientModule(): MdkClientModule {
  return require('@tetherto/mdk-client') as MdkClientModule;
}

/**
 * A client for the project's Kernel, dialing as the CLI's persistent identity.
 * The Kernel admits only known callers, so the identity is published to the
 * trusted-keys dir first (the one write); a newly published key is admitted
 * once the Kernel's trusted-keys watcher sees it, so connect with `warmup`.
 * Every request carries an access token: the signed-in user's while a session
 * exists (`mdk login`), else the CLI's own service account (`mdk-cli`). Either
 * way the CLI may do exactly what spec.rbac binds that identity to.
 * The client owns its own DHT node: always close it.
 */
export function cliKernelClient(projectDir: string, kernelKey: string, { asService = false } = {}): MdkClient {
  const discovery = localDiscovery();
  const kernelKeyPair = discovery.callerKeyPair(join(mdkDir(projectDir), 'cli', 'identity'));
  discovery.publishTrustedKey(trustedKeysDir(projectDir), 'cli', kernelKeyPair.publicKey);
  const mdk = mdkClientModule();
  const { bootstrap, dhtHost } = projectDht(projectDir);
  const dht = { ...(bootstrap ? { kernelBootstrap: bootstrap } : {}), ...(dhtHost ? { kernelDhtHost: dhtHost } : {}) };
  if (!asService && readSession(projectDir)) {
    // Sign-in actions carry no token, so the session renews through this same client.
    let client: MdkClient | null = null;
    const tokenSource = sessionTokenSource(projectDir, (rt) => client!.refreshToken(rt));
    client = mdk.createMdkClient({ kernelKey, kernelKeyPair, ...dht }, { tokenSource });
    return client;
  }
  const kernelCredential = signingCredential(ensureAgentCredential(projectDir, CLI_ACCOUNT));
  return mdk.createMdkClient({ kernelKey, kernelKeyPair, kernelCredential, ...dht });
}

// Bounds each warmup try: a Kernel that stopped leaves its key file behind, and
// a DHT lookup for it can otherwise take the transport's full 30 s, three times.
const WARMUP_TIMEOUT_MS = 5000;

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// Refusals of the caller, not of what it asked: the Kernel denied the call or token, or the CLI's session cannot sign it.
const ACCESS_REFUSAL = /^(ERR_KERNEL_(ACTION_FORBIDDEN|TOKEN_REQUIRED|TOKEN_INVALID)|ERR_CLI_SESSION_(EXPIRED|INVALID))\b/;
// The CLI's own refusals: raised before anything is sent, so they say nothing about the Kernel.
const SESSION_REFUSAL = /^ERR_CLI_SESSION_(EXPIRED|INVALID)\b/;

/** An error message refusing the caller: the Kernel denied the call or token, or the CLI's session cannot sign it. */
export function isCallerRefusal(text: string): boolean {
  return ACCESS_REFUSAL.test(text);
}

/** An error message from the CLI's own session check, raised before anything is sent. */
export function isSessionRefusal(text: string): boolean {
  return SESSION_REFUSAL.test(text);
}

// As many tries as the client's own warmup. Nothing has warmed the connection when a session refusal sends the ping,
// and a cold first call (a DHT lookup) can outlast status's 3 s timeout; later tries ride the connection it opened.
// A stopped Kernel therefore costs up to three timeouts before the CLI says down.
const PING_TRIES = 3;

/**
 * Asks the Kernel for its token issuer's public keys, a sign-in action that
 * carries no token, so it answers whatever the CLI's session or permissions.
 */
export async function pingKernel(client: MdkClient, timeoutMs: number): Promise<{ up: true } | { down: string }> {
  let reason = '';
  for (let i = 0; i < PING_TRIES; i++) {
    try {
      await client.getJwks({ timeout: timeoutMs });
      return { up: true };
    } catch (error) {
      reason = message(error);
    }
  }
  return { down: reason };
}

/**
 * Pings with the service account's client, for a session that cannot build one (an unreadable session file).
 * The ping carries no token, so nothing is signed. Throws when that client cannot be built.
 */
export async function pingAsService(projectDir: string, kernelKey: string, timeoutMs: number): Promise<{ up: true } | { down: string }> {
  const probe = cliKernelClient(projectDir, kernelKey, { asService: true });
  try {
    return await pingKernel(probe, timeoutMs);
  } finally {
    await probe.close().catch(() => {});
  }
}

/** A session refusal as a reply when the Kernel answered the ping, so a stopped Kernel still reads as down. */
function refusalIfUp<T>(ping: { up: true } | { down: string }, refusal: string): { value: T } | { down: string } {
  if ('down' in ping) return { down: `Kernel unreachable (${ping.down.split('\n')[0]})` };
  return { value: { error: refusal } as T };
}

/**
 * Runs `fn` against the project's running Kernel, or returns why it is not
 * reachable (no key file: never started; a failed connect: not running).
 */
export async function withKernelClient<T>(
  projectDir: string,
  fn: (client: MdkClient) => Promise<T>,
  opts: { asService?: boolean } = {},
): Promise<{ value: T } | { down: string }> {
  const keyFile = kernelKeyFile(projectDir);
  if (!existsSync(keyFile)) return { down: `no Kernel key at ${keyFile}; start it with \`mdk run\`` };

  let key: string;
  try {
    key = readFileSync(keyFile, 'utf8').trim();
  } catch (error) {
    return { down: message(error) };
  }
  let client: MdkClient;
  try {
    client = cliKernelClient(projectDir, key, opts);
  } catch (error) {
    const text = message(error);
    if (!isSessionRefusal(text)) return { down: text };
    // A session file that cannot be read is a refusal to act.
    try {
      return refusalIfUp<T>(await pingAsService(projectDir, key, WARMUP_TIMEOUT_MS), text);
    } catch {
      return { value: { error: text } as T };
    }
  }
  try {
    await client.connect({ warmup: true, warmupTimeoutMs: WARMUP_TIMEOUT_MS });
    return { value: await fn(client) };
  } catch (error) {
    // The client throws authorization refusals: the Kernel answered, and said no. A session refusal went nowhere.
    const text = message(error);
    if (isSessionRefusal(text)) return refusalIfUp<T>(await pingKernel(client, WARMUP_TIMEOUT_MS), text);
    if (isCallerRefusal(text)) return { value: { error: text } as T };
    return { down: `Kernel unreachable (${text.split('\n')[0]})` };
  } finally {
    await client.close().catch(() => {});
  }
}

export function isRefusal(reply: unknown): reply is KernelRefusal {
  return reply !== null && typeof reply === 'object' && typeof (reply as KernelRefusal).error === 'string';
}

/** A refusal of the caller's sign-in or permission, which withKernelClient hands back as a reply. */
export function isAccessRefusal(reply: unknown): reply is KernelRefusal {
  return isRefusal(reply) && isCallerRefusal(reply.error);
}
