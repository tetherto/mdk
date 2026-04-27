import { zodResolver } from '@hookform/resolvers/zod'
import { intlFormatDistance } from 'date-fns/intlFormatDistance'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  Button,
  CoreAlert,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  FormSelect,
  Loader,
} from '@mdk/core'

import { POOL_ENDPOINT_ROLES_LABELS, SHOW_CREDENTIAL_TEMPLATE } from '../pool-manager-constants'
import type { PoolSummary } from '../types'

import type { Device } from '../../../../types'
import { getMinerShortCode, getTableDeviceData } from '../../../../utils/device-utils'
import type { PoolConfigData } from '../hooks/use-pool-configs'
import { usePoolConfigs } from '../hooks/use-pool-configs'
import { minersTableColumns } from './assign-pool-modal-columns'
import './assign-pool-modal.scss'

const assignPoolSchema = z.object({
  pool: z.string().min(1, 'Pool is required'),
})

type AssignPoolFormValues = z.infer<typeof assignPoolSchema>

export type MinerRow = {
  id: string
  code: string
  unit: string
  pool: string
  status?: string
}

export type AssignPoolModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: { pool: PoolSummary }) => Promise<void>
  miners: Device[]
  poolConfig: PoolConfigData[]
}

export const AssignPoolModal = ({
  isOpen,
  onClose,
  onSubmit,
  poolConfig,
  miners,
}: AssignPoolModalProps) => {
  const form = useForm<AssignPoolFormValues>({
    resolver: zodResolver(assignPoolSchema),
    defaultValues: { pool: '' },
    mode: 'onSubmit',
  })

  const {
    pools,
    poolIdMap,
    isLoading,
    error: poolConfigLoadingError,
  } = usePoolConfigs({
    data: poolConfig,
  })

  const selectedPoolId = form.watch('pool')
  const selectedPool = selectedPoolId ? pools.find((p) => p.id === selectedPoolId) : undefined
  const hasError = !!poolConfigLoadingError

  const handleSubmit = async ({ pool }: AssignPoolFormValues) => {
    const selectedPool = pools.find((p) => p.id === pool)
    if (!selectedPool) return
    await onSubmit({ pool: selectedPool })
    form.reset()
  }

  const poolOptions = pools.map((pool) => ({
    value: pool.id ?? '',
    label: pool.name,
  }))

  const minersRow = miners.map((minerData) => {
    const { code, tags, id, info } = minerData
    const shortCode = getMinerShortCode(code as string, tags || [])
    const deviceData = getTableDeviceData(minerData)
    const stats = deviceData.stats as
      | { status?: string; hashrate_mhs?: { t_5m?: number } }
      | undefined
    return {
      id,
      code: shortCode,
      pool: info?.poolConfig ? (poolIdMap[info?.poolConfig]?.name ?? '-') : '-',
      unit: info?.container ?? '-',
      status: stats?.status,
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Assign Pool"
        closable
        onClose={onClose}
        closeOnClickOutside={false}
        className="mdk-pm-assign-pool-modal"
      >
        {isLoading ? (
          <Loader />
        ) : hasError ? (
          <CoreAlert type="error" title="Error loading data" />
        ) : (
          <Form
            form={form}
            className="mdk-pm-assign-pool-modal__body"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className="mdk-pm-assign-pool-modal__section">
              <div className="mdk-pm-assign-pool-modal__section-header">
                <span className="mdk-pm-assign-pool-modal__section-title">Selected Miners</span>
                <span className="mdk-pm-assign-pool-modal__section-value">
                  {miners.length} miners selected
                </span>
              </div>
              <DataTable<MinerRow>
                data={minersRow}
                columns={minersTableColumns}
                enablePagination={false}
                getRowId={(row) => row.id}
              />
            </div>

            <div className="mdk-pm-assign-pool-modal__section">
              <div className="mdk-pm-assign-pool-modal__section-header">
                <span className="mdk-pm-assign-pool-modal__section-title">Choose pool</span>
              </div>

              <FormSelect
                control={form.control}
                name="pool"
                placeholder="Select a pool"
                options={poolOptions}
              />

              {selectedPool != null && (
                <div className="mdk-pm-assign-pool-modal__pool-meta">
                  <span>Units: {selectedPool.units ?? 0}</span>
                  <span>Miners: {selectedPool.miners ?? 0}</span>
                  <span>
                    Last Updated: {intlFormatDistance(selectedPool.updatedAt, new Date())}
                  </span>
                </div>
              )}
            </div>

            {selectedPool != null && (
              <div className="mdk-pm-assign-pool-modal__section">
                <div className="mdk-pm-assign-pool-modal__section-header">Endpoints Preview</div>
                <div className="mdk-pm-assign-pool-modal__endpoints-list">
                  {selectedPool.endpoints.map((endpoint, index) => (
                    <div key={index} className="mdk-pm-assign-pool-modal__endpoint">
                      <div className="mdk-pm-assign-pool-modal__endpoint-role">
                        <span className="mdk-pm-assign-pool-modal__endpoint-role-name">
                          {
                            POOL_ENDPOINT_ROLES_LABELS[
                              endpoint.role as keyof typeof POOL_ENDPOINT_ROLES_LABELS
                            ]
                          }
                        </span>
                      </div>
                      <div className="mdk-pm-assign-pool-modal__endpoint-fields">
                        <span className="mdk-pm-assign-pool-modal__endpoint-host">
                          {endpoint.host}
                        </span>
                        <span className="mdk-pm-assign-pool-modal__endpoint-port">
                          Port: {endpoint.port}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {SHOW_CREDENTIAL_TEMPLATE && (
              <div className="mdk-pm-assign-pool-modal__section">
                <div className="mdk-pm-assign-pool-modal__section-header">
                  <span className="mdk-pm-assign-pool-modal__section-title">
                    Credential Template Preview
                  </span>
                </div>
                <div className="mdk-pm-assign-pool-modal__credential-template">
                  <span className="mdk-pm-assign-pool-modal__template-field-name">
                    Worker Name Example
                  </span>
                  <span className="mdk-pm-assign-pool-modal__template-field-value">
                    site-a.192-168-1-1
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="mdk-pm-assign-pool-modal__footer">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
