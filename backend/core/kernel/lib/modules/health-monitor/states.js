'use strict'

/**
 * Health Monitor States
 *
 * UNKNOWN → HEALTHY → SICK → DEAD
 *
 * - UNKNOWN: Worker just registered, no ping yet
 * - HEALTHY: Last ping succeeded
 * - SICK: 1+ consecutive failures (< threshold)
 * - DEAD: N consecutive failures (>= threshold)
 *
 * SICK and DEAD workers are not routable — the Registry
 * halts command routing to them.
 */

const HEALTH_STATES = {
  UNKNOWN: 'UNKNOWN',
  HEALTHY: 'HEALTHY',
  SICK: 'SICK',
  DEAD: 'DEAD'
}

const HEALTH_TRANSITIONS = {
  [HEALTH_STATES.UNKNOWN]: [HEALTH_STATES.HEALTHY, HEALTH_STATES.SICK],
  [HEALTH_STATES.HEALTHY]: [HEALTH_STATES.SICK],
  [HEALTH_STATES.SICK]: [HEALTH_STATES.HEALTHY, HEALTH_STATES.DEAD],
  [HEALTH_STATES.DEAD]: [HEALTH_STATES.HEALTHY]
}

module.exports = {
  HEALTH_STATES,
  HEALTH_TRANSITIONS
}
