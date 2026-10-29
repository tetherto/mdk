import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mdkDir } from './runtime.js';

/**
 * A user's CLI session for one project: what `mdk login` gets from the Kernel's
 * token issuer, kept in `.mdk/session.json` (0600). While it exists, every
 * Kernel call the CLI makes acts as that user, so it may do what spec.rbac
 * binds the user to. The access token is renewed with the refresh token before
 * it expires, and the rotated refresh token is written back each time. An
 * expired or revoked session is an error, never a quiet fall back to the CLI's
 * own account.
 */

export interface Session {
  username: string;
  accessToken: string;
  refreshToken: string;
  /** When the access token expires (ms since the epoch). */
  expiresAt: number;
  /** When the refresh token expires (ms since the epoch). */
  refreshExpiresAt: number;
}

export interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

/** Renew this long before the access token expires. */
const RENEW_MARGIN_MS = 30_000;

export function sessionFile(projectDir: string): string {
  return join(mdkDir(projectDir), 'session.json');
}

function invalid(file: string): Error {
  return Object.assign(
    new Error(`ERR_CLI_SESSION_INVALID: ${file} cannot be read. Sign in again with \`mdk login\`, or remove it with \`mdk logout\`.`),
    { code: 'ERR_CLI_SESSION_INVALID' },
  );
}

/**
 * The session on disk, or null when there is none. A file that is there but
 * unreadable (truncated, edited, wrong shape) throws ERR_CLI_SESSION_INVALID:
 * treating it as "no session" would quietly switch the CLI to its own account.
 */
export function readSession(projectDir: string): Session | null {
  const file = sessionFile(projectDir);
  if (!existsSync(file)) return null;
  let session: Partial<Session>;
  try {
    session = JSON.parse(readFileSync(file, 'utf8')) as Partial<Session>;
  } catch {
    throw invalid(file);
  }
  const ok =
    session !== null &&
    typeof session === 'object' &&
    typeof session.username === 'string' &&
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.expiresAt === 'number' &&
    typeof session.refreshExpiresAt === 'number';
  if (!ok) throw invalid(file);
  return session as Session;
}

export function sessionFrom(username: string, tokens: IssuedTokens, now = Date.now()): Session {
  return {
    username,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: now + tokens.expiresIn * 1000,
    refreshExpiresAt: now + tokens.refreshExpiresIn * 1000,
  };
}

export function writeSession(projectDir: string, session: Session): void {
  const file = sessionFile(projectDir);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

export function clearSession(projectDir: string): boolean {
  const file = sessionFile(projectDir);
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}

/** The claims of an access token, read without verifying it: for display only. */
export function tokenClaims(token: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function expired(message: string): Error {
  return Object.assign(new Error(`ERR_CLI_SESSION_EXPIRED: ${message}. Sign in again with \`mdk login\`.`), {
    code: 'ERR_CLI_SESSION_EXPIRED',
  });
}

/**
 * A token source for @tetherto/mdk-client from the session on disk.
 * `refresh` trades a refresh token with the issuer (`client.refreshToken`).
 */
export function sessionTokenSource(
  projectDir: string,
  refresh: (refreshToken: string) => Promise<IssuedTokens | { error: string }>,
  now: () => number = Date.now,
): { getToken(): Promise<string>; reset(): void } {
  let forceRenew = false;
  return {
    async getToken() {
      const session = readSession(projectDir);
      if (!session) throw expired('no session');
      if (!forceRenew && now() < session.expiresAt - RENEW_MARGIN_MS) return session.accessToken;
      if (now() >= session.refreshExpiresAt) throw expired('the session ran out');
      const res = await refresh(session.refreshToken);
      if ('error' in res) throw expired(res.error.split('\n')[0] ?? res.error);
      const next = sessionFrom(session.username, res, now());
      writeSession(projectDir, next);
      forceRenew = false;
      return next.accessToken;
    },
    reset() {
      forceRenew = true;
    },
  };
}
