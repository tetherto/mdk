'use strict'

/**
 * Proxy that exposes each action name as a method for ActionApprover execution.
 * @param {import('../action-caller').ActionCaller} actionCaller
 */
function createActionCallerProxy (actionCaller) {
  return new Proxy(actionCaller, {
    get: (target, property, receiver) => {
      if (typeof target[property] === 'undefined') {
        return (...payload) => {
          const [params, targets] = payload
          return target.callTargets(property, params, targets)
        }
      }
      return Reflect.get(target, property, receiver)
    }
  })
}

module.exports = { createActionCallerProxy }
