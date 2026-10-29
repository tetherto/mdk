'use strict'

// spec.rbac from the design's example mdk.yaml, plus a rack-3 technician and a
// group binding so every rule shape has a subject.
module.exports = () => ({
  enforcement: 'deny',
  roles: [
    { name: 'viewer', rules: [{ resources: ['*'], verbs: ['get', 'list'] }] },
    { name: 'fleet-operator', rules: [{ resources: ['ops-center/miners', 'ops-center/miners/command'], verbs: ['get', 'list', 'create'] }] },
    { name: 'rack3-tech', rules: [{ resources: ['ops-center/miners/command'], verbs: ['create'], resourceNames: ['rack-3-*'] }] },
    { name: 'app-ops-center', rules: [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/*'] }] },
    { name: 'app-antminer-tuner', rules: [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/*'] }] },
    { name: 'app-sentinel', rules: [{ resources: ['devices'], verbs: ['read', 'write'], resourceNames: ['miner/antminer/antminer-a/*'] }] },
    { name: 'admin', rules: [{ resources: ['*'], verbs: ['*'] }] }
  ],
  bindings: [
    { role: 'admin', subjects: [{ kind: 'User', name: 'ankit@example.com' }] },
    { role: 'viewer', subjects: [{ kind: 'Group', name: 'ops-team' }] },
    { role: 'rack3-tech', subjects: [{ kind: 'User', name: 'tech@example.com' }] },
    { role: 'fleet-operator', subjects: [{ kind: 'ServiceAccount', name: 'operator-agent' }] },
    { role: 'app-ops-center', subjects: [{ kind: 'ServiceAccount', name: 'app:ops-center' }] },
    { role: 'app-antminer-tuner', subjects: [{ kind: 'ServiceAccount', name: 'app:antminer-tuner' }] },
    { role: 'app-sentinel', subjects: [{ kind: 'ServiceAccount', name: 'app:sentinel' }] }
  ]
})
