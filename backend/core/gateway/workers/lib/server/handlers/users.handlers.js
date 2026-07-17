'use strict'

const { SUPER_ADMIN_ROLE, SUPER_ADMIN_ID } = require('../../constants')
const { isValidEmail } = require('../../utils')
const { auditLogger } = require('../lib/auditLogger')

async function createUser (ctx, req, res) {
  _validateUserFields(ctx, req.body.data)
  const { email, name, role } = req.body.data
  const createdBy = req._info.user.metadata.email

  _validateRole(ctx, req._info.user, role)

  const result = await ctx.userService.createUser({ email, name, role })

  // Audit logging for user creation
  auditLogger.logUserCreate(email, createdBy, role)

  return result
}

async function listUsers (ctx, req, res) {
  const users = await ctx.userService.listUsers()

  const userRole = JSON.parse(req._info.user.metadata.roles)[0]
  if (userRole === SUPER_ADMIN_ROLE) {
    return users
  }

  const allowedRoles = new Set(ctx.auth_a0.conf.roleManagement[userRole] || [])
  return users.filter((user) => allowedRoles.has(user.role))
}

async function updateUser (ctx, req, res) {
  _validateUserFields(ctx, req.body.data)
  const { id, email, name, role } = req.body.data
  const updatedBy = req._info.user.metadata.email

  // Prevent super admin modification
  if (id.toString() === SUPER_ADMIN_ID) {
    auditLogger.logSecurityEvent('SUPER_ADMIN_MODIFICATION_ATTEMPT', {
      userId: id,
      updatedBy,
      attemptedChanges: { email, role }
    })
    throw new Error('ERR_NOT_ALLOWED')
  }

  _validateRole(ctx, req._info.user, role)
  await _validateRoleByUserId(ctx, req._info.user, id)

  // Get current user data for audit logging
  let oldRole = null
  try {
    const currentUser = await ctx.userService.getUser(id)
    oldRole = JSON.parse(currentUser.roles)[0]
  } catch (error) {
    // User does not exist, log and throw error as updateUser will fail anyway
    auditLogger.logSecurityEvent('USER_UPDATE_FAILED_USER_NOT_FOUND', {
      userId: id,
      updatedBy,
      error: error.message
    })
    throw new Error('ERR_USER_NOT_FOUND')
  }

  const result = await ctx.userService.updateUser({ id, email, name, role })

  // Audit logging for sensitive operations
  auditLogger.logUserUpdate(id, email, updatedBy, {
    oldRole,
    newRole: role,
    changes: { email, role }
  })

  return result
}

function _validateUserFields (ctx, data) {
  const { email, role } = data

  if (!isValidEmail(email)) {
    throw new Error('ERR_INVALID_EMAIL')
  }

  if (!ctx.auth_a0.conf.roles[role]) {
    throw new Error('ERR_INVALID_ROLE')
  }
}

async function _validateRoleByUserId (ctx, user, targetUserId) {
  const targetUser = await ctx.userService.getUser(targetUserId)
  _validateRole(ctx, user, JSON.parse(targetUser.roles)[0])
}

function _validateRole (ctx, user, role) {
  const userRole = JSON.parse(user.metadata.roles)[0]
  if (userRole === SUPER_ADMIN_ROLE) {
    return
  }

  const allowedRoles = ctx.auth_a0.conf.roleManagement[userRole]

  if (!allowedRoles?.includes(role)) {
    throw new Error('ERR_AUTH_FAIL_NO_PERMS')
  }
}

async function deleteUser (ctx, req, res) {
  const { id } = req.body.data
  const deletedBy = req._info.user.metadata.email

  const isSelf = req._info.user.userId === id
  if (isSelf) {
    throw new Error('ERR_AUTH_FAIL_NO_PERMS')
  }

  await _validateRoleByUserId(ctx, req._info.user, id)

  // Get user data for audit logging before deletion
  let userEmail
  try {
    const user = await ctx.userService.getUser(id)
    userEmail = user.email
  } catch (error) {
    // User does not exist, log and throw error as deleteUser will fail anyway
    auditLogger.logSecurityEvent('USER_DELETE_FAILED_USER_NOT_FOUND', {
      userId: id,
      deletedBy,
      error: error.message
    })
    throw new Error('ERR_USER_NOT_FOUND')
  }

  const result = await ctx.userService.deleteUser(id)
  auditLogger.logUserDelete(id, userEmail, deletedBy)

  return result
}

async function saveUserSettings (ctx, req, res) {
  const userId = req._info.user.userId
  const settings = req.body.settings
  return await ctx.globalDataLib.setUserSettings(userId, settings)
}

async function getUserSettings (ctx, req, res) {
  const userId = req._info.user.userId
  return await ctx.globalDataLib.getUserSettings(userId)
}

function getRolesPermissions (ctx, req) {
  const { roles, roleManagement } = ctx.auth_a0.conf
  const userRole = JSON.parse(req._info.user.metadata.roles)[0]

  if (userRole === SUPER_ADMIN_ROLE) {
    return { roles }
  }

  const allowedRoles = roleManagement[userRole] || []
  const filteredRoles = {}
  for (const role of allowedRoles) {
    if (roles[role]) {
      filteredRoles[role] = roles[role]
    }
  }

  return { roles: filteredRoles }
}

module.exports = {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  saveUserSettings,
  getUserSettings,
  getRolesPermissions
}
