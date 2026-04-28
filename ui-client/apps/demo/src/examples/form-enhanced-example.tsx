import {
  Button,
  createFieldNames,
  Form,
  FormCheckbox,
  FormDatePicker,
  FormInput,
  FormRadioGroup,
  FormSelect,
  FormSwitch,
  FormTextArea,
  validators,
} from '@tetherto/mdk-core-ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { DemoPageHeader } from '../components/demo-page-header'

// Define form schema using common validators
const formSchema = z.object({
  username: validators.username({ minLength: 3, maxLength: 20 }),
  email: validators.email(),
  role: validators.enum(['operator', 'technician', 'admin']),
  bio: validators.optionalString({ maxLength: 200 }),
  notifications: z.boolean().default(false),
  priority: validators.enum(['low', 'medium', 'high'], 'Please select a priority level'),
  startDate: validators.date({ required: true }),
  terms: validators.requiredBoolean('You must accept the terms'),
})

type FormValues = z.infer<typeof formSchema>

// Create type-safe field name accessor
const field = createFieldNames<FormValues>()

/**
 * Enhanced form example showcasing pre-built field components and utilities
 */
export const FormEnhancedExample = (): React.ReactElement => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      role: undefined,
      bio: '',
      notifications: false,
      priority: undefined,
      startDate: undefined,
      terms: undefined as unknown as true,
    },
  })

  const onSubmit = async (data: FormValues): Promise<void> => {
    // Simulate API call
    console.warn('Form submitted:', data)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.warn('Success!', data)
  }

  return (
    <section className="demo-section">
      <DemoPageHeader title="Form (Enhanced)" />
      <div className="demo-section__form">
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          {/* Using pre-built FormInput component - much less boilerplate! */}
          <FormInput
            control={form.control}
            name={field('username')}
            label="Username"
            placeholder="Enter username"
            description="This is your public display name."
          />

          <FormInput
            control={form.control}
            name={field('email')}
            label="Email"
            type="email"
            placeholder="user@example.com"
          />

          {/* Pre-built FormSelect with options array */}
          <FormSelect
            control={form.control}
            name={field('role')}
            label="Role"
            placeholder="Select a role"
            options={[
              { value: 'operator', label: 'Operator' },
              { value: 'technician', label: 'Technician' },
              { value: 'admin', label: 'Admin' },
            ]}
            description="Your access level in the system."
          />

          {/* Pre-built FormTextArea */}
          <FormTextArea
            control={form.control}
            name={field('bio')}
            label="Bio"
            placeholder="Tell us about yourself"
            description="Max 200 characters."
          />

          {/* Pre-built FormSwitch with horizontal layout */}
          <FormSwitch
            control={form.control}
            name={field('notifications')}
            label="Enable notifications"
            description="Receive alerts when miners go offline."
            layout="row"
          />

          {/* Pre-built FormRadioGroup with options array */}
          <FormRadioGroup
            control={form.control}
            name={field('priority')}
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            orientation="horizontal"
          />

          {/* Pre-built FormDatePicker */}
          <FormDatePicker
            control={form.control}
            name={field('startDate')}
            label="Start Date"
            placeholder="Pick a start date"
            description="When should this take effect?"
          />

          {/* Pre-built FormCheckbox */}
          <FormCheckbox
            control={form.control}
            name={field('terms')}
            label="Accept terms and conditions"
            layout="row"
          />

          <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Form>
      </div>
    </section>
  )
}

export default FormEnhancedExample
