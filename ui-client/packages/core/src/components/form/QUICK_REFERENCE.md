# Form System Quick Reference

Quick reference guide for the enhanced form system. Copy and paste examples to get started fast.

## 🚀 Quick Start

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormInput,
  FormSelect,
  Button,
  validators,
  createFieldNames,
} from '@tetherto/core'

// 1. Define schema with validators
const schema = z.object({
  email: validators.email(),
  role: validators.enum(['admin', 'user']),
})

type FormValues = z.infer<typeof schema>
const field = createFieldNames<FormValues>()

// 2. Create form component
function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues): Promise<void> => {
    await apiClient.save(data)
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
      <FormInput
        control={form.control}
        name={field('email')}
        label="Email"
      />
      
      <FormSelect
        control={form.control}
        name={field('role')}
        label="Role"
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'user', label: 'User' },
        ]}
      />
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving...' : 'Submit'}
      </Button>
    </Form>
  )
}
```

## 📦 Component Cheat Sheet

### FormInput
```tsx
<FormInput
  control={form.control}
  name="fieldName"
  label="Label"
  type="email"              // optional
  variant="search"          // optional: default | search
  placeholder="Placeholder"
  description="Help text"
/>
```

### FormTextArea
```tsx
<FormTextArea
  control={form.control}
  name="fieldName"
  label="Label"
  placeholder="Placeholder"
  description="Help text"
/>
```

### FormSelect
```tsx
<FormSelect
  control={form.control}
  name="fieldName"
  label="Label"
  placeholder="Select..."
  options={[
    { value: 'val1', label: 'Label 1' },
    { value: 'val2', label: 'Label 2', disabled: true },
  ]}
  description="Help text"
/>
```

### FormCheckbox
```tsx
<FormCheckbox
  control={form.control}
  name="fieldName"
  label="Accept terms"
  layout="row"              // row | column
  description="Help text"
/>
```

### FormSwitch
```tsx
<FormSwitch
  control={form.control}
  name="fieldName"
  label="Enable feature"
  layout="row"              // row | column
  description="Help text"
/>
```

### FormRadioGroup
```tsx
<FormRadioGroup
  control={form.control}
  name="fieldName"
  label="Label"
  options={[
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ]}
  orientation="horizontal"  // horizontal | vertical
  description="Help text"
/>
```

### FormDatePicker
```tsx
<FormDatePicker
  control={form.control}
  name="fieldName"
  label="Label"
  placeholder="Pick a date"
  description="Help text"
/>
```

### FormTagInput
```tsx
<FormTagInput
  control={form.control}
  name="fieldName"
  label="Label"
  placeholder="Add tags..."
  options={['Tag1', 'Tag2', 'Tag3']}
  allowCustomTags={true}     // Allow typing custom tags
  variant="search"            // default | search
  description="Help text"
/>
```

### FormCascader
```tsx
<FormCascader
  control={form.control}
  name="fieldName"
  label="Label"
  placeholder="Select..."
  multiple                    // Enable multi-select
  options={[
    {
      value: 'parent1',
      label: 'Parent 1',
      children: [
        { value: 'child1', label: 'Child 1' },
        { value: 'child2', label: 'Child 2' },
      ],
    },
  ]}
  description="Help text"
/>
```

## 🔐 Validator Cheat Sheet

```tsx
import { validators } from '@tetherto/core'

const schema = z.object({
  // Text validators
  email: validators.email(),
  email_opt: validators.email({ required: false }),
  password: validators.password({ minLength: 8 }),
  username: validators.username({ minLength: 3, maxLength: 20 }),
  
  // String validators
  required: validators.requiredString({ minLength: 1, maxLength: 100 }),
  optional: validators.optionalString({ maxLength: 200 }),
  
  // Network validators
  phone: validators.phone(),
  phone_opt: validators.phone({ required: false }),
  url: validators.url(),
  url_opt: validators.url({ required: false }),
  macAddress: validators.macAddress(),
  ipAddress: validators.ipAddress(),
  
  // Number validators
  age: validators.number({ min: 18, max: 120 }),
  
  // Boolean validators
  terms: validators.requiredBoolean('You must accept'),
  
  // Date validators
  date: validators.date(),
  date_opt: validators.date({ required: false }),
  date_range: validators.date({ 
    min: new Date('2024-01-01'),
    max: new Date('2024-12-31')
  }),
  
  // Enum validators
  role: validators.enum(['admin', 'user', 'guest']),
})
```

## 🔧 Validation Helpers

### Password Confirmation
```tsx
const schema = z.object({
  password: validators.password(),
  confirmPassword: z.string(),
}).refine(...createPasswordMatch('password', 'confirmPassword'))
```

### Date Range
```tsx
const schema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(...createDateRange('startDate', 'endDate'))
```

### Conditional Required
```tsx
const schema = z.object({
  type: z.enum(['email', 'phone']),
  email: z.string().optional(),
  phone: z.string().optional(),
})
  .refine(...createConditionalRequired('type', 'email', 'email', 'Email required'))
  .refine(...createConditionalRequired('type', 'phone', 'phone', 'Phone required'))
```

## 🪝 Hook Cheat Sheet

### Built-in RHF State (Default - Recommended)
```tsx
// React Hook Form already tracks submission state!
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
})

