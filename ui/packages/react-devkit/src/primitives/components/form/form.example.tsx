/**
 * Runnable example for Form (react-hook-form + zod).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@tetherto/mdk-react-devkit'

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Must be a valid email'),
})

type FormValues = z.infer<typeof schema>

export const FormExample = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })

  const onSubmit = (values: FormValues) => {
    // eslint-disable-next-line no-console
    console.log('submit', values)
  }

  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Operator name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="ops@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" variant="primary">
        Submit
      </Button>
    </Form>
  )
}
