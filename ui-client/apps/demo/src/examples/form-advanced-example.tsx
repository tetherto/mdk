import {
  Button,
  createFieldNames,
  Form,
  FormCascader,
  FormCheckbox,
  FormInput,
  FormSwitch,
  FormTagInput,
  validators,
} from '@mdk/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { DemoPageHeader } from '../components/demo-page-header'

const formSchema = z.object({
  name: validators.requiredString({ minLength: 2 }),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  categories: z
    .array(z.array(z.union([z.string(), z.number(), z.boolean()])))
    .min(1, 'At least one category is required'),
  notifications: z.boolean(),
  agree: validators.requiredBoolean('You must agree to continue'),
})

type FormValues = z.infer<typeof formSchema>
const field = createFieldNames<FormValues>()

/**
 * Advanced form example showcasing the additional field components:
 * - FormTagInput (multi-select with search)
 * - FormCascader (hierarchical select)
 */
export const FormAdvancedExample = (): React.ReactElement => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      tags: [],
      categories: [],
      notifications: false,
      agree: undefined as unknown as true,
    },
  })

  const onSubmit = async (data: FormValues): Promise<void> => {
    console.warn('Form submitted:', data)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.warn('Success!', data)
  }

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Form (Advanced)"
        description="Examples of FormTagInput and FormCascader"
      />
      <div className="demo-section__form">
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <FormInput
            control={form.control}
            name={field('name')}
            label="Name"
            placeholder="Enter your name"
          />

          {/* FormTagInput - Multi-select with search */}
          <FormTagInput
            control={form.control}
            name={field('tags')}
            label="Skills"
            placeholder="Add skills..."
            options={[
              'React',
              'TypeScript',
              'Node.js',
              'Python',
              'Go',
              'Rust',
              'Docker',
              'Kubernetes',
              'AWS',
              'Azure',
            ]}
            description="Select from the list or type custom skills"
          />

          {/* FormCascader - Hierarchical select */}
          <FormCascader
            control={form.control}
            name={field('categories')}
            label="Interests"
            placeholder="Select your interests..."
            multiple
            options={[
              {
                value: 'technology',
                label: 'Technology',
                children: [
                  { value: 'web', label: 'Web Development' },
                  { value: 'mobile', label: 'Mobile Development' },
                  { value: 'devops', label: 'DevOps' },
                  { value: 'ai', label: 'AI & Machine Learning' },
                ],
              },
              {
                value: 'design',
                label: 'Design',
                children: [
                  { value: 'ui', label: 'UI Design' },
                  { value: 'ux', label: 'UX Research' },
                  { value: 'graphics', label: 'Graphic Design' },
                ],
              },
              {
                value: 'business',
                label: 'Business',
                children: [
                  { value: 'product', label: 'Product Management' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'sales', label: 'Sales' },
                ],
              },
            ]}
            description="Choose one or more categories"
          />

          <FormSwitch
            control={form.control}
            name={field('notifications')}
            label="Email notifications"
            description="Receive updates and news"
          />

          <FormCheckbox
            control={form.control}
            name={field('agree')}
            label="I agree to the terms and conditions"
          />

          <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Submitting...' : 'Submit Profile'}
          </Button>
        </Form>
      </div>
    </section>
  )
}

export default FormAdvancedExample
