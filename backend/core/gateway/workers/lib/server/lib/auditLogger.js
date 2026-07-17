'use strict'

/**
 * Logs sensitive operations for security monitoring
 */
class AuditLogger {
  constructor () {
    this.config = this.loadConfig()
  }

  setConfig (conf) {
    this.config = conf
  }

  loadConfig () {
    // Default configuration
    return {
      auditLogging: {
        enabled: false,
        logLevel: 'INFO',
        sensitiveOperations: [
          'user.update',
          'user.create',
          'user.delete',
          'role.change'
        ]
      }
    }
  }

  shouldLog (operation) {
    if (!this.config.auditLogging.enabled) return false
    return this.config.auditLogging.sensitiveOperations.includes(operation)
  }

  log (operation, details) {
    if (!this.shouldLog(operation)) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      level: this.config.auditLogging.logLevel,
      ...details
    }

    console.log(`[AUDIT] ${JSON.stringify(logEntry)}`)
  }

  logUserUpdate (userId, userEmail, updatedBy, changes) {
    this.log('user.update', {
      userId,
      userEmail,
      updatedBy,
      changes: this.sanitizeChanges(changes)
    })
  }

  logUserCreate (userEmail, createdBy, role) {
    this.log('user.create', {
      userEmail,
      createdBy,
      role
    })
  }

  logUserDelete (userId, userEmail, deletedBy) {
    this.log('user.delete', {
      userId,
      userEmail,
      deletedBy
    })
  }

  logRoleChange (userId, userEmail, oldRole, newRole, changedBy) {
    this.log('role.change', {
      userId,
      userEmail,
      oldRole,
      newRole,
      changedBy
    })
  }

  logSecurityEvent (event, details) {
    this.log('security.event', {
      event,
      ...details,
      severity: details.severity || 'WARNING'
    })
  }

  sanitizeChanges (changes) {
    // Remove sensitive data from logs
    const sanitized = { ...changes }
    delete sanitized.password
    delete sanitized.token
    delete sanitized.secret
    return sanitized
  }
}

// Singleton instance
const auditLogger = new AuditLogger()

module.exports = {
  auditLogger,
  AuditLogger
}
