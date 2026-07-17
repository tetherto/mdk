import { zodResolver } from '@hookform/resolvers/zod'
import { Button, CoreAlert, DataTable, Form, FormSelect, Loader } from '@primitives'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { PoolConfigData } from '../../hooks/use-pool-configs'
import { usePoolConfigs } from '../../hooks/use-pool-configs'
import { SHOW_CREDENTIAL_TEMPLATE } from '../../pool-manager-constants'
import type { PoolSummary } from '../../types'
import { endpointColumns } from './set-pool-configuration-columns'
import './set-pool-configuration.scss'

const setPoolSchema = z.object({
  selectedPoolId: z.string().min(1, 'Pool is required'),
})

type SetPoolFormValues = z.infer<typeof setPoolSchema>

export type EndpointRow = {
  id: string
  host: string
  port: string
  role: string
}

export type SetPoolConfigurationProps = {
  onSubmit: (values: { pool: PoolSummary }) => Promise<void> | void
  poolConfig: PoolConfigData[]
}

export const SetPoolConfiguration = ({ onSubmit, poolConfig }: SetPoolConfigurationProps) => {
  const form = useForm<SetPoolFormValues>({
    resolver: zodResolver(setPoolSchema),
    defaultValues: { selectedPoolId: '' },
    mode: 'onSubmit',
  })

  const { pools, isLoading, error } = usePoolConfigs({ data: poolConfig })

  const selectedPoolId = form.watch('selectedPoolId')
  const currentPool = selectedPoolId ? pools.find((p) => p.id === selectedPoolId) : undefined

  const poolOptions = pools.map((pool) => ({
    value: pool.id ?? '',
    label: pool.name,
  }))

  const endpointRows: EndpointRow[] = (currentPool?.endpoints ?? []).map((ep, i) => ({
    id: String(i),
    host: ep.host,
    port: ep.port,
    role: ep.role ?? '',
  }))

  const handleSubmit = async ({ selectedPoolId }: SetPoolFormValues) => {
    const selected = pools.find((p) => p.id === selectedPoolId)
    if (!selected) return
    await onSubmit({ pool: selected })
  }

  return (
    <div className="mdk-pm-set-pool">
      <div className="mdk-pm-set-pool__body">
        <h4 className="mdk-pm-set-pool__title">Set Pool Configuration</h4>

        {isLoading ? (
          <Loader />
        ) : error ? (
          <CoreAlert type="error" title="Error loading data" />
        ) : (
          <Form form={form} onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="mdk-pm-set-pool__section">
              <span className="mdk-pm-set-pool__section-title">Choose Pool</span>
              <FormSelect
                control={form.control}
                name="selectedPoolId"
                label="Pool"
                placeholder="Select a pool"
                options={poolOptions}
              />
              {currentPool && (
                <div className="mdk-pm-set-pool__info-row">
                  <span className="mdk-pm-set-pool__info-text">
                    #Units: {currentPool.units ?? 0}
                  </span>
                  <span className="mdk-pm-set-pool__info-text">
                    #Miners: {currentPool.miners ?? 0}
                  </span>
                </div>
              )}
            </div>

            {currentPool && (
              <>
                <div className="mdk-pm-set-pool__section">
                  <span className="mdk-pm-set-pool__section-title">Endpoints Preview</span>
                  <DataTable
                    data={endpointRows}
                    columns={endpointColumns}
                    enablePagination={false}
                    enableRowSelection={false}
                    wrapperClassName="mdk-pm-set-pool__table"
                  />
                </div>

                {SHOW_CREDENTIAL_TEMPLATE && (
                  <div className="mdk-pm-set-pool__section">
                    <span className="mdk-pm-set-pool__section-title">
                      Credentials Template Preview
                    </span>
                    <div className="mdk-pm-set-pool__credentials">
                      <div className="mdk-pm-set-pool__credentials-row">
                        <span className="mdk-pm-set-pool__credentials-label">
                          Worker Name Pattern:
                        </span>
                        <span className="mdk-pm-set-pool__credentials-value">
                          {'{unit_id}.{miner_id}'}
                        </span>
                      </div>
                      <div className="mdk-pm-set-pool__credentials-row mdk-pm-set-pool__credentials-row--bordered">
                        <span className="mdk-pm-set-pool__credentials-label">Suffix Type:</span>
                        <span className="mdk-pm-set-pool__credentials-value">Sequential</span>
                      </div>
                      <div className="mdk-pm-set-pool__credentials-example">
                        <span className="mdk-pm-set-pool__credentials-label">Example Preview:</span>
                        <span className="mdk-pm-set-pool__credentials-example-value">
                          unit01.miner001
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mdk-pm-set-pool__footer">
              <Button type="submit" variant="primary" disabled={isLoading} fullWidth>
                Assign Pool
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  )
}
