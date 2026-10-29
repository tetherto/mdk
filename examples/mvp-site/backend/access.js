'use strict'

// spec.rbac for the mvp-site example. The Kernel is fail-closed: it refuses
// every call that carries no access token, and a token grants exactly what
// the policy binds its subject to. This site has no mdk.yaml, so the policy is
// assembled here at the Kernel's boot:
//   - each app (gateway.pluginDirs) gets the Kernel access its mdk-app.yaml
//     requests, as role app-<name> bound to service account app:<name>
//   - the MCP server's hand-written tool plugins (mcp.agentTools.pluginDirs)
//     read as service account mvp-mcp-tools: they list workers and read
//     devices; their write tool stays withheld and is refused if enabled
//   - the Gateway reads the policy as service account mvp-gateway, so it can
//     sign users in and check every route against it
//   - config/site.deploy.json `rbac` lists the site's users and the roles
//     and bindings that say what each may do (README "Users and permissions"),
//     as spec.rbac does in an mdk.yaml
// Each service account signs in with its own key. The Kernel process creates
// the credentials (0600, under <root>/credentials) before it publishes its key,
// and the app, Gateway and MCP processes wait for that key, so they always
// find them. Users sign in with a password: `rbac.password` (one shared demo
// password) or a user's own, else one the Kernel generates; either way it is
// kept in <root>/credentials/users.json (0600).

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { loadAppManifest } = require('@tetherto/mdk-app-runtime')

const GATEWAY_ACCOUNT = 'mvp-gateway'
const GATEWAY_RULES = Object.freeze([
  { resources: ['policy'], verbs: ['read'] }
])

const MCP_TOOLS_ACCOUNT = 'mvp-mcp-tools'
const MCP_TOOLS_RULES = Object.freeze([
  { resources: ['workers'], verbs: ['list'] },
  { resources: ['devices'], verbs: ['read'] }
])

const credentialsDir = (root) => path.join(root, 'credentials')

// app:site → credentials/app-site.json, mvp-mcp-tools → credentials/mvp-mcp-tools.json
const credentialFile = (root, account) => path.join(credentialsDir(root), `${account.replace(':', '-')}.json`)

// The shape the CLI writes and the app runtime's credentialFile reads.
function _newCredential (name) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  return {
    name,
    publicKey: Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('hex'),
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' })
  }
}

/** The account's credential, created (0600) on first use. Only the Kernel process calls this. */
function ensureCredential (root, account) {
  const file = credentialFile(root, account)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  fs.mkdirSync(credentialsDir(root), { recursive: true, mode: 0o700 })
  const cred = _newCredential(account)
  fs.writeFileSync(file, `${JSON.stringify(cred, null, 2)}\n`, { mode: 0o600 })
  return cred
}

/** `{ name, privateKey }` for a Kernel client, from a credential the Kernel process created. */
function signingCredential (root, account) {
  const file = credentialFile(root, account)
  if (!fs.existsSync(file)) throw new Error(`ERR_SITE_CREDENTIAL_MISSING: ${file}; start the Kernel role first`)
  const { name, privateKeyPem } = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { name, privateKey: privateKeyPem }
}

const appName = (pluginDir) => path.basename(pluginDir)

/**
 * The policy the Kernel enforces, and the service accounts it registers.
 * @param {string} root - the site's state root
 * @param {{ pluginDirs: string[], mcpPluginDirs?: string[], rbac?: { roles?: object[], bindings?: object[] } }} site
 *   rbac: config/site.deploy.json `rbac`
 */
