'use strict'

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const MANIFEST_FILE = 'mdk-app.yaml'
const PLUGIN_FILE = 'mdk-plugin.json'

const ID_RE = /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)+$/
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/

const isMapping = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStrings = (v) => Array.isArray(v) && v.every(s => typeof s === 'string')

// Shape only: the permission vocabulary belongs to the Kernel, which enforces
// it. Other keys pass through untouched.
function validateAppManifest (obj, label = MANIFEST_FILE) {
  const fail = (reason) => { throw new Error(`ERR_APP_MANIFEST_INVALID: ${label}: ${reason}`) }

  if (!isMapping(obj)) fail('must be a mapping')
  if (typeof obj.id !== 'string' || !ID_RE.test(obj.id)) fail(`"id" must be reverse-DNS style (e.g. io.tether.example), got ${JSON.stringify(obj.id)}`)
  if (typeof obj.version !== 'string' || !SEMVER_RE.test(obj.version)) fail(`"version" must be a semver string, got ${JSON.stringify(obj.version)}`)
  if (typeof obj.displayName !== 'string' || !obj.displayName.trim()) fail('"displayName" must be a non-empty string')
  if (obj.permissions != null) {
    if (!Array.isArray(obj.permissions)) fail('"permissions" must be an array')
    obj.permissions.forEach((rule, i) => {
      if (!isMapping(rule) || !isStrings(rule.resources) || !isStrings(rule.verbs) || (rule.resourceNames != null && !isStrings(rule.resourceNames))) {
        fail(`permissions[${i}] must be { resources: string[], verbs: string[], resourceNames?: string[] }`)
      }
    })
  }
  if (obj.config != null && !isMapping(obj.config)) fail('"config" must be a mapping')
  if (obj.main != null && (typeof obj.main !== 'string' || !obj.main.trim())) fail('"main" must be a non-empty "<file>[#export]" string')

  return { ...obj, permissions: obj.permissions || [], config: obj.config || {} }
}

function loadAppManifest (appDir) {
  let dir
  try {
    dir = fs.realpathSync(appDir)
  } catch {
    throw new Error(`ERR_APP_MANIFEST_MISSING: ${appDir}`)
  }

  const file = path.join(dir, MANIFEST_FILE)
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') throw new Error(`ERR_APP_MANIFEST_MISSING: ${dir}`)
    throw new Error(`ERR_APP_MANIFEST_INVALID: ${file}: cannot read: ${err.message}`)
  }

  let parsed
  try {
    parsed = YAML.parse(text)
  } catch (err) {
    throw new Error(`ERR_APP_MANIFEST_INVALID: ${file}: not valid YAML: ${err.message}`)
  }

  return { manifest: validateAppManifest(parsed, file), dir }
}

// The directory of an app's route table: <appDir>/plugin if it holds a
// mdk-plugin.json, else <appDir> itself.
function resolvePluginDir (appDir) {
  for (const dir of [path.join(appDir, 'plugin'), appDir]) {
    if (fs.existsSync(path.join(dir, PLUGIN_FILE))) return path.resolve(dir)
  }
  throw new Error(`ERR_PLUGIN_MANIFEST_MISSING: ${appDir}`)
}

module.exports = { MANIFEST_FILE, PLUGIN_FILE, validateAppManifest, loadAppManifest, resolvePluginDir }
