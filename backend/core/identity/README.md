# Identity

## Overview

`@tetherto/mdk-identity` is the token issuer behind every MDK caller, and the tools to verify what it issues. The Kernel runs one
`TokenIssuer`. Users sign in with a password, and service accounts (each app as `app:<name>`, each AI agent by name) sign in with
an assertion signed by their own Ed25519 key. Both get a short-lived access JWT and a refresh token that rotates on every use. The
Gateway, the MCP server and the Kernel verify access tokens against the issuer's JWKS, and
[`@tetherto/mdk-rbac`](../rbac/README.md) evaluates the identity in them.

- **EdDSA only.** Tokens are Ed25519-signed JWTs on `node:crypto`, with no `alg` negotiation, so `none` and key-confusion tricks fail.
- **Rotation with theft detection.** A refresh token works once. Presenting a used one revokes its whole session.
- **Credentials per instance.** A service account's private key stays in the instance that created it and never ships in a package.

## Usage

```js
const { TokenIssuer, createVerifier, identityFromClaims, createAssertion } = require('@tetherto/mdk-identity')

const issuer = new TokenIssuer({ bee })   // a Hyperbee sub with utf-8 keys
await issuer.ready()                      // loads or creates the signing key

await issuer.upsertUser({ name: 'ankit@example.com', email: 'ankit@example.com', groups: ['ops-team'], password })
const tokens = await issuer.login({ username: 'ankit@example.com', password })
// { tokenType: 'Bearer', accessToken, expiresIn: 600, refreshToken, refreshExpiresIn }

await issuer.upsertServiceAccount({ name: 'app:ops-center', publicKey })   // 32-byte hex Ed25519 key
const assertion = createAssertion({ name: 'app:ops-center', privateKey: pem })
await issuer.token({ assertion, cnf: callerHrpcKey })   // tokens bound to that transport key

const verifier = createVerifier({ jwks: issuer.jwks() })                   // or the JWKS from `auth.jwks`
const identity = identityFromClaims(verifier.verify(tokens.accessToken))  // what the RBAC evaluator takes
```

`ServiceAccountTokenSource` keeps a valid access token for an app runtime or agent: it signs in once, refreshes before expiry,
falls back to a new assertion when its session is revoked, and shares one renewal between concurrent callers. Its `request`
reaches the issuer: over HRPC through `@tetherto/mdk-client`, or over HTTP through a Gateway with `gatewayTokenRequest`, which
is how an AI agent outside the stack gets the token the MCP server asks for:

```js
const { ServiceAccountTokenSource, gatewayTokenRequest } = require('@tetherto/mdk-identity')

const source = new ServiceAccountTokenSource({ name: 'operator-agent', privateKey: pem, request: gatewayTokenRequest('http://localhost:3847') })
const headers = { authorization: `Bearer ${await source.getToken()}` }   // for POST /mcp
```

## Tokens

| Claim    | Value                                                                                         |
| -------- | --------------------------------------------------------------------------------------------- |
| `iss`    | The issuer name (`mdk` by default)                                                            |
| `aud`    | The audience (`mdk` by default)                                                               |
| `sub`    | The user name, or the service account (`app:<name>` or an agent name)                          |
| `kind`   | `user` or `serviceaccount`                                                                    |
| `email`  | Users only, when set                                                                          |
| `groups` | Users only, when set; rebuilt from the user record on every refresh                           |
| `cnf`    | `{ hrpc: <hex key> }` when the token is bound to an HRPC caller; it verifies only from that key |
| `iat`, `exp`, `jti` | Issue time, expiry (`accessTtlSec` later) and a random id                          |
| `ver`    | The subject's token version when the token was issued (see below)                             |

The header carries `kid`, the signing key's thumbprint. A retired signing key stays in the JWKS until the last token it signed
expires, then `prune()` drops it.

| Setting              | Default    | What it bounds                                 |
| -------------------- | ---------- | ---------------------------------------------- |
| `accessTtlSec`       | 600        | An access token's lifetime                     |
| `refreshTtlSec`      | 604800     | One refresh token's lifetime (7 days)          |
| `familyTtlSec`       | 2592000    | A session's absolute lifetime (30 days)        |
| `assertionMaxTtlSec` | 60         | The longest service-account assertion accepted |
| `throttle`           | 5, 30, 900 | Failures before lockout, first lock, longest lock (seconds) |

## Sessions end when

- The refresh token is reused, which revokes the whole session. Within `refreshReuseGraceSec` (10 s) of its use, while its
  successor is unused, a reuse instead gets that same successor (two clients refreshing at once); the successor is stored
  sealed under a key only the used token derives, and its next reuse revokes the session as usual
- The user's password changes, or the user is disabled or deleted
- The service account's key changes, or the account is deleted
- `logout` is called with one of its refresh tokens
- The session reaches `familyTtlSec`

