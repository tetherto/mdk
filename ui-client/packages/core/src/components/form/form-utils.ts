import { z } from 'zod'
import type { FieldPath, FieldValues } from 'react-hook-form'

// ─── Type-safe Field Name Inference ──────────────────────────────────────────

/**
 * Extract field names from a form schema with type safety.
 * Useful for creating type-safe field name constants.
 *
 * @example
 * ```tsx
 * type FormValues = { email: string; password: string; nested: { field: string } }
 * type FieldName = FieldName<FormValues> // 'email' | 'password' | 'nested' | 'nested.field'
 * ```
 */
export type FieldName<TFieldValues extends FieldValues> = FieldPath<TFieldValues>

/**
 * Create a type-safe field name accessor for a form schema.
 * Prevents typos and provides autocomplete for field names.
 *
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   email: z.string(),
 *   profile: z.object({
 *     name: z.string(),
 *   }),
 * })
 *
 * type FormValues = z.infer<typeof formSchema>
 * const fields = createFieldNames<FormValues>()
 *
 * // Usage in components - provides autocomplete and type safety
 * <FormInput control={form.control} name={fields('email')} label="Email" />
 * <FormInput control={form.control} name={fields('profile.name')} label="Name" />
 * ```
 */
export function createFieldNames<TFieldValues extends FieldValues>() {
  return <TName extends FieldPath<TFieldValues>>(name: TName): TName => name
}

// ─── Common Validation Schemas ───────────────────────────────────────────────

/**
 * Common validation schemas for frequently used form fields.
 * Built with Zod for use with zodResolver.
 */
