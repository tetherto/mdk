# Form Components & Utilities

Enhanced form system built on top of [react-hook-form](https://react-hook-form.com/) with pre-built components, hooks, and validation utilities to reduce boilerplate and improve developer experience.

## Table of Contents

- [Quick Start](#quick-start)
- [Pre-built Field Components](#pre-built-field-components)
- [Custom Hooks](#custom-hooks)
- [Validation Utilities](#validation-utilities)
- [Type Safety](#type-safety)
- [Advanced Examples](#advanced-examples)

## Quick Start

### Before (Basic Approach)

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
} from '@tetherto/core'

const schema = z.object({
  email: z.string().email('Invalid email'),
})

function MyForm() {
  const form = useForm({ resolver: zodResolver(schema) })

  return (
    <Form form={form} onSubmit={form.handleSubmit(console.log)}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}
```

### After (Enhanced Approach)

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormInput, validators } from '@tetherto/core'

const schema = z.object({
  email: validators.email(),
})

function MyForm() {
  const form = useForm({ resolver: zodResolver(schema) })

  return (
    <Form form={form} onSubmit={form.handleSubmit(console.log)}>
      <FormInput
        control={form.control}
        name="email"
        label="Email"
        description="We'll never share your email"
      />
    </Form>
  )
}
```

**Benefits:** 50% less code, cleaner syntax, built-in best practices.

## Pre-built Field Components

All pre-built components automatically handle:
- Field registration with react-hook-form
- Label and error message display
- Accessibility (ARIA attributes)
- Validation state styling

**Available Components:** FormInput, FormTextArea, FormSelect, FormCheckbox, FormSwitch, FormRadioGroup, FormDatePicker, FormTagInput, FormCascader

### FormInput

Text input field with optional label and description.

```tsx
<FormInput
  control={form.control}
  name="username"
  label="Username"
  placeholder="Enter username"
  description="Your public display name"
  type="text" // or "email", "password", etc.
  variant="search" // optional: adds search icon
/>
```

### FormTextArea

Multi-line text input field.

```tsx
<FormTextArea
  control={form.control}
  name="bio"
  label="Bio"
  placeholder="Tell us about yourself"
  description="Max 200 characters"
/>
```

### FormSelect

Dropdown select field with predefined options.

```tsx
<FormSelect
  control={form.control}
  name="role"
  label="Role"
  placeholder="Select a role"
  options={[
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
    { value: 'guest', label: 'Guest', disabled: true },
  ]}
  description="Your access level"
/>
```

### FormCheckbox

Checkbox input with optional label.

```tsx
<FormCheckbox
  control={form.control}
  name="terms"
  label="Accept terms and conditions"
  layout="row" // or "column"
/>
```

### FormSwitch

Toggle switch input.

```tsx
<FormSwitch
  control={form.control}
  name="notifications"
  label="Enable notifications"
  description="Receive alerts when events occur"
  layout="row" // or "column"
/>
```

### FormRadioGroup

Radio button group with predefined options.

```tsx
<FormRadioGroup
  control={form.control}
  name="priority"
  label="Priority"
  options={[
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ]}
  orientation="horizontal" // or "vertical"
/>
```

### FormDatePicker

Date picker input.

```tsx
<FormDatePicker
  control={form.control}
  name="startDate"
  label="Start Date"
  placeholder="Pick a date"
  description="When should this take effect?"
/>
```

### FormTagInput

Multi-select input with tags and search.

```tsx
<FormTagInput
  control={form.control}
  name="tags"
  label="Tags"
  placeholder="Add tags..."
  options={['React', 'TypeScript', 'Node.js']}
  allowCustomTags={true}
  variant="search"
  description="Select or type custom tags"
/>
```

### FormCascader

Hierarchical select for categories and subcategories.

```tsx
<FormCascader
  control={form.control}
  name="category"
  label="Category"
  placeholder="Select category..."
  multiple
  options={[
    {
      value: 'electronics',
      label: 'Electronics',
      children: [
        { value: 'phones', label: 'Phones' },
        { value: 'laptops', label: 'Laptops' },
      ],
    },
  ]}
  description="Choose categories"
/>
```

## Custom Hooks

### useFormField

Already available in the base form system. Access field state and IDs inside form components.

```tsx
import { useFormField } from '@tetherto/core'

function CustomFormComponent() {
  const { error, isDirty, isTouched, name } = useFormField()
  
  return (
    <div>
      {name}: {error?.message}
    </div>
  )
}
```

### Form Submission (Modern Approach)

React Hook Form already tracks submission state - just use `form.formState.isSubmitting`!

#### Simple Pattern (Recommended)
```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
})

const onSubmit = async (data: FormValues): Promise<void> => {
  await apiClient.createUser(data)
}

return (
  <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
    {/* fields */}
    <Button type="submit" disabled={form.formState.isSubmitting}>
      {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
    </Button>
  </Form>
)
```

#### With Custom Error/Success Messages (Optional)
Only add `useState` if you need custom messages beyond RHF's field errors:

```tsx
import { useState } from 'react'

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
})

const [error, setError] = useState<Error | null>(null)
const [isSuccess, setIsSuccess] = useState(false)

const onSubmit = async (data: FormValues): Promise<void> => {
  setError(null)
  setIsSuccess(false)
  
  try {
    await apiClient.createUser(data)
    setIsSuccess(true)
    toast.success('User created!')
  } catch (err) {
    setError(err as Error)
    toast.error('Failed to create user')
  }
}

return (
  <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
    {/* fields */}
    <Button type="submit" disabled={form.formState.isSubmitting}>
      {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
    </Button>
    {error && <p className="error">{error.message}</p>}
    {isSuccess && <p className="success">Success!</p>}
  </Form>
)
```

**Why this is better:**
- RHF's built-in `formState.isSubmitting` tracks async operations automatically
- No custom hooks needed - minimal boilerplate
- Works perfectly with Zod validation (which is synchronous)
- `useState` only when you actually need custom messages

### useFormReset

Handle form reset with callbacks.

```tsx
import { useFormReset } from '@tetherto/core'

const { resetForm, isDirty } = useFormReset({
  form,
  onAfterReset: () => toast.info('Form reset'),
})

return (
  <Button onClick={resetForm} disabled={!isDirty}>
    Reset
  </Button>
)
```

## Validation Utilities

### Common Validators

Pre-built Zod validators for common field types.

```tsx
import { validators } from '@tetherto/core'
import { z } from 'zod'

const schema = z.object({
  email: validators.email(),
  password: validators.password({ minLength: 8 }),
  username: validators.username({ minLength: 3, maxLength: 20 }),
  phone: validators.phone({ required: false }),
  url: validators.url(),
  macAddress: validators.macAddress(),
  ipAddress: validators.ipAddress(),
  
  // Generic validators
  bio: validators.optionalString({ maxLength: 200 }),
  age: validators.number({ min: 18, max: 120 }),
  terms: validators.requiredBoolean('You must accept the terms'),
  startDate: validators.date({ min: new Date() }),
  role: validators.enum(['admin', 'user', 'guest']),
})
```

### Validation Helpers

```tsx
import {
  createPasswordMatch,
  createDateRange,
  createConditionalRequired,
} from '@tetherto/core'

// Password confirmation
const schema = z.object({
  password: validators.password(),
  confirmPassword: z.string(),
}).refine(...createPasswordMatch('password', 'confirmPassword'))

// Date range validation
const schema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(...createDateRange('startDate', 'endDate'))

// Conditional required field
const schema = z.object({
  type: z.enum(['email', 'phone']),
  email: z.string().optional(),
  phone: z.string().optional(),
})
  .refine(...createConditionalRequired('type', 'email', 'email', 'Email is required'))
  .refine(...createConditionalRequired('type', 'phone', 'phone', 'Phone is required'))
```

### Pre-built Schemas

```tsx
import {
  loginSchema,
  registerSchema,
  profileSchema,
  contactSchema,
} from '@tetherto/core'

// Use directly or extend
const form = useForm({
  resolver: zodResolver(loginSchema),
})

// Extend with custom fields
const extendedSchema = loginSchema.extend({
  rememberDevice: z.boolean(),
})
```

## Type Safety

### Type-safe Field Names

Prevent typos and get autocomplete for field names.

```tsx
import { createFieldNames } from '@tetherto/core'

type FormValues = {
  email: string
  profile: {
    name: string
    age: number
  }
}

const field = createFieldNames<FormValues>()

// Autocomplete and type checking
<FormInput
  control={form.control}
  name={field('email')} // ✓ Type-safe
  label="Email"
/>

<FormInput
  control={form.control}
  name={field('profile.name')} // ✓ Nested fields work
  label="Name"
/>

<FormInput
  control={form.control}
  name={field('invalid')} // ✗ TypeScript error
  label="Invalid"
/>
```

## Advanced Examples

### Complete Registration Form

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormInput,
  FormCheckbox,
  Button,
  validators,
  createPasswordMatch,
  createFieldNames,
} from '@tetherto/core'

const schema = z.object({
  username: validators.username(),
  email: validators.email(),
  password: validators.password(),
  confirmPassword: z.string(),
  terms: validators.requiredBoolean(),
}).refine(...createPasswordMatch('password', 'confirmPassword'))

type FormValues = z.infer<typeof schema>
const field = createFieldNames<FormValues>()

export function RegistrationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues): Promise<void> => {
    await apiClient.register(data)
    router.push('/welcome')
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
      <FormInput
        control={form.control}
        name={field('username')}
        label="Username"
      />
      
      <FormInput
        control={form.control}
        name={field('email')}
        label="Email"
        type="email"
      />
      
      <FormInput
        control={form.control}
        name={field('password')}
        label="Password"
        type="password"
      />
      
      <FormInput
        control={form.control}
        name={field('confirmPassword')}
        label="Confirm Password"
        type="password"
      />
      
      <FormCheckbox
        control={form.control}
        name={field('terms')}
        label="I accept the terms and conditions"
      />
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Creating account...' : 'Sign Up'}
      </Button>
    </Form>
  )
}
```

### Dynamic Field Arrays

```tsx
import { useFieldArray } from 'react-hook-form'

const schema = z.object({
  users: z.array(z.object({
    name: z.string(),
    email: validators.email(),
  })),
})

function DynamicForm() {
  const form = useForm({ resolver: zodResolver(schema) })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'users',
  })

  return (
    <Form form={form} onSubmit={form.handleSubmit(console.log)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <FormInput
            control={form.control}
            name={`users.${index}.name`}
            label="Name"
          />
          <FormInput
            control={form.control}
            name={`users.${index}.email`}
            label="Email"
          />
          <Button onClick={() => remove(index)}>Remove</Button>
        </div>
      ))}
      
      <Button onClick={() => append({ name: '', email: '' })}>
        Add User
      </Button>
    </Form>
  )
}
```

## Migration Guide

### From Basic FormField to Pre-built Components

**Before:**
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} type="email" placeholder="user@example.com" />
      </FormControl>
      <FormDescription>We'll never share your email</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**After:**
```tsx
<FormInput
  control={form.control}
  name="email"
  label="Email"
  type="email"
  placeholder="user@example.com"
  description="We'll never share your email"
/>
```

### From Custom Validators to Built-in Validators

**Before:**
```tsx
const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
})
```

**After:**
```tsx
import { validators } from '@tetherto/core'

const schema = z.object({
  email: validators.email(),
  password: validators.password({ minLength: 8 }),
  username: validators.username({ minLength: 3, maxLength: 20 }),
})
```

## Best Practices

1. **Use pre-built components for standard fields** - Less code, better consistency
2. **Leverage validators for common patterns** - Avoid reinventing validation logic
3. **Use createFieldNames for type safety** - Catch field name typos at compile time
4. **Use `form.formState.isSubmitting`** - React Hook Form tracks async submissions automatically
5. **Extend pre-built schemas** - Start with common schemas and customize as needed
6. **Keep validation logic in schemas** - Don't mix validation in components

## API Reference

See the TypeScript definitions for complete API documentation. All components and utilities are fully typed with JSDoc comments.
