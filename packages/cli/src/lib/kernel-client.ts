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

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

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

  let client: MdkClient;
  try {
    client = cliKernelClient(projectDir, readFileSync(keyFile, 'utf8').trim(), opts);
  } catch (error) {
    // A session file that cannot be read is a refusal to act, not a Kernel that is down.
    if (/^ERR_CLI_SESSION_INVALID\b/.test(message(error))) return { value: { error: message(error) } as T };
    return { down: message(error) };
  }
  try {
    await client.connect({ warmup: true });
    return { value: await fn(client) };
  } catch (error) {
    // The client throws authorization refusals: the Kernel answered, and said no.
    const text = message(error);
    if (/^(ERR_KERNEL_(ACTION_FORBIDDEN|TOKEN_REQUIRED|TOKEN_INVALID)|ERR_CLI_SESSION_(EXPIRED|INVALID))\b/.test(text)) return { value: { error: text } as T };
    return { down: `Kernel unreachable (${text.split('\n')[0]})` };
  } finally {
    await client.close().catch(() => {});
  }
}

export function isRefusal(reply: unknown): reply is KernelRefusal {
  return reply !== null && typeof reply === 'object' && typeof (reply as KernelRefusal).error === 'string';
}
