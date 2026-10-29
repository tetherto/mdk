'use strict'

const test = require('brittle')
const { appGrant, compilePolicy, kernelRequest } = require('../../index')

test('install grants exactly the requested Kernel access to app:<name>', (t) => {
  const grant = appGrant('antminer-tuner', [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/*'] }])
  t.is(grant.serviceAccount, 'app:antminer-tuner')
  t.alike(grant.role, { name: 'app-antminer-tuner', rules: [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/*'] }] })
  t.alike(grant.binding, { role: 'app-antminer-tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:antminer-tuner' }] })

  const rbac = compilePolicy({ roles: [grant.role], bindings: [grant.binding] })
  const id = { kind: 'serviceaccount', sub: 'app:antminer-tuner' }
  t.ok(rbac.allows(id, kernelRequest('command.request', 'miner/antminer/antminer-a/AM-001')))
  t.absent(rbac.allows(id, kernelRequest('command.request', 'miner/avalon/avalon-a/AV-001')))
})

test('an app requesting nothing gets a service account and no role', (t) => {
  t.alike(appGrant('agent', []), { serviceAccount: 'app:agent', role: null, binding: null })
})

test('an app cannot request route access or wildcard resources', (t) => {
  t.exception(() => appGrant('x', [{ resources: ['ops-center/miners'], verbs: ['get'] }]), /ERR_RBAC_APP_PERMISSIONS_INVALID/)
  t.exception(() => appGrant('x', [{ resources: ['*'], verbs: ['*'] }]), /ERR_RBAC_APP_PERMISSIONS_INVALID/)
})

test('requested verbs are checked against the resource', (t) => {
  t.exception(() => appGrant('x', [{ resources: ['devices'], verbs: ['list'] }]), /ERR_RBAC_APP_PERMISSIONS_INVALID/)
})

test('validateAppPermissions reports against the manifest\'s own paths', (t) => {
  const { validateAppPermissions } = require('../../index')
  t.alike(validateAppPermissions(undefined), [])
  t.alike(validateAppPermissions([]), [])
  t.alike(validateAppPermissions({}), ['permissions: must be a list of rules'])
  t.alike(validateAppPermissions([{ resources: ['workers'], verbs: ['list'] }, { resources: ['devices'], verbs: ['read'], resourceNames: ['miner/*'] }]), [])

  const errs = validateAppPermissions([
    { resources: ['workers', 'devices'], verbs: ['list', 'read'] },
    { resources: ['telemetry'], verbs: ['read'] }
  ], 'mdk-app.yaml: permissions')
  t.alike(errs, [
    'mdk-app.yaml: permissions[1].resources[0]: an app can only request Kernel resources (devices, workers, commands, actions, policy, identities), got "telemetry"',
    'mdk-app.yaml: permissions[1].verbs[0]: verb "read" applies to none of this rule\'s resources (telemetry)'
  ], 'rule 0 passes: each verb fits one of its resources')

  const bad = validateAppPermissions([{ resources: ['devices'], verbs: ['list'], extra: 1 }])
  t.ok(bad.includes('permissions[0].extra: unknown field'))
  t.ok(bad.some((e) => e.startsWith('permissions[0].verbs[0]: verb "list" applies to none')))
})

test('app names are validated and Kernel names are reserved', (t) => {
  t.exception(() => appGrant('devices', []), /ERR_RBAC_APP_NAME_RESERVED/)
  for (const bad of ['', 'Ops', 'a/b', '-x', '1x']) t.exception(() => appGrant(bad, []), /ERR_RBAC_APP_NAME_INVALID/)
})

test('permissionsDigest is stable and changes with the request', (t) => {
  const { permissionsDigest } = require('../../index')
  const p = [{ resources: ['devices'], verbs: ['read'] }]
  t.is(permissionsDigest(p), permissionsDigest(JSON.parse(JSON.stringify(p))))
  t.not(permissionsDigest(p), permissionsDigest([{ resources: ['devices'], verbs: ['read', 'write'] }]))
  t.is(permissionsDigest(), permissionsDigest([]))
  t.is(permissionsDigest(p).length, 16)
})
