'use strict'

const test = require('brittle')
const { auditLogger, AuditLogger } = require('../../../workers/lib/server/lib/auditLogger')
const { randomUUID } = require('crypto')

test('AuditLogger - constructor initializes with default config', (t) => {
  const logger = new AuditLogger()

  t.ok(logger.config, 'should have config')
  t.ok(logger.config.auditLogging, 'should have auditLogging config')
  t.is(logger.config.auditLogging.enabled, false, 'should default to disabled')
  t.is(logger.config.auditLogging.logLevel, 'INFO', 'should have INFO log level')
  t.ok(Array.isArray(logger.config.auditLogging.sensitiveOperations), 'should have sensitiveOperations array')

  t.pass()
})

test('AuditLogger - setConfig updates config', (t) => {
  const logger = new AuditLogger()
  const newConfig = {
    auditLogging: {
      enabled: true,
      logLevel: 'DEBUG',
      sensitiveOperations: ['test.operation']
    }
  }

  logger.setConfig(newConfig)

  t.is(logger.config.auditLogging.enabled, true, 'should update enabled')
  t.is(logger.config.auditLogging.logLevel, 'DEBUG', 'should update log level')
  t.is(logger.config.auditLogging.sensitiveOperations[0], 'test.operation', 'should update operations')

  t.pass()
})

test('AuditLogger - shouldLog returns false when disabled', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: false,
      sensitiveOperations: ['user.update']
    }
  })

  const result = logger.shouldLog('user.update')

  t.is(result, false, 'should return false when disabled')

  t.pass()
})

test('AuditLogger - shouldLog returns true for sensitive operation when enabled', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['user.update']
    }
  })

  const result = logger.shouldLog('user.update')

  t.is(result, true, 'should return true for sensitive operation')

  t.pass()
})

test('AuditLogger - shouldLog returns false for non-sensitive operation', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['user.update']
    }
  })

  const result = logger.shouldLog('other.operation')

  t.is(result, false, 'should return false for non-sensitive operation')

  t.pass()
})

test('AuditLogger - log does not log when shouldLog returns false', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: false,
      sensitiveOperations: ['user.update']
    }
  })

  const originalLog = console.log
  let logCalled = false
  console.log = function () {
    logCalled = true
  }

  logger.log('user.update', { test: 'data' })

  console.log = originalLog

  t.is(logCalled, false, 'should not call console.log when disabled')

  t.pass()
})

test('AuditLogger - log logs when shouldLog returns true', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      logLevel: 'INFO',
      sensitiveOperations: ['user.update']
    }
  })

  const originalLog = console.log
  let logMessage = null
  console.log = function (message) {
    logMessage = message
  }

  logger.log('user.update', { userId: 123 })

  console.log = originalLog

  t.ok(logMessage, 'should call console.log')
  t.ok(logMessage.includes('[AUDIT]'), 'should include AUDIT prefix')
  t.ok(logMessage.includes('user.update'), 'should include operation')

  t.pass()
})

test('AuditLogger - logUserUpdate logs user update', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['user.update']
    }
  })

  const originalLog = console.log
  let logMessage = null
  console.log = function (message) {
    logMessage = message
  }

  logger.logUserUpdate(123, 'test@example.com', 'admin@example.com', { role: 'admin' })

  console.log = originalLog

  t.ok(logMessage, 'should log user update')
  t.ok(logMessage.includes('user.update'), 'should include operation type')

  t.pass()
})

test('AuditLogger - logUserCreate logs user creation', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['user.create']
    }
  })

  const originalLog = console.log
  let logMessage = null
  console.log = function (message) {
    logMessage = message
  }

  logger.logUserCreate('test@example.com', 'admin@example.com', 'admin')

  console.log = originalLog

  t.ok(logMessage, 'should log user creation')
  t.ok(logMessage.includes('user.create'), 'should include operation type')

  t.pass()
})

test('AuditLogger - logUserDelete logs user deletion', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['user.delete']
    }
  })

  const originalLog = console.log
  let logMessage = null
  console.log = function (message) {
    logMessage = message
  }

  logger.logUserDelete(123, 'test@example.com', 'admin@example.com')

  console.log = originalLog

  t.ok(logMessage, 'should log user deletion')
  t.ok(logMessage.includes('user.delete'), 'should include operation type')

  t.pass()
})

test('AuditLogger - logRoleChange logs role change', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['role.change']
    }
  })

  const originalLog = console.log
  let logMessage = null
  console.log = function (message) {
    logMessage = message
  }

  logger.logRoleChange(123, 'test@example.com', 'user', 'admin', 'admin@example.com')

  console.log = originalLog

  t.ok(logMessage, 'should log role change')
  t.ok(logMessage.includes('role.change'), 'should include operation type')

  t.pass()
})

test('AuditLogger - logSecurityEvent logs security event', (t) => {
  const logger = new AuditLogger()
  logger.setConfig({
    auditLogging: {
      enabled: true,
      sensitiveOperations: ['security.event']
    }
  })

  const originalLog = console.log
  let logMessage = null
  console.log = function (message) {
    logMessage = message
  }

  logger.logSecurityEvent('LOGIN_FAILED', { userId: 123 })

  console.log = originalLog

  t.ok(logMessage, 'should log security event')
  t.ok(logMessage.includes('security.event'), 'should include operation type')

  t.pass()
})

test('AuditLogger - sanitizeChanges removes sensitive fields', (t) => {
  const logger = new AuditLogger()
  const changes = {
    email: 'test@example.com',
    password: randomUUID(),
    token: 'token123',
    secret: 'secret456',
    role: 'admin'
  }

  const sanitized = logger.sanitizeChanges(changes)

  t.ok(sanitized.email, 'should keep email')
  t.ok(sanitized.role, 'should keep role')
  t.ok(!sanitized.password, 'should remove password')
  t.ok(!sanitized.token, 'should remove token')
  t.ok(!sanitized.secret, 'should remove secret')

  t.pass()
})

test('auditLogger - singleton instance exists', (t) => {
  t.ok(auditLogger, 'should export singleton instance')
  t.ok(auditLogger.config, 'should have config')
  t.ok(auditLogger.log, 'should have log method')

  t.pass()
})
