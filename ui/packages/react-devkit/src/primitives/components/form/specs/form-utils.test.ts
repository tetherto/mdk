import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  contactSchema,
  createConditionalRequired,
  createDateRange,
  createFieldNames,
  createPasswordMatch,
  loginSchema,
  profileSchema,
  registerSchema,
  validators,
} from '../form-utils'

describe('form Validators', () => {
  describe('validators.email', () => {
    it('should validate valid email addresses', () => {
      const schema = z.object({ email: validators.email() })
      expect(schema.safeParse({ email: 'test@example.com' }).success).toBe(true)
      expect(schema.safeParse({ email: 'user+tag@domain.co.uk' }).success).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      const schema = z.object({ email: validators.email() })
      expect(schema.safeParse({ email: 'invalid' }).success).toBe(false)
      expect(schema.safeParse({ email: 'test@' }).success).toBe(false)
      expect(schema.safeParse({ email: '@example.com' }).success).toBe(false)
    })

    it('should handle optional emails', () => {
      const schema = z.object({ email: validators.email({ required: false }) })
      expect(schema.safeParse({ email: undefined }).success).toBe(true)
      expect(schema.safeParse({}).success).toBe(true)
    })
  })

  describe('validators.password', () => {
    it('should validate password with default length', () => {
      const schema = z.object({ password: validators.password() })
      expect(schema.safeParse({ password: 'password123' }).success).toBe(true)
      expect(schema.safeParse({ password: 'short' }).success).toBe(false)
    })

    it('should validate password with custom length', () => {
      const schema = z.object({ password: validators.password({ minLength: 12 }) })
      expect(schema.safeParse({ password: 'verylongpassword123' }).success).toBe(true)
      expect(schema.safeParse({ password: 'short' }).success).toBe(false)
    })
  })

  describe('validators.username', () => {
    it('should validate valid usernames', () => {
      const schema = z.object({ username: validators.username() })
      expect(schema.safeParse({ username: 'user123' }).success).toBe(true)
      expect(schema.safeParse({ username: 'test_user' }).success).toBe(true)
      expect(schema.safeParse({ username: 'user-name' }).success).toBe(true)
    })

    it('should reject invalid usernames', () => {
      const schema = z.object({ username: validators.username() })
      expect(schema.safeParse({ username: 'ab' }).success).toBe(false) // too short
      expect(schema.safeParse({ username: 'user name' }).success).toBe(false) // space
      expect(schema.safeParse({ username: 'user@name' }).success).toBe(false) // special char
    })
  })

  describe('validators.phone', () => {
    it('should validate valid phone numbers', () => {
      const schema = z.object({ phone: validators.phone() })
      expect(schema.safeParse({ phone: '+1234567890' }).success).toBe(true)
      expect(schema.safeParse({ phone: '1234567890' }).success).toBe(true)
      expect(schema.safeParse({ phone: '+1-234-567-8900' }).success).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      const schema = z.object({ phone: validators.phone() })
      expect(schema.safeParse({ phone: 'abc' }).success).toBe(false)
      expect(schema.safeParse({ phone: '123' }).success).toBe(false)
    })
  })

  describe('validators.macAddress', () => {
    it('should validate valid MAC addresses', () => {
      const schema = z.object({ mac: validators.macAddress() })
      expect(schema.safeParse({ mac: '00:11:22:33:44:55' }).success).toBe(true)
      expect(schema.safeParse({ mac: 'AA:BB:CC:DD:EE:FF' }).success).toBe(true)
      expect(schema.safeParse({ mac: 'aa-bb-cc-dd-ee-ff' }).success).toBe(true)
    })

    it('should reject invalid MAC addresses', () => {
      const schema = z.object({ mac: validators.macAddress() })
      expect(schema.safeParse({ mac: '00:11:22:33:44' }).success).toBe(false) // too short
      expect(schema.safeParse({ mac: '00:11:22:33:44:GG' }).success).toBe(false) // invalid hex
    })
  })

  describe('validators.ipAddress', () => {
    it('should validate valid IPv4 addresses', () => {
      const schema = z.object({ ip: validators.ipAddress() })
      expect(schema.safeParse({ ip: '192.168.1.1' }).success).toBe(true)
      expect(schema.safeParse({ ip: '10.0.0.1' }).success).toBe(true)
      expect(schema.safeParse({ ip: '255.255.255.255' }).success).toBe(true)
    })

    it('should reject invalid IP addresses', () => {
      const schema = z.object({ ip: validators.ipAddress() })
      expect(schema.safeParse({ ip: '256.1.1.1' }).success).toBe(false) // out of range
      expect(schema.safeParse({ ip: '192.168.1' }).success).toBe(false) // incomplete
      expect(schema.safeParse({ ip: 'not-an-ip' }).success).toBe(false)
    })
  })
})

