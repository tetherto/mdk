'use strict'

const crypto = require('crypto')
const { validatePolicy } = require('./validate')
const { isKernelResource, isReservedName, KERNEL_RESOURCES } = require('./vocabulary')

// What `mdk app add` writes into spec.rbac for an app: a role holding exactly
// the Kernel access its mdk-app.yaml `permissions` request, and a binding of
// that role to the app's own service account. An app may only request Kernel
// resources; who may call its routes is the operator's to set.

// Same rule as spec.apps[].name in the CLI's stack loader.
const APP_NAME = /^[a-z][a-z0-9-]*$/

function serviceAccountFor (appName) {
  return `app:${appName}`
}

function roleNameFor (appName) {
  return `app-${appName}`
}

/**
 * @param {string} appName - the app's handle in mdk.yaml (spec.apps[].name)
 * @param {object[]} permissions - mdk-app.yaml `permissions`
 * @returns {{ serviceAccount: string, role: object|null, binding: object|null }}
 *   `role` and `binding` are null when the app requests no access
 */
function appGrant (appName, permissions = []) {
  if (typeof appName !== 'string' || !APP_NAME.test(appName)) {
    throw new Error(`ERR_RBAC_APP_NAME_INVALID: ${JSON.stringify(appName)} must be lowercase letters, digits and dashes`)
  }
  if (isReservedName(appName)) {
    throw new Error(`ERR_RBAC_APP_NAME_RESERVED: "${appName}" is a Kernel resource name (${Object.keys(KERNEL_RESOURCES).join(', ')})`)
  }
  const errors = validateAppPermissions(permissions)
  if (errors.length) {
    const err = new Error(`ERR_RBAC_APP_PERMISSIONS_INVALID: ${appName}\n  - ${errors.join('\n  - ')}`)
    err.errors = errors
    throw err
  }

  const serviceAccount = serviceAccountFor(appName)
  if (permissions.length === 0) return { serviceAccount, role: null, binding: null }
  const role = { name: roleNameFor(appName), rules: permissions.map((r) => ({ ...r })) }
  const binding = { role: role.name, subjects: [{ kind: 'ServiceAccount', name: serviceAccount }] }
  return { serviceAccount, role, binding }
}

/**
 * Every problem with an app's requested `permissions`, by the rules a policy
 * role is held to (patterns, verbs per resource, unknown fields), plus: Kernel
 * resources only. `mdk validate app` reports these before a package ships.
 *
 * @param {unknown} permissions - mdk-app.yaml `permissions`
 * @param {string} [at='permissions'] - path prefix used in messages
 * @returns {string[]} empty when valid
 */
function validateAppPermissions (permissions, at = 'permissions') {
  if (permissions === undefined || permissions === null) return []
  if (!Array.isArray(permissions)) return [`${at}: must be a list of rules`]
  if (permissions.length === 0) return []

  const errors = []
  permissions.forEach((rule, i) => {
    const resources = (rule && Array.isArray(rule.resources)) ? rule.resources : []
    resources.forEach((r, j) => {
      if (!isKernelResource(r)) errors.push(`${at}[${i}].resources[${j}]: an app can only request Kernel resources (${Object.keys(KERNEL_RESOURCES).join(', ')}), got ${JSON.stringify(r)}`)
    })
  })
  try {
    validatePolicy({ roles: [{ name: 'app', rules: permissions }] }, '\0')
  } catch (err) {
    if (!err.errors) throw err
    // Report against the manifest's own paths: `<at>[i]...` rather than a role's.
    errors.push(...err.errors.map((e) => e.replace('\0.roles[0].rules', at)))
  }
  return errors
}

/**
 * A short, stable digest of an app's requested `permissions`. Install records
 * it on the app's spec.apps entry, so a later re-add can tell "the package
 * asks for something new" (show the diff, require --accept-permissions) from
 * "the operator narrowed the role" (leave it alone).
 */
function permissionsDigest (permissions = []) {
  return crypto.createHash('sha256').update(JSON.stringify(permissions)).digest('hex').slice(0, 16)
}

module.exports = { appGrant, validateAppPermissions, serviceAccountFor, roleNameFor, permissionsDigest }
