import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button, Dialog, DialogContent, DialogFooter, Form, FormInput, FormSelect } from '@tetherto/core'

import {
  POOL_ENDPOINT_REGIONS_OPTIONS,
  POOL_ENDPOINT_ROLES_OPTIONS,
  SHOW_ADDITIONAL_FIELDS,
} from '../../pool-manager-constants'
import type { PoolEndpointFormValues } from '../../types'

const addPoolEndpointSchema = z.object({
  role: z.string().nullable(),
  host: z.string().min(1, 'Host is required'),
  port: z.string().min(1, 'Port is required'),
  pool: z.string().min(1, 'Pool is required'),
  region: z.string().nullable(),
})

type AddPoolEndpointFormValues = z.infer<typeof addPoolEndpointSchema>

const emptyValues: AddPoolEndpointFormValues = {
  role: null,
  host: '',
  port: '',
  pool: '',
  region: null,
}

export type AddPoolEndpointModalProps = {
  endpoint?: PoolEndpointFormValues
  isOpen: boolean
  onClose: VoidFunction
  onSubmit: (values: PoolEndpointFormValues) => void
}

export const AddPoolEndpointModal = ({
  endpoint,
  isOpen,
  onClose,
  onSubmit,
}: AddPoolEndpointModalProps) => {
  const isEditMode = endpoint != null

  const form = useForm<AddPoolEndpointFormValues>({
    resolver: zodResolver(addPoolEndpointSchema),
    defaultValues: isEditMode
      ? { role: null, region: null, host: endpoint.host, port: endpoint.port, pool: endpoint.pool }
      : emptyValues,
    mode: 'onSubmit',
  })

  const handleSubmit = (values: AddPoolEndpointFormValues) => {
    onSubmit(values)
    form.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={`${isEditMode ? 'Edit' : 'Add'} Endpoint`}
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-pm-add-endpoint-modal"
      >
        <Form
          form={form}
          className="mdk-pm-add-endpoint-modal__body"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          {SHOW_ADDITIONAL_FIELDS && (
            <FormSelect
              control={form.control}
              name="role"
              label="Role"
              placeholder="Select role"
              options={POOL_ENDPOINT_ROLES_OPTIONS}
            />
          )}

          <FormInput
            control={form.control}
            name="host"
            label="Host"
            placeholder="e.g. pool.example.com"
          />

          <FormInput control={form.control} name="port" label="Port" placeholder="e.g. 3333" />

          <FormInput
            control={form.control}
            name="pool"
            label="Pool"
            placeholder="e.g. pool-identifier"
          />

          {SHOW_ADDITIONAL_FIELDS && (
            <FormSelect
              control={form.control}
              name="region"
              label="Region"
              placeholder="Select region"
              options={POOL_ENDPOINT_REGIONS_OPTIONS}
            />
          )}

          <DialogFooter className="mdk-pm-add-endpoint-modal__footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