## Access tokens stop working when

Each user and service account has a token version, stamped into its access tokens as `ver`. It changes when the password
changes, the user is disabled, their groups or email change, or the account gets a new key. `verify()` refuses a token whose
`ver` is not the subject's current one, or whose subject was deleted (`ERR_IDENTITY_TOKEN_REVOKED`), so these take effect at
once rather than when the token expires. A group or email change keeps the session: the next refresh issues a token with the
new claims.

This holds at once wherever the issuer itself verifies: every Kernel request, and a Gateway or MCP server in the Kernel's
process. A Gateway or MCP server in another process holds a copy of `tokenVersions()`, which the Kernel returns with the policy
on every `rbac.get` poll (5 s), so there a revoked token stops working within one poll; a token for a subject the copy does not
know yet triggers one extra poll before it is refused.

## Storage

The issuer keeps everything in one Hyperbee (the Kernel's `kernel-identity` sub-bee). Passwords are scrypt hashes, refresh tokens
are stored as SHA-256 digests, and signing keys are stored as private JWKs in the Kernel's local store.

| Key                        | Holds                                                  |
| -------------------------- | ------------------------------------------------------ |
| `meta/active-kid`          | The signing key in use                                 |
| `keys/<kid>`               | A signing key and when it retired                      |
| `users/<name>`             | Email, groups, password hash, disabled flag, token version |
| `sa/<name>`                | Kind (`app` or `agent`), public key, token version     |
| `family/<id>`              | A session: subject, expiry, binding, revocation        |
| `refresh/<id>`             | A refresh token's digest, session, expiry and use      |
| `subfam/<kind>/<sub>/<id>` | Index of a subject's sessions, for revocation          |
| `jti/<sa>/<jti>`           | A used assertion, until it expires (single use across restarts) |

## Errors

| Code                                | Fires when                                                                                   | Fix                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ERR_IDENTITY_INVALID_CREDENTIALS`  | A login names an unknown user, a disabled user, a user without a password, or the wrong password | Check the name and password                        |
| `ERR_IDENTITY_LOGIN_THROTTLED`      | A name failed `throttle.maxFailures` logins in a row; the lock doubles on each further failure | Wait the interval in the message                    |
| `ERR_IDENTITY_ASSERTION_INVALID`    | An assertion is malformed, names an unknown account, is signed by another key, has the wrong audience, lives too long, lacks `jti`, or was used before | Sign a fresh assertion with the account's registered key |
| `ERR_IDENTITY_REFRESH_INVALID`      | A refresh token is malformed or unknown                                                      | Sign in again                                         |
| `ERR_IDENTITY_REFRESH_REUSED`       | A refresh token was already used; its session is now revoked                                 | Sign in again; treat the token as leaked              |
| `ERR_IDENTITY_REFRESH_REVOKED`      | The session was revoked (logout, reuse, password or key change, deletion)                    | Sign in again                                         |
| `ERR_IDENTITY_REFRESH_EXPIRED`      | The refresh token or its session expired                                                     | Sign in again                                         |
| `ERR_IDENTITY_REFRESH_BINDING`      | A bound session is refreshed from another transport key                                      | Refresh from the caller that signed in                |
| `ERR_IDENTITY_TOKEN_REVOKED`        | An access token's subject was deleted, or changed (password, disabled, groups, email, key) after it was issued | Refresh, or sign in again |
| `ERR_IDENTITY_TOKEN_*`              | An access token fails verification: `MALFORMED`, `ALG`, `SIGNATURE`, `KEY_UNKNOWN`, `EXPIRED`, `NOT_YET_VALID`, `ISSUER`, `AUDIENCE`, `CLAIMS`, `TYPE` or `BINDING` | Get a new token from the issuer |
| `ERR_IDENTITY_PASSWORD_WEAK`        | A password is under 12 or over 1024 characters                                               | Use a longer passphrase                               |
| `ERR_IDENTITY_USER_NAME_INVALID`    | A user name is empty, too long, or has characters outside `A-Z a-z 0-9 . _ @ + -`            | Rename the user                                       |
| `ERR_IDENTITY_SA_NAME_INVALID`      | A service account is neither `app:<name>` nor a lowercase agent name                         | Rename the account                                    |
| `ERR_IDENTITY_KEY_INVALID`          | A public key is not 32-byte hex Ed25519, or a JWK is not Ed25519                             | Pass the credential's public key                      |

## Next steps

- [RBAC](../rbac/README.md): how the identity in a token is matched against `spec.rbac`
- [Kernel](../kernel/README.md): the `auth.*` and `identity.*` actions that run the issuer
- [CLI](../../../packages/cli/README.md): `mdk user` and `mdk sa`
