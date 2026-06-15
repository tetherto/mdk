'use strict'

function dequeueRequests (requests, key, data, err = null) {
  requests.get(key).forEach(({ resolve, reject }) => {
    if (err) reject(err)
    else resolve(data)
  })
  requests.delete(key)
}

async function cachedRoute (ctx, ckeyParts, apiPath, func, overwriteCache = false) {
  const lru = ctx[`lru_${ctx.conf.cacheTiming[apiPath] || '30s'}`]
  if (!lru) throw new Error('INTERNAL_SERVER_ERROR')

  const ckey = ckeyParts.map(k => k ?? '-').join(':')

  if (!overwriteCache) {
    const cached = lru.get(ckey)
    if (cached !== undefined) return cached
  }

  const requests = ctx.queuedRequests

  if (requests.has(ckey)) {
    return new Promise((resolve, reject) => {
      requests.get(ckey).push({ resolve, reject })
    })
  }

  requests.set(ckey, [])

  let data
  try {
    data = await func()
  } catch (err) {
    dequeueRequests(requests, ckey, null, err)
    throw err
  }

  lru.set(ckey, data)
  dequeueRequests(requests, ckey, data)

  return data
}

module.exports = { cachedRoute }
