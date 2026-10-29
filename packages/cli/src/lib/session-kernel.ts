import { CLI_ACCOUNT } from './credentials.js';
import { isRefusal, withKernelClient } from './kernel-client.js';
import { clearSession, readSession, sessionFrom, tokenClaims, writeSession } from './session.js';

/**
 * `mdk login | logout | whoami`: sign in to the Kernel's token issuer as a
 * user, and keep the session for this project (see session.ts).
 */

const call = { timeout: 10000 };

export interface LoginResult {
  ok: boolean;
  username?: string;
  expiresAt?: number;
  message?: string;
}

export async function login(projectDir: string, username: string, password: string): Promise<LoginResult> {
  // Sign-in needs no token: the CLI's own identity only carries the request.
  const res = await withKernelClient(projectDir, (client) => client.login(username, password, call), { asService: true });
  if ('down' in res) return { ok: false, message: res.down };
  if (isRefusal(res.value)) return { ok: false, message: res.value.error };
  const session = sessionFrom(username, res.value);
  writeSession(projectDir, session);
  return { ok: true, username, expiresAt: session.refreshExpiresAt };
}

export interface LogoutResult {
  /** A session was on disk (and is gone now). */
  hadSession: boolean;
  /** The issuer ended it; false when the Kernel was unreachable (the session expires on its own). */
  revoked: boolean;
  message?: string;
}

export async function logout(projectDir: string): Promise<LogoutResult> {
  let session;
  try {
    session = readSession(projectDir);
  } catch {
    // An unreadable session cannot be ended at the issuer; remove it so the CLI is usable again.
    clearSession(projectDir);
    return { hadSession: true, revoked: false, message: 'the session file could not be read' };
  }
  if (!session) return { hadSession: false, revoked: false };
  const res = await withKernelClient(projectDir, (client) => client.logout(session.refreshToken, call), { asService: true });
  clearSession(projectDir);
  if ('down' in res) return { hadSession: true, revoked: false, message: res.down };
  if (isRefusal(res.value)) return { hadSession: true, revoked: false, message: res.value.error };
  return { hadSession: true, revoked: res.value.revoked };
}

export interface WhoAmI {
  /** Who the CLI's Kernel calls act as. */
  as: 'user' | 'serviceaccount';
  sub: string;
  email?: string;
  groups?: string[];
  /** When the session's refresh token runs out (users only). */
  sessionExpiresAt?: number;
}

export function whoami(projectDir: string): WhoAmI {
  const session = readSession(projectDir);
  if (!session) return { as: 'serviceaccount', sub: CLI_ACCOUNT };
  const claims = tokenClaims(session.accessToken);
  return {
    as: 'user',
    sub: typeof claims.sub === 'string' ? claims.sub : session.username,
    ...(typeof claims.email === 'string' ? { email: claims.email } : {}),
    ...(Array.isArray(claims.groups) ? { groups: claims.groups as string[] } : {}),
    sessionExpiresAt: session.refreshExpiresAt,
  };
}
