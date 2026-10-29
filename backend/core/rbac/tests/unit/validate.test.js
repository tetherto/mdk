'use strict'

const test = require('brittle')
const { validatePolicy, compilePolicy } = require('../../index')
const stackRbac = require('../fixtures/stack-rbac')

function problems (t, rbac) {
  try {
    validatePolicy(rbac)
  } catch (err) {
    t.ok(err.message.startsWith('ERR_RBAC_POLICY_INVALID'))
    return err.errors
  }
  t.fail('expected ERR_RBAC_POLICY_INVALID')
  return []
}

test('the example stack policy validates', (t) => {
  const p = validatePolicy(stackRbac())
  t.is(p.enforcement, 'deny')
  t.is(p.roles.length, 7)
  t.is(p.bindings.length, 7)
})

test('enforcement accepts only deny', (t) => {
  t.is(validatePolicy({}).enforcement, 'deny')
  for (const e of ['allow', 'audit', 'permissive', true]) {
    t.ok(problems(t, { enforcement: e })[0].includes('spec.rbac.enforcement'))
  }
})

test('every problem is reported with its path', (t) => {
  const errs = problems(t, {
    extra: 1,
    roles: [
      { name: 'a', rules: [{ resources: ['devices'], verbs: ['get'] }] },
      { name: 'a', rules: [] },
      { name: 'b', rules: [{ resources: ['x/y'], verbs: ['frobnicate'], resourceNames: [], other: 1 }] }
    ],
    bindings: [
      { role: 'missing', subjects: [{ kind: 'User', name: 'u' }] },
      { role: 'a', subjects: [{ kind: 'Robot', name: '*' }] },
      { role: 'b', subjects: [] }
    ]
  })
  const expected = [
    'spec.rbac.extra: unknown field',
    'spec.rbac.roles[0].rules[0].verbs[0]: verb "get" applies to none',
    'spec.rbac.roles[1].name: duplicate role "a"',
    'spec.rbac.roles[1].rules: must be a non-empty array',
    'spec.rbac.roles[2].rules[0].other: unknown field',
    'spec.rbac.roles[2].rules[0].verbs[0]: unknown verb "frobnicate"',
    'spec.rbac.roles[2].rules[0].resourceNames: must be a non-empty array',
    'spec.rbac.bindings[0].role: no role named "missing"',
    'spec.rbac.bindings[1].subjects[0].kind',
    'spec.rbac.bindings[1].subjects[0].name',
    'spec.rbac.bindings[2].subjects: must be a non-empty array'
  ]
  for (const e of expected) t.ok(errs.some((x) => x.startsWith(e)), e)
  t.is(errs.length, expected.length)
})

test('verbs must fit the rule\'s resources', (t) => {
  t.ok(problems(t, { roles: [{ name: 'r', rules: [{ resources: ['ops-center/miners'], verbs: ['read'] }] }] })[0].includes('applies to none'))
  t.ok(problems(t, { roles: [{ name: 'r', rules: [{ resources: ['workers'], verbs: ['write'] }] }] })[0].includes('applies to none'))
  // `*` reaches both domains, so either vocabulary is accepted.
  validatePolicy({ roles: [{ name: 'r', rules: [{ resources: ['*'], verbs: ['read', 'get', 'vote'] }] }] })
  validatePolicy({ roles: [{ name: 'r', rules: [{ resources: ['dev*'], verbs: ['write'] }] }] })
  t.pass()
})

test('patterns reject empty segments and whitespace', (t) => {
  for (const p of ['', ' ', '/x', 'x/', 'a//b', 'a b']) {
    problems(t, { roles: [{ name: 'r', rules: [{ resources: [p], verbs: ['get'] }] }] })
    problems(t, { roles: [{ name: 'r', rules: [{ resources: ['devices'], verbs: ['read'], resourceNames: [p] }] }] })
  }
})

test('non-mapping inputs are rejected', (t) => {
  for (const bad of [[], 'deny', 1]) problems(t, bad)
  problems(t, { roles: {} })
  problems(t, { bindings: 'x' })
  problems(t, { roles: [null] })
})

test('compilePolicy refuses an invalid policy', (t) => {
  t.exception(() => compilePolicy({ enforcement: 'allow' }), /ERR_RBAC_POLICY_INVALID/)
})