export const validators = {
  /**
   * Email validation with custom error message
   */
  email: (options?: { required?: boolean; message?: string }) =>
    options?.required === false
      ? z
          .string()
          .email(options?.message ?? 'Please enter a valid email address')
          .optional()
      : z.string().email(options?.message ?? 'Please enter a valid email address'),

  /**
   * Password validation with minimum length
   */
  password: (options?: { minLength?: number; message?: string }) => {
    const minLength = options?.minLength ?? 8
    return z
      .string()
      .min(minLength, options?.message ?? `Password must be at least ${minLength} characters`)
  },

  /**
   * Username validation (alphanumeric with underscores/hyphens)
   */
  username: (options?: { minLength?: number; maxLength?: number; message?: string }) => {
    const minLength = options?.minLength ?? 3
    const maxLength = options?.maxLength ?? 20
    return z
      .string()
      .min(minLength, `Username must be at least ${minLength} characters`)
      .max(maxLength, `Username must not exceed ${maxLength} characters`)
      .regex(
        /^[\w-]+$/,
        options?.message ?? 'Username can only contain letters, numbers, underscores, and hyphens',
      )
  },

  /**
   * Phone number validation (basic format)
   * Accepts formats: +1234567890, 1234567890, +1-234-567-8900, (123) 456-7890
   * Requires at least 10 digits total
   */
  phone: (options?: { required?: boolean; message?: string }) =>
    options?.required === false
      ? z
          .string()
          .regex(
            /^\+?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
            options?.message ?? 'Please enter a valid phone number',
          )
          .refine(
            (val) => val.replace(/\D/g, '').length >= 10,
            options?.message ?? 'Phone number must contain at least 10 digits',
          )
          .optional()
      : z
          .string()
          .regex(
            /^\+?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
            options?.message ?? 'Please enter a valid phone number',
          )
          .refine(
            (val) => val.replace(/\D/g, '').length >= 10,
            options?.message ?? 'Phone number must contain at least 10 digits',
          ),

  /**
   * URL validation
   */
  url: (options?: { required?: boolean; message?: string }) =>
    options?.required === false
      ? z
          .string()
          .url(options?.message ?? 'Please enter a valid URL')
          .optional()
      : z.string().url(options?.message ?? 'Please enter a valid URL'),

  /**
   * Required string with minimum length
   */
  requiredString: (options?: { minLength?: number; maxLength?: number }) => {
    const minLength = options?.minLength ?? 1
    let schema = z.string().min(minLength, `This field must be at least ${minLength} characters`)

    if (options?.maxLength) {
      schema = schema.max(
        options.maxLength,
        `This field must not exceed ${options.maxLength} characters`,
      )
    }

    return schema
  },

  /**
   * Optional string with maximum length
   */
  optionalString: (options?: { maxLength?: number }) => {
    let schema = z.string().optional()

    if (options?.maxLength) {
      schema = z
        .string()
        .max(options.maxLength, `This field must not exceed ${options.maxLength} characters`)
        .optional()
    }

    return schema
  },

  /**
   * Number within a range
   */
  number: (options?: { min?: number; max?: number; message?: string }) => {
    let schema = z.number(options?.message ? { invalid_type_error: options.message } : undefined)

    if (options?.min !== undefined) {
      schema = schema.min(options.min, `Value must be at least ${options.min}`)
    }

    if (options?.max !== undefined) {
      schema = schema.max(options.max, `Value must not exceed ${options.max}`)
    }

    return schema
  },

  /**
   * Boolean with required true (e.g., for terms acceptance)
   */
  requiredBoolean: (message = 'This field is required') =>
    z.literal(true, {
      errorMap: () => ({ message }),
    }),

  /**
   * Date validation
   */
  date: (options?: { min?: Date; max?: Date; required?: boolean }) => {
    let schema = z.date(
      options?.required === false ? undefined : { required_error: 'Please select a date' },
    )

    if (options?.min) {
      schema = schema.min(options.min, `Date must be after ${options.min.toLocaleDateString()}`)
    }

    if (options?.max) {
      schema = schema.max(options.max, `Date must be before ${options.max.toLocaleDateString()}`)
    }

    return options?.required === false ? schema.optional() : schema
  },

  /**
   * Enum validation with custom error
   */
  enum: <T extends [string, ...string[]]>(values: T, message = 'Please select a valid option') =>
    z.enum(values, { required_error: message }),

  /**
   * MAC address validation
   */
  macAddress: (options?: { required?: boolean; message?: string }) =>
    options?.required === false
      ? z
          .string()
          .regex(
            /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i,
            options?.message ?? 'Please enter a valid MAC address (e.g., 00:11:22:33:44:55)',
          )
          .optional()
      : z
          .string()
          .regex(
            /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i,
            options?.message ?? 'Please enter a valid MAC address (e.g., 00:11:22:33:44:55)',
          ),

  /**
   * IP address validation (IPv4)
   */
  ipAddress: (options?: { required?: boolean; message?: string }) =>
    options?.required === false
      ? z
          .string()
          .regex(
            /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/,
            options?.message ?? 'Please enter a valid IP address',
          )
          .optional()
      : z
          .string()
          .regex(
            /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/,
            options?.message ?? 'Please enter a valid IP address',
          ),
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

/**
 * Create a password confirmation schema that matches another password field.
 *
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   password: validators.password(),
 *   confirmPassword: z.string(),
 * }).refine(...createPasswordMatch('password', 'confirmPassword'))
 * ```
 */
export function createPasswordMatch(
  passwordField: string,
  confirmPasswordField: string,
  message = 'Passwords do not match',
): [(data: Record<string, unknown>) => boolean, { message: string; path: string[] }] {
  return [
    (data) => data[passwordField] === data[confirmPasswordField],
    {
      message,
      path: [confirmPasswordField],
    },
  ]
}

/**
 * Create a custom validation for date ranges (start date must be before end date).
 *
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   startDate: z.date(),
 *   endDate: z.date(),
 * }).refine(...createDateRange('startDate', 'endDate'))
 * ```
 */
export function createDateRange(
  startDateField: string,
  endDateField: string,
  message = 'End date must be after start date',
): [(data: Record<string, unknown>) => boolean, { message: string; path: string[] }] {
  return [
    (data) => {
      const start = data[startDateField] as Date | undefined
      const end = data[endDateField] as Date | undefined
      if (!start || !end) return true
      return start < end
    },
    {
      message,
      path: [endDateField],
    },
  ]
}

/**
 * Create conditional validation where one field is required if another field has a specific value.
 *
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   type: z.enum(['email', 'phone']),
 *   email: z.string().optional(),
 *   phone: z.string().optional(),
 * })
 *   .refine(...createConditionalRequired('type', 'email', 'email', 'Email is required'))
 *   .refine(...createConditionalRequired('type', 'phone', 'phone', 'Phone is required'))
 * ```
 */
export function createConditionalRequired(
  conditionField: string,
  conditionValue: unknown,
  requiredField: string,
  message: string,
): [(data: Record<string, unknown>) => boolean, { message: string; path: string[] }] {
  return [
    (data) => {
      if (data[conditionField] === conditionValue) {
        return !!data[requiredField]
      }
      return true
    },
    {
      message,
      path: [requiredField],
    },
  ]
}

// ─── Common Schema Presets ───────────────────────────────────────────────────

/**
 * Pre-built schema for a login form
 */
export const loginSchema = z.object({
  email: validators.email(),
  password: validators.password(),
  rememberMe: z.boolean().default(false),
})

/**
 * Pre-built schema for a registration form
 */
export const registerSchema = z
  .object({
    username: validators.username(),
    email: validators.email(),
    password: validators.password(),
    confirmPassword: z.string(),
    terms: validators.requiredBoolean('You must accept the terms and conditions'),
  })
  .refine(...createPasswordMatch('password', 'confirmPassword'))

/**
 * Pre-built schema for a profile form
 */
export const profileSchema = z.object({
  username: validators.username(),
  email: validators.email(),
  bio: validators.optionalString({ maxLength: 200 }),
  phone: validators.phone({ required: false }),
  website: validators.url({ required: false }),
})

/**
 * Pre-built schema for a contact form
 */
export const contactSchema = z.object({
  name: validators.requiredString({ minLength: 2 }),
  email: validators.email(),
  subject: validators.requiredString({ minLength: 5, maxLength: 100 }),
  message: validators.requiredString({ minLength: 10, maxLength: 1000 }),
})