describe('type-safe Field Names', () => {
  it('should create type-safe field name accessor', () => {
    type FormValues = {
      email: string
      profile: {
        name: string
      }
    }

    const field = createFieldNames<FormValues>()

    expect(field('email')).toBe('email')
    expect(field('profile.name')).toBe('profile.name')
  })
})

describe('validation Helpers', () => {
  describe('createPasswordMatch', () => {
    it('should validate matching passwords', () => {
      const schema = z
        .object({
          password: z.string(),
          confirmPassword: z.string(),
        })
        .refine(...createPasswordMatch('password', 'confirmPassword'))

      expect(schema.safeParse({ password: 'test123', confirmPassword: 'test123' }).success).toBe(
        true,
      )
      expect(schema.safeParse({ password: 'test123', confirmPassword: 'different' }).success).toBe(
        false,
      )
    })
  })

  describe('createDateRange', () => {
    it('should validate date ranges', () => {
      const schema = z
        .object({
          startDate: z.date(),
          endDate: z.date(),
        })
        .refine(...createDateRange('startDate', 'endDate'))

      const start = new Date('2024-01-01')
      const end = new Date('2024-12-31')
      const invalidEnd = new Date('2023-12-31')

      expect(schema.safeParse({ startDate: start, endDate: end }).success).toBe(true)
      expect(schema.safeParse({ startDate: start, endDate: invalidEnd }).success).toBe(false)
    })
  })

  describe('createConditionalRequired', () => {
    it('should conditionally require fields', () => {
      const schema = z
        .object({
          type: z.enum(['email', 'phone']),
          email: z.string().optional(),
          phone: z.string().optional(),
        })
        .refine(...createConditionalRequired('type', 'email', 'email', 'Email is required'))
        .refine(...createConditionalRequired('type', 'phone', 'phone', 'Phone is required'))

      expect(schema.safeParse({ type: 'email', email: 'test@example.com' }).success).toBe(true)
      expect(schema.safeParse({ type: 'email', phone: '1234567890' }).success).toBe(false)
      expect(schema.safeParse({ type: 'phone', phone: '1234567890' }).success).toBe(true)
      expect(schema.safeParse({ type: 'phone', email: 'test@example.com' }).success).toBe(false)
    })
  })
})

describe('pre-built Schemas', () => {
  it('should validate login schema', () => {
    expect(
      loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      }).success,
    ).toBe(true)

    expect(
      loginSchema.safeParse({
        email: 'invalid',
        password: 'short',
        rememberMe: false,
      }).success,
    ).toBe(false)
  })

  it('should validate register schema', () => {
    expect(
      registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        terms: true,
      }).success,
    ).toBe(true)

    expect(
      registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different',
        terms: true,
      }).success,
    ).toBe(false)
  })

  it('should validate profile schema', () => {
    expect(
      profileSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        bio: 'This is my bio',
        phone: '+1234567890',
        website: 'https://example.com',
      }).success,
    ).toBe(true)

    expect(
      profileSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
      }).success,
    ).toBe(true)
  })

  it('should validate contact schema', () => {
    expect(
      contactSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'This is a test message with enough characters.',
      }).success,
    ).toBe(true)

    expect(
      contactSchema.safeParse({
        name: 'J',
        email: 'invalid',
        subject: 'Test',
        message: 'Short',
      }).success,
    ).toBe(false)
  })
})
