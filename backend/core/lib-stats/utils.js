'use strict'

function pathResolve (keypath) {
  // eslint-disable-next-line no-new-func
  return new Function('root', `
    try { return root.${keypath}; }
    catch(e){ return undefined; }
 `)
}

function getVal (entry, src) {
  if (!src) {
    return null
  }

  if (typeof src === 'function') {
    return src(entry)
  }

  if (typeof src === 'string') {
    return pathResolve(src)(entry)
  }

  return null
}

const groupBy = (field) => {
  return (entry, ext) => {
    if (!ext) {
      return null
    }
    return getVal(ext, field)
  }
}

module.exports = {
  getVal,
  groupBy
}