const onSubmit = async (data: FormValues): Promise<void> => {
  await api.save(data)
}

// RHF automatically tracks isSubmitting during async operations
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

### Optional: Custom Error/Success Messages
Only add `useState` if you need custom success/error messages beyond RHF's field errors:

```tsx
const [error, setError] = useState<Error | null>(null)
const [isSuccess, setIsSuccess] = useState(false)

const onSubmit = async (data: FormValues): Promise<void> => {
  setError(null)
  setIsSuccess(false)
  
  try {
    await api.save(data)
    setIsSuccess(true)
    toast.success('Saved!')
  } catch (err) {
    setError(err as Error)
    toast.error(err.message)
  }
}

{error && <p className="error">{error.message}</p>}
{isSuccess && <p className="success">Success!</p>}
```

### useFormReset
```tsx
const { resetForm, isDirty } = useFormReset({
  form,
  onAfterReset: () => toast.info('Form reset'),
})

<Button onClick={resetForm} disabled={!isDirty}>
  Reset
</Button>
```

### useFormField (built-in)
```tsx
// Use inside FormField render prop or custom components
const { error, isDirty, isTouched, name } = useFormField()
```

## 📋 Pre-built Schemas

```tsx
import {
  loginSchema,
  registerSchema,
  profileSchema,
  contactSchema,
} from '@tetherto/core'

// Use directly
const form = useForm({
  resolver: zodResolver(loginSchema),
})

// Or extend
const extendedLogin = loginSchema.extend({
  rememberDevice: z.boolean(),
})
```

### Available Schemas

**loginSchema:**
- email
- password
- rememberMe (boolean)

**registerSchema:**
- username
- email
- password
- confirmPassword (auto-validated)
- terms (required true)

**profileSchema:**
- username
- email
- bio (optional, max 200)
- phone (optional)
- website (optional)

**contactSchema:**
- name
- email
- subject
- message

## 🎯 Type-Safe Field Names

```tsx
type FormValues = {
  email: string
  profile: {
    name: string
    age: number
  }
}

const field = createFieldNames<FormValues>()

// Get autocomplete and type checking
<FormInput control={form.control} name={field('email')} />
<FormInput control={form.control} name={field('profile.name')} />
<FormInput control={form.control} name={field('invalid')} /> // ❌ Error
```

## 🎨 Common Patterns

### Login Form
```tsx
const form = useForm({
  resolver: zodResolver(loginSchema),
})

const onSubmit = async (data: LoginFormValues): Promise<void> => {
  await auth.login(data)
}

<Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
  <FormInput control={form.control} name="email" label="Email" />
  <FormInput control={form.control} name="password" label="Password" type="password" />
  <FormCheckbox control={form.control} name="rememberMe" label="Remember me" />
  <Button type="submit" disabled={form.formState.isSubmitting}>
    {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
  </Button>
</Form>
```

### Registration Form
```tsx
const form = useForm({
  resolver: zodResolver(registerSchema),
})

<Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
  <FormInput control={form.control} name="username" label="Username" />
  <FormInput control={form.control} name="email" label="Email" />
  <FormInput control={form.control} name="password" label="Password" type="password" />
  <FormInput control={form.control} name="confirmPassword" label="Confirm" type="password" />
  <FormCheckbox control={form.control} name="terms" label="Accept terms" />
  <Button type="submit">Sign Up</Button>
</Form>
```

### Settings Form
```tsx
const schema = z.object({
  notifications: z.boolean(),
  theme: validators.enum(['light', 'dark', 'auto']),
  language: z.string(),
})

<Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
  <FormSwitch control={form.control} name="notifications" label="Enable notifications" />
  <FormRadioGroup
    control={form.control}
    name="theme"
    label="Theme"
    options={[
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'auto', label: 'Auto' },
    ]}
  />
  <FormSelect
    control={form.control}
    name="language"
    label="Language"
    options={[
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
    ]}
  />
  <Button type="submit">Save</Button>
</Form>
```

### Profile Form with Tags and Cascader
```tsx
const schema = z.object({
  skills: z.array(z.string()),
  categories: z.array(z.array(z.union([z.string(), z.number()]))),
})

<Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
  <FormTagInput
    control={form.control}
    name="skills"
    label="Skills"
    placeholder="Add skills..."
    options={['React', 'TypeScript', 'Node.js']}
  />
  
  <FormCascader
    control={form.control}
    name="categories"
    label="Interests"
    multiple
    options={[
      {
        value: 'tech',
        label: 'Technology',
        children: [
          { value: 'web', label: 'Web Development' },
          { value: 'mobile', label: 'Mobile Development' },
        ],
      },
    ]}
  />
  
  <Button type="submit">Save Profile</Button>
</Form>
```

## 💡 Tips

1. **Always use `createFieldNames`** for type safety
2. **Prefer `validators`** over custom Zod schemas
3. **Use `form.formState.isSubmitting`** - RHF tracks async submission automatically
4. **Extend pre-built schemas** instead of starting from scratch
5. **Add descriptions** to help users understand fields
6. **Use proper input types** (email, password, etc.)
7. **Test validation** with unit tests
8. **Check README.md** for detailed examples
