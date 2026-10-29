/**
 * Authentication for the MDK Gateway. `passwordAuth` signs a user in through
 * the Kernel's token issuer and keeps the refresh token in an httpOnly cookie;
 * `gatewayRedirectAuth` signs in through an OAuth redirect and refreshes
 * `/auth/token`; `bearerTokenAuth` sends a Gateway-issued token you already
 * hold; `noAuth` sends no token at all. React bindings live in
 * `@tetherto/mdk-react-adapter`.
 */

export {
  type GatewayIdentity,
  passwordAuth,
  type PasswordAuthOptions,
  type PasswordAuthProvider,
  type PasswordCredentials,
} from './password-auth'
export {
  authTokenMutation,
  GATEWAY_REFRESH_INTERVAL_MS,
  gatewayRedirectAuth,
  type GatewayRedirectAuthOptions,
} from './gateway-redirect-auth'
export {
  applySession,
  type AuthProvider,
  type AuthTokenStore,
  bearerTokenAuth,
  type BearerTokenAuthOptions,
  isSessionExpiredError,
  noAuth,
  SESSION_EXPIRED_STATUS,
} from './provider'
