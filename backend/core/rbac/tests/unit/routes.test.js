'use strict'

const test = require('brittle')
const { routeAccess, routeRequest, routeAccessError, compilePolicy } = require('../../index')

test('a route is governed as <app>/<path> with a verb from its method', (t) => {
  t.alike(routeAccess('ops-center', { method: 'GET', path: '/miners' }), { resource: 'ops-center/miners', verb: 'get' })
  t.alike(routeAccess('ops-center', { method: 'POST', path: '/miners/command' }), { resource: 'ops-center/miners/command', verb: 'create' })
  t.alike(routeAccess('ops-center', { method: 'PATCH', path: '/miners/:id' }), { resource: 'ops-center/miners/:id', verb: 'update' })
  t.alike(routeAccess('ops-center', { method: 'DELETE', path: '/x' }).verb, 'delete')
  t.alike(routeAccess('ops-center', { method: 'GET', path: '/' }), { resource: 'ops-center', verb: 'get' })
  t.alike(routeAccess('ops-center', { method: 'GET', path: '/miners', verb: 'list' }).verb, 'list', 'a declared verb wins')
})

test('the instance name comes from the declared param, query or body field', (t) => {
  const access = routeAccess('ops-center', { method: 'POST', path: '/miners/command', resourceName: { body: 'target' } })
  t.alike(access.nameFrom, { from: 'body', field: 'target' })
  t.alike(routeRequest(access, { body: { target: 'rack-3-07' } }), { resource: 'ops-center/miners/command', verb: 'create', resourceName: 'rack-3-07' })
  t.alike(routeRequest(access, { body: { target: 7 } }), { resource: 'ops-center/miners/command', verb: 'create' }, 'not a string: no name')
  t.alike(routeRequest(access, {}), { resource: 'ops-center/miners/command', verb: 'create' })

  const byParam = routeAccess('ops-center', { method: 'GET', path: '/miners/:id', resourceName: { param: 'id' } })
  t.is(routeRequest(byParam, { params: { id: 'AM-1' } }).resourceName, 'AM-1')
  const byQuery = routeAccess('ops-center', { method: 'GET', path: '/m', resourceName: { query: 'rack' } })
  t.is(routeRequest(byQuery, { query: { rack: 'rack-3' } }).resourceName, 'rack-3')
})

test('rules match route requests, path params included', (t) => {
  const rbac = compilePolicy({
    roles: [
      { name: 'r', rules: [{ resources: ['ops-center/miners/*'], verbs: ['update'] }, { resources: ['ops-center/miners/command'], verbs: ['create'], resourceNames: ['rack-3-*'] }] }
    ],
    bindings: [{ role: 'r', subjects: [{ kind: 'User', name: 'u' }] }]
  })
  const u = { kind: 'user', sub: 'u' }
  t.ok(rbac.allows(u, routeRequest(routeAccess('ops-center', { method: 'PATCH', path: '/miners/:id' }))))
  const cmd = routeAccess('ops-center', { method: 'POST', path: '/miners/command', resourceName: { body: 'target' } })
  t.ok(rbac.allows(u, routeRequest(cmd, { body: { target: 'rack-3-01' } })))
  t.absent(rbac.allows(u, routeRequest(cmd, { body: { target: 'rack-4-01' } })))
  t.absent(rbac.allows(u, routeRequest(cmd, {})))
})

test('route field validation', (t) => {
  t.is(routeAccessError({}), null)
  t.is(routeAccessError({ verb: 'list', resourceName: { param: 'id' } }), null)
  t.ok(routeAccessError({ verb: 'read' }).includes('"verb"'))
  for (const bad of ['id', [], {}, { header: 'x' }, { param: '' }, { param: 'a', body: 'b' }]) {
    t.ok(routeAccessError({ resourceName: bad }).includes('"resourceName"'), JSON.stringify(bad))
  }
})
