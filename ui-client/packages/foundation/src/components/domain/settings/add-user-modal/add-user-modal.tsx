import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogContent, DialogFooter, Form, FormInput, FormSelect } from '@tetherto/core'

import type { RoleOption } from '../../../../types/settings.types'

import './add-user-modal.scss'

const addUserSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('This should be a valid email').min(1, 'Email is required').trim(),
  role: z.string().min(1, 'Role is required'),
})

type AddUserFormValues = z.infer<typeof addUserSchema>

export type AddUserModalProps = {
  open: boolean
  onClose: VoidFunction
  roles: RoleOption[]
  onSubmit: (data: { name: string; email: string; role: string }) => Promise<void>
  isSubmitting?: boolean
}

export const AddUserModal = ({
  open,
  onClose,
  roles,
  onSubmit,
  isSubmitting = false,
}: AddUserModalProps) => {
  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: '', email: '', role: '' },
    mode: 'onSubmit',
  })

  const handleSubmit = async (values: AddUserFormValues) => {
    await onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
    })
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent title="Add New User" closable onClose={onClose} closeOnClickOutside={false}>
        <Form
          form={form}
          className="mdk-settings-add-user-modal__form"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FormInput
            control={form.control}
            name="name"
            label="Name"
            placeholder="Enter full name"
          />
          <FormInput
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="Enter email address"
          />
          <FormSelect
            control={form.control}
            name="role"
            label="Assign Role"
            placeholder="Select role"
            options={roles.map((r) => ({ value: r.value, label: r.label }))}
            description="Each new user must have a single role assigned at creation."
          />
          <DialogFooter>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
