import type {AuthProvider, PasswordAuthProvider} from '@tetherto/mdk-ui-foundation';
import { gatewayRedirectAuth, passwordAuth } from '@tetherto/mdk-ui-foundation'

import { API_BASE_URL, AUTH_MODE, OAUTH_BASE_URL } from './constants/env'
import { permissionsFromToken } from './constants/permissions'

// --- Session ------------------------------------------------------------
// One object describes the whole auth flow. Two ship with the shell:
//
//   password  An MDK stack's Gateway: user name and password, checked by the
//             Kernel's token issuer. The access token stays in memory, the
//             refresh token in an httpOnly cookie the page cannot read; the
//             session is renewed silently and restored after a reload.
//   oauth     The mining Gateway's Google redirect, capturing the
//             `?authToken=` it redirects back with.
//
// Swap this for `noAuth()` — or your own `AuthProvider` — to point the shell at
// a backend with a different session model.
//
// `getPermissions` is where your permission policy plugs in. MDK ships none, so
// without it every write affordance (vote, submit, cancel, comment) stays
// disabled. See ./constants/permissions.ts — that mapping is an example to
// replace, not a recommendation.

/** The password session, when the shell signs in with one (null in oauth mode). */
export const passwordSession: PasswordAuthProvider | null =
  AUTH_MODE === 'password' ? passwordAuth({ baseUrl: API_BASE_URL, getPermissions: permissionsFromToken }) : null

export const auth: AuthProvider =
  passwordSession ?? gatewayRedirectAuth({ oauthBaseUrl: OAUTH_BASE_URL, getPermissions: permissionsFromToken })