function siteAccess (root, { pluginDirs, mcpPluginDirs = [], rbac = {} }) {
  const roles = []
  const bindings = []
  const serviceAccounts = []
  for (const dir of pluginDirs) {
    const name = appName(dir)
    const account = `app:${name}`
    const { permissions = [] } = loadAppManifest(dir).manifest
    if (permissions.length) {
      roles.push({ name: `app-${name}`, rules: permissions })
      bindings.push({ role: `app-${name}`, subjects: [{ kind: 'ServiceAccount', name: account }] })
    }
    serviceAccounts.push({ name: account, publicKey: ensureCredential(root, account).publicKey })
  }
  if (mcpPluginDirs.length) {
    roles.push({ name: 'mcp-tools', rules: MCP_TOOLS_RULES.map((r) => ({ ...r })) })
    bindings.push({ role: 'mcp-tools', subjects: [{ kind: 'ServiceAccount', name: MCP_TOOLS_ACCOUNT }] })
    serviceAccounts.push({ name: MCP_TOOLS_ACCOUNT, publicKey: ensureCredential(root, MCP_TOOLS_ACCOUNT).publicKey })
  }
  roles.push({ name: 'gateway', rules: GATEWAY_RULES.map((r) => ({ ...r })) })
  bindings.push({ role: 'gateway', subjects: [{ kind: 'ServiceAccount', name: GATEWAY_ACCOUNT }] })
  serviceAccounts.push({ name: GATEWAY_ACCOUNT, publicKey: ensureCredential(root, GATEWAY_ACCOUNT).publicKey })
  const policy = {
    enforcement: 'deny',
    roles: [...roles, ...(rbac.roles || [])],
    bindings: [...bindings, ...(rbac.bindings || [])]
  }
  return { policy, serviceAccounts }
}

const usersFile = (root) => path.join(credentialsDir(root), 'users.json')

/** `{ <name>: <password> }` for the users this site created. */
function readUserPasswords (root) {
  const file = usersFile(root)
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

/**
 * Make the issuer's users match config/site.deploy.json `rbac.users`. Each user's
 * password is their own `password`, else `rbac.password`, else one generated when the
 * user is created; it is kept in <root>/credentials/users.json (0600). An
 * existing user gets the configured email and groups, and the configured
 * password only when it differs from the one last set, so a restart does not
 * end their sessions. A user this site created that the config no longer lists
 * is deleted; users added another way (`mdk user`) and not listed are left
 * alone. Only the Kernel process calls this.
 * @param {string} root - the site's state root
 * @param {import('@tetherto/mdk-identity').TokenIssuer} identity - the Kernel's token issuer
 * @param {Array<{ name: string, email?: string, groups?: string[], password?: string }>} users
 * @param {{ password?: string }} [defaults] - the password every user without their own gets
 */
async function syncUsers (root, identity, users, defaults = {}) {
  const passwords = readUserPasswords(root)
  // Saved after each change, so a failure partway never leaves a user the
  // issuer created with a password nobody kept.
  const save = () => {
    fs.mkdirSync(credentialsDir(root), { recursive: true, mode: 0o700 })
    fs.writeFileSync(usersFile(root), `${JSON.stringify(passwords, null, 2)}\n`, { mode: 0o600 })
  }
  const created = []
  for (const { name, email, groups = [], password: own } of users) {
    const configured = own ?? defaults.password
    if (await identity.getUser(name)) {
      const reset = configured !== undefined && passwords[name] !== configured
      await identity.upsertUser({ name, email: email ?? null, groups, ...(reset ? { password: configured } : {}) })
      if (reset) {
        passwords[name] = configured
        save()
      }
      continue
    }
    const password = configured ?? crypto.randomBytes(12).toString('base64url')
    await identity.upsertUser({ name, email, groups, password })
    passwords[name] = password
    save()
    created.push(name)
  }
  const listed = new Set(users.map((u) => u.name))
  const removed = Object.keys(passwords).filter((name) => !listed.has(name))
  for (const name of removed) {
    await identity.deleteUser(name)
    delete passwords[name]
    save()
  }
  save()
  return { created, removed }
}

module.exports = {
  siteAccess,
  syncUsers,
  readUserPasswords,
  signingCredential,
  credentialFile,
  MCP_TOOLS_ACCOUNT,
  GATEWAY_ACCOUNT
}
