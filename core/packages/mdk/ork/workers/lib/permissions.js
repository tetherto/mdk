'use strict'

const { PERMISSION_LEVELS } = require('./constants')

const hasPermission = (permissions, requestedPerm) => {
  if (requestedPerm) {
    if (permissions.includes(requestedPerm)) {
      return true
    }

    // Check between segregated read and write
    const [requestedAccess, requestLevel] = requestedPerm.split(':')
    const requestedLevels = requestLevel.split('')

    return permissions.some((permission) => {
      const [access, levels] = permission.split(':')
      const accessPresent = access === requestedAccess
      const levelPresent = requestedLevels.every((level) => levels.split('').includes(level))
      return accessPresent && levelPresent
    })
  }

  return false
}

const hasWritePermission = (permissions, baseType) => {
  return hasPermission(permissions, `${baseType}:${PERMISSION_LEVELS.WRITE}`)
}

const hasReadPermission = (permissions, baseType) => {
  return hasPermission(permissions, `${baseType}:${PERMISSION_LEVELS.READ}`)
}

const hasReadWritePermission = (permissions, baseType) => {
  return hasPermission(permissions, `${baseType}:${PERMISSION_LEVELS.READ_WRITE}`)
}

module.exports = {
  hasWritePermission,
  hasReadPermission,
  hasReadWritePermission,
  hasPermission
}
