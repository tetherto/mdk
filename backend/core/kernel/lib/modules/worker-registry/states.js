'use strict'

/**
 * Worker Registry State Machine
 *
 * Unregistered → Discovered → IdentitySaved → Ready → Terminated
 *
 * - Unregistered: Worker not yet seen on DHT
 * - Discovered: DHT peer detected, identity.request sent
 * - IdentitySaved: identity.response received, devices mapped
 * - Ready: capability.response received, fully operational
 * - Terminated: Worker evicted or disconnected permanently
 */

const REGISTRY_STATES = {
  UNREGISTERED: 'UNREGISTERED',
  DISCOVERED: 'DISCOVERED',
  IDENTITY_SAVED: 'IDENTITY_SAVED',
  READY: 'READY',
  TERMINATED: 'TERMINATED'
}

/**
 * Valid state transitions
 */
const REGISTRY_TRANSITIONS = {
  [REGISTRY_STATES.UNREGISTERED]: [REGISTRY_STATES.DISCOVERED],
  [REGISTRY_STATES.DISCOVERED]: [REGISTRY_STATES.IDENTITY_SAVED, REGISTRY_STATES.TERMINATED],
  [REGISTRY_STATES.IDENTITY_SAVED]: [REGISTRY_STATES.READY, REGISTRY_STATES.TERMINATED],
  [REGISTRY_STATES.READY]: [REGISTRY_STATES.TERMINATED],
  [REGISTRY_STATES.TERMINATED]: []
}

function isValidTransition (from, to) {
  const allowed = REGISTRY_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

module.exports = {
  REGISTRY_STATES,
  REGISTRY_TRANSITIONS,
  isValidTransition
}
