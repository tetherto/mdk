import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'
import { z } from 'zod'

import { Button, Dialog, DialogContent, DialogFooter, Form, FormInput, FormSelect } from '@tetherto/mdk-core-ui'

import { TrashIcon } from '@radix-ui/react-icons'
import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../constants/actions'
import { useContextualModal } from '../../../../../hooks/use-contextual-modal'
import { actionsSlice } from '../../../../../state'
import { notifyInfo } from '../../../../../utils/notification-utils'
import {
  MAX_POOL_ENDPOINTS,
  POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_OPTIONS,
  POOL_ENDPOINT_INDEX_ROLES,
  POOL_ENDPOINT_ROLES_LABELS,
  SHOW_CREDENTIAL_TEMPLATE,
  SHOW_POOL_VALIDATION,
} from '../../pool-manager-constants'
import type { PoolEndpoint } from '../../types'
import { AddPoolEndpointModal } from '../add-pool-endpoint-modal/add-pool-endpoint-modal'
import './add-pool-modal.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

const addPoolSchema = z.object({
  groupName: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  workerName: z.string().min(1, 'Pool Username is required'),
  suffixType: z.string().nullable(),
  endpoints: z
    .array(
      z.object({
        host: z.string(),
        port: z.string(),
        pool: z.string(),
        role: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
      }),
    )
    .min(1, 'At least one endpoint is needed'),
})

type AddPoolFormValues = z.infer<typeof addPoolSchema>

export type AddPoolModalProps = {
  isOpen?: boolean
  onClose: () => void
}

export const AddPoolModal = ({ isOpen = false, onClose }: AddPoolModalProps) => {
  const dispatch = useDispatch()

  const form = useForm<AddPoolFormValues>({
    resolver: zodResolver(addPoolSchema),
    defaultValues: {
      groupName: '',
      description: '',
      workerName: '',
      suffixType: null,
      endpoints: [],
    },
    mode: 'onSubmit',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'endpoints',
  })

  const {
    modalOpen: addEndpointModalOpen,
    handleOpen: openAddEndpointModal,
    handleClose: closeAddEndpointModal,
  } = useContextualModal()

  const handleAddEndpointSubmit = (values: PoolEndpoint) => {
    append(values)
    closeAddEndpointModal()
  }

  const handleSubmit = async (values: AddPoolFormValues) => {
    const { groupName, description, workerName, endpoints } = values

    dispatch(
      setAddPendingSubmissionAction({
        type: 'voting',
        action: ACTION_TYPES.REGISTER_POOL_CONFIG,
        params: [
          {
            type: SUBMIT_ACTION_TYPES.POOL,
            data: {
              poolConfigName: groupName,
              description,
              poolUrls: endpoints.map(({ host, port, pool }) => ({
                url: `stratum+tcp://${host}:${port}`,
                workerName,
                workerPassword: '.',
                pool,
              })),
            },
          },
        ],
      }),
    )

    notifyInfo('Action added', 'Pool config registration')
    form.reset()
    onClose()
  }

  const disableAddEndpoint = fields.length >= MAX_POOL_ENDPOINTS
  const endpointsError =
    form.formState.errors.endpoints?.root?.message ??
    (form.formState.errors.endpoints as any)?.message

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          title="Add Pool"
          closable
          onClose={onClose}
          closeOnClickOutside={false}
          className="mdk-pm-add-pool-modal"
        >
          <Form
            form={form}
            className="mdk-pm-add-pool-modal__body"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            {/* Pool Info */}
            <div className="mdk-pm-add-pool-modal__section-header">POOL INFO</div>

            <FormInput
              control={form.control}
              name="groupName"
              label="Pool Name"
              placeholder="Enter pool name"
            />

            <FormInput
              control={form.control}
              name="description"
              label="Description"
              placeholder="Enter description"
            />

            {/* Endpoints */}
            <div className="mdk-pm-add-pool-modal__endpoints-section">
              <div className="mdk-pm-add-pool-modal__endpoints-header">
                <div className="mdk-pm-add-pool-modal__section-header">ENDPOINTS CONFIGURATION</div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openAddEndpointModal(undefined)}
                  disabled={disableAddEndpoint}
                >
                  Add Endpoint
                </Button>
              </div>

              {endpointsError && (
                <div className="mdk-pm-add-pool-modal__endpoints-error">{endpointsError}</div>
              )}

              <div className="mdk-pm-add-pool-modal__endpoints-list">
                {fields.map((field, index) => {
                  const roleKey =
                    POOL_ENDPOINT_INDEX_ROLES[index as keyof typeof POOL_ENDPOINT_INDEX_ROLES] ??
                    'FAILOVER'
                  const roleLabel =
                    POOL_ENDPOINT_ROLES_LABELS[
                      roleKey as keyof typeof POOL_ENDPOINT_ROLES_LABELS
                    ] ?? 'Failover'

                  return (
                    <div key={field.id} className="mdk-pm-add-pool-modal__endpoint">
                      <div className="mdk-pm-add-pool-modal__endpoint-header">
                        <span className="mdk-pm-add-pool-modal__endpoint-role">{roleLabel}</span>
                        <Button
                          type="button"
                          variant="icon"
                          size="sm"
                          icon={<TrashIcon />}
                          onClick={() => remove(index)}
                        />
                      </div>
                      <div className="mdk-pm-add-pool-modal__endpoint-fields">
                        <div className="mdk-pm-add-pool-modal__endpoint-field">
                          <span className="mdk-pm-add-pool-modal__endpoint-label">Host</span>
                          <span className="mdk-pm-add-pool-modal__endpoint-value">
                            {field.host}
                          </span>
                        </div>
                        <div className="mdk-pm-add-pool-modal__endpoint-field">
                          <span className="mdk-pm-add-pool-modal__endpoint-label">Port</span>
                          <span className="mdk-pm-add-pool-modal__endpoint-value">
                            {field.port}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Credentials */}
            <div className="mdk-pm-add-pool-modal__section-header">CREDENTIALS TEMPLATE</div>

            <FormInput
              control={form.control}
              name="workerName"
              label="Pool Username"
              placeholder="Enter pool username"
            />

            {SHOW_CREDENTIAL_TEMPLATE && (
              <FormSelect
                control={form.control}
                name="suffixType"
                label="Suffix Type"
                placeholder="Select suffix type"
                options={POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_OPTIONS}
              />
            )}

            {SHOW_POOL_VALIDATION && (
              <div className="mdk-pm-add-pool-modal__validation-section">
                <div className="mdk-pm-add-pool-modal__validation-header">Validation Status</div>
                <div className="mdk-pm-add-pool-modal__validation-body">
                  <span className="mdk-pm-add-pool-modal__validation-status mdk-pm-add-pool-modal__validation-status--invalid">
                    Configuration not validated
                  </span>
                  <Button type="button" variant="secondary">
                    Test Configuration
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="mdk-pm-add-pool-modal__footer">
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

      {addEndpointModalOpen && (
        <AddPoolEndpointModal
          isOpen={addEndpointModalOpen}
          onClose={closeAddEndpointModal}
          onSubmit={handleAddEndpointSubmit}
        />
      )}
    </>
  )
}
