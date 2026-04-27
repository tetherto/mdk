import type { DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { useForm } from 'react-hook-form'

import {
  Form,
  FormCascader,
  FormCheckbox,
  FormControl,
  FormDatePicker,
  FormDescription,
  FormField,
  FormInput,
  FormItem,
  FormLabel,
  FormMessage,
  FormRadioGroup,
  FormSelect,
  FormSwitch,
  FormTagInput,
  FormTextArea,
  useFormField,
} from '..'
import { Input } from '../../input'

/** Wrapper so useForm is called inside a component. */
function FormWrapper<T extends FieldValues>({
  defaultValues,
  children,
}: {
  defaultValues: T
  children: (form: UseFormReturn<T>) => React.ReactNode
}): React.JSX.Element {
  const form = useForm<T>({ defaultValues: defaultValues as DefaultValues<T> }) as UseFormReturn<T>
  return <Form form={form}>{children(form)}</Form>
}

describe('form primitives (FormItem, FormControl, FormLabel, FormDescription, FormMessage)', () => {
  it('useFormField throws when used outside FormField', () => {
    function UseFormFieldConsumer(): null {
      useFormField()
      return null
    }

    type ErrorBoundaryState = { error: Error | null }
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode; onError: (err: Error) => void },
      ErrorBoundaryState
    > {
      override state: ErrorBoundaryState = { error: null }

      static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error }
      }

      override componentDidCatch(error: Error): void {
        this.props.onError(error)
      }

      override render(): React.ReactNode {
        if (this.state.error) return null
        return this.props.children
      }
    }

    let caughtError: Error | null = null
    function Wrapper(): React.JSX.Element {
      const form = useForm({ defaultValues: { email: '' } })
      return (
        <ErrorBoundary onError={(e) => (caughtError = e)}>
          <Form form={form}>
            <UseFormFieldConsumer />
          </Form>
        </ErrorBoundary>
      )
    }

    render(<Wrapper />)
    expect(caughtError).not.toBeNull()
    expect((caughtError as Error).message).toBe('useFormField must be used within a <FormField>')
  })

  it('propagates context and links label, description, and message via ids', () => {
    render(
      <FormWrapper defaultValues={{ email: '' }}>
        {(form) => (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Email" />
                </FormControl>
                <FormDescription>We will never share your email.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FormWrapper>,
    )

    const input = screen.getByPlaceholderText('Email')
    expect(input).toBeInTheDocument()

    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const description = screen.getByText('We will never share your email.')
    expect(description).toHaveAttribute('id')
    expect(describedBy).toContain(description.id)
  })

  it('applies aria-invalid and error styling when field has error', async () => {
    function FormWithError(): React.JSX.Element {
      const form = useForm({ defaultValues: { email: '' } })
      React.useEffect(() => {
        form.setError('email', { type: 'required', message: 'Email is required' })
      }, [form])
      return (
        <Form form={form}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      )
    }

    render(<FormWithError />)

    const input = await screen.findByPlaceholderText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('formMessage renders non-breaking space when no error and no children', () => {
    const { container } = render(
      <FormWrapper defaultValues={{ name: '' }}>
        {(form) => (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FormWrapper>,
    )

    const messageEl = container.querySelector('.mdk-form-message')
    expect(messageEl).toBeInTheDocument()
    expect(messageEl?.textContent).toMatch(/\u00A0/)
  })
})

describe('formInput', () => {
  it('renders with label, description, and placeholder', () => {
    render(
      <FormWrapper defaultValues={{ email: '' }}>
        {(form) => (
          <FormInput
            control={form.control}
            name="email"
            label="Email"
            description="We will never share it."
            placeholder="you@example.com"
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByText('We will never share it.')).toBeInTheDocument()
  })

  it('renders without label and description when not provided', () => {
    render(
      <FormWrapper defaultValues={{ q: '' }}>
        {(form) => <FormInput control={form.control} name="q" placeholder="Search" />}
      </FormWrapper>,
    )

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
    expect(screen.queryByText('Search')).not.toBeInTheDocument()
  })

  it('supports type and variant', () => {
    const { rerender } = render(
      <FormWrapper defaultValues={{ pw: '' }}>
        {(form) => (
          <FormInput control={form.control} name="pw" type="password" placeholder="Password" />
        )}
      </FormWrapper>,
    )

    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')

    rerender(
      <FormWrapper defaultValues={{ search: '' }}>
        {(form) => (
          <FormInput control={form.control} name="search" variant="search" placeholder="Search" />
        )}
      </FormWrapper>,
    )

    expect(document.querySelector('.mdk-input__wrapper--search')).toBeInTheDocument()
  })

  it('displays validation error via FormMessage', () => {
    function FormWithError(): React.JSX.Element {
      const form = useForm({ defaultValues: { email: '' } })
      React.useEffect(() => {
        form.setError('email', { type: 'required', message: 'Email is required' })
      }, [form])
      return (
        <Form form={form}>
          <FormInput control={form.control} name="email" label="Email" />
        </Form>
      )
    }

    render(<FormWithError />)
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })
})

describe('formTextArea', () => {
  it('renders with label, description, and placeholder', () => {
    render(
      <FormWrapper defaultValues={{ bio: '' }}>
        {(form) => (
          <FormTextArea
            control={form.control}
            name="bio"
            label="Bio"
            description="Max 200 characters."
            placeholder="Tell us about yourself"
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByLabelText('Bio')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tell us about yourself')).toBeInTheDocument()
    expect(screen.getByText('Max 200 characters.')).toBeInTheDocument()
  })

  it('renders without label and description when not provided', () => {
    render(
      <FormWrapper defaultValues={{ notes: '' }}>
        {(form) => <FormTextArea control={form.control} name="notes" placeholder="Notes" />}
      </FormWrapper>,
    )

    expect(screen.getByPlaceholderText('Notes')).toBeInTheDocument()
  })
})

describe('formCheckbox', () => {
  it('renders with label and description', () => {
    render(
      <FormWrapper defaultValues={{ terms: false }}>
        {(form) => (
          <FormCheckbox
            control={form.control}
            name="terms"
            label="Accept terms"
            description="You must agree to continue."
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument()
    expect(screen.getByText('You must agree to continue.')).toBeInTheDocument()
  })

  it('supports row and column layout', () => {
    const { rerender } = render(
      <FormWrapper defaultValues={{ a: false }}>
        {(form) => <FormCheckbox control={form.control} name="a" label="Option A" layout="row" />}
      </FormWrapper>,
    )

    const wrapperRow = document.querySelector('[style*="flex-direction: row"]')
    expect(wrapperRow).toBeInTheDocument()

    rerender(
      <FormWrapper defaultValues={{ b: false }}>
        {(form) => (
          <FormCheckbox control={form.control} name="b" label="Option B" layout="column" />
        )}
      </FormWrapper>,
    )

    const wrapperCol = document.querySelector('[style*="flex-direction: column"]')
    expect(wrapperCol).toBeInTheDocument()
  })
})

describe('formSwitch', () => {
  it('renders with label and description', () => {
    render(
      <FormWrapper defaultValues={{ notifications: false }}>
        {(form) => (
          <FormSwitch
            control={form.control}
            name="notifications"
            label="Enable notifications"
            description="Receive alerts."
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Enable notifications')).toBeInTheDocument()
    expect(screen.getByText('Receive alerts.')).toBeInTheDocument()
  })

  it('supports row and column layout', () => {
    render(
      <FormWrapper defaultValues={{ a: false }}>
        {(form) => <FormSwitch control={form.control} name="a" label="Option A" layout="row" />}
      </FormWrapper>,
    )

    expect(document.querySelector('[style*="flex-direction: row"]')).toBeInTheDocument()
  })
})

describe('formRadioGroup', () => {
  const options = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ]

  it('renders with label, options, and description', () => {
    render(
      <FormWrapper defaultValues={{ priority: '' }}>
        {(form) => (
          <FormRadioGroup
            control={form.control}
            name="priority"
            label="Priority"
            options={options}
            description="Choose one."
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Low')).toBeInTheDocument()
    expect(screen.getByLabelText('Medium')).toBeInTheDocument()
    expect(screen.getByLabelText('High')).toBeInTheDocument()
    expect(screen.getByText('Choose one.')).toBeInTheDocument()
  })

  it('supports horizontal and vertical orientation', () => {
    const { rerender } = render(
      <FormWrapper defaultValues={{ x: '' }}>
        {(form) => (
          <FormRadioGroup
            control={form.control}
            name="x"
            options={options}
            orientation="horizontal"
          />
        )}
      </FormWrapper>,
    )

    const group = document.querySelector('[role="radiogroup"]')
    expect(group).toBeInTheDocument()

    rerender(
      <FormWrapper defaultValues={{ x: '' }}>
        {(form) => (
          <FormRadioGroup
            control={form.control}
            name="x"
            options={options}
            orientation="vertical"
          />
        )}
      </FormWrapper>,
    )

    expect(document.querySelector('[role="radiogroup"]')).toBeInTheDocument()
  })
})

describe('formSelect', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders with label, placeholder, options, and description', () => {
    render(
      <FormWrapper defaultValues={{ role: '' }}>
        {(form) => (
          <FormSelect
            control={form.control}
            name="role"
            label="Role"
            placeholder="Select role"
            options={options}
            description="Your access level."
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Select role')).toBeInTheDocument()
    expect(screen.getByText('Your access level.')).toBeInTheDocument()
  })

  it('renders select trigger and options are available when open', () => {
    render(
      <FormWrapper defaultValues={{ role: '' }}>
        {(form) => (
          <FormSelect control={form.control} name="role" placeholder="Select" options={options} />
        )}
      </FormWrapper>,
    )

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Select')).toBeInTheDocument()
  })
})

describe('formDatePicker', () => {
  it('renders with label, placeholder, and description', () => {
    render(
      <FormWrapper defaultValues={{ startDate: null as Date | null }}>
        {(form) => (
          <FormDatePicker
            control={form.control}
            name="startDate"
            label="Start Date"
            placeholder="Pick a date"
            description="When should this take effect?"
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Start Date')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick a date' })).toBeInTheDocument()
    expect(screen.getByText('When should this take effect?')).toBeInTheDocument()
  })
})

describe('formTagInput', () => {
  it('renders with label, placeholder, and description', () => {
    render(
      <FormWrapper defaultValues={{ tags: [] as string[] }}>
        {(form) => (
          <FormTagInput
            control={form.control}
            name="tags"
            label="Tags"
            placeholder="Add tags..."
            description="Select or type tags."
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
    expect(screen.getByText('Select or type tags.')).toBeInTheDocument()
  })

  it('supports options and allowCustomTags', () => {
    render(
      <FormWrapper defaultValues={{ tags: [] as string[] }}>
        {(form) => (
          <FormTagInput
            control={form.control}
            name="tags"
            placeholder="Add tags"
            options={[{ value: 'react', label: 'React' }]}
            allowCustomTags={false}
            variant="default"
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByPlaceholderText('Add tags')).toBeInTheDocument()
  })
})

describe('formCascader', () => {
  const options = [
    {
      value: 'electronics',
      label: 'Electronics',
      children: [
        { value: 'phones', label: 'Phones' },
        { value: 'laptops', label: 'Laptops' },
      ],
    },
  ]

  it('renders with label, placeholder, and description', () => {
    render(
      <FormWrapper defaultValues={{ category: null as string[] | null }}>
        {(form) => (
          <FormCascader
            control={form.control}
            name="category"
            label="Category"
            placeholder="Select category..."
            options={options}
            description="Choose a category."
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Select category...')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
  })

  it('supports multiple selection', () => {
    render(
      <FormWrapper defaultValues={{ categories: [] as string[][] }}>
        {(form) => (
          <FormCascader
            control={form.control}
            name="categories"
            label="Categories"
            placeholder="Select categories..."
            options={options}
            multiple
          />
        )}
      </FormWrapper>,
    )

    expect(screen.getByText('Categories')).toBeInTheDocument()
  })
})
