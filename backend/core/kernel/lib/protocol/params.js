'use strict'

/**
 * Command params against the contract's declared `params` list
 * ({ name, type, required?, enum?, min?, max? } per mdk-contract.schema.json),
 * shared by the Kernel dispatcher and the Worker runtime so both apply the
 * same rules.
 */

/**
 * Validate params before they are queued or reach a handler. Undeclared keys
 * pass through; a declared key that is absent, or null, is only an error when
 * it is `required`.
 *
 * Returns null when params are valid, or an ERR_PARAM_* string naming the
 * first offending param.
 */
function validateParams (declared, params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return 'ERR_PARAMS_INVALID'
  if (!Array.isArray(declared)) return null

  for (const def of declared) {
    if (!def || typeof def.name !== 'string') continue
    const value = Object.hasOwn(params, def.name) ? params[def.name] : undefined

    if (value === undefined || value === null) {
      if (def.required === true) return `ERR_PARAM_REQUIRED: ${def.name}`
      continue
    }

    if (def.type && !_isType(value, def.type)) return `ERR_PARAM_TYPE: ${def.name} must be ${def.type}`

    if (Array.isArray(def.enum) && !def.enum.includes(value)) return `ERR_PARAM_ENUM: ${def.name}`

    if (typeof value === 'number') {
      if (typeof def.min === 'number' && value < def.min) return `ERR_PARAM_RANGE: ${def.name} below min ${def.min}`
      if (typeof def.max === 'number' && value > def.max) return `ERR_PARAM_RANGE: ${def.name} above max ${def.max}`
    }
  }
  return null
}

function _isType (value, type) {
  switch (type) {
    case 'number': return typeof value === 'number' && Number.isFinite(value)
    case 'string': return typeof value === 'string'
    case 'boolean': return typeof value === 'boolean'
    // The schema has no `array` type, so list params (switchSocket's `args`,
    // setupPools' `pools`) are declared `object`: arrays must pass.
    case 'object': return typeof value === 'object'
    // An unknown declared type is a contract problem, not a caller one; the
    // schema restricts `type`, so there is nothing safe to check here.
    default: return true
  }
}

// The Kernel's action-approver dispatches write actions positionally —
// `{ value: x }` for one argument, `{ args: [...] }` for several (the
// legacy applyThings consumed Object.values). Map those onto the
// contract-declared param names so handlers only ever see named params.
// Params that already look named (or commands without declared params)
// pass through untouched.
function normalizeParams (declared, params) {
  const names = Array.isArray(declared) ? declared.map((p) => p && p.name) : []
  if (!names.length) return params || {}

  let positional = null
  if (Array.isArray(params)) {
    positional = params
  } else if (params && Array.isArray(params.args) && Object.keys(params).length === 1 && !names.includes('args')) {
    positional = params.args
  } else if (params && Object.keys(params).length === 1 && 'value' in params && !names.includes('value')) {
    positional = [params.value]
  }
  if (!positional) return params || {}

  const named = {}
  names.forEach((name, i) => {
    if (positional[i] !== undefined) named[name] = positional[i]
  })
  return named
}

module.exports = { validateParams, normalizeParams }
