import { useDispatch } from 'react-redux'

import { Button, cn } from '@mdk/core'

import { Pencil1Icon } from '@radix-ui/react-icons'
import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../constants/actions'
import { useContextualModal } from '../../../../../hooks/use-contextual-modal'
import { actionsSlice } from '../../../../../state'
import { notifyInfo } from '../../../../../utils/notification-utils'
import {
  ADD_ENDPOINT_ENABLED,
  EDIT_ENDPOINT_ENABLED,
  MAX_POOL_ENDPOINTS,
  POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_LABELS,
  POOL_ENDPOINT_INDEX_ROLES,
  POOL_ENDPOINT_ROLES_LABELS,
  POOL_STATUS_INDICATOR_ENABLED,
  POOL_VALIDATION_STATUSES,
} from '../../pool-manager-constants'
import type { PoolEndpoint, PoolEndpointFormValues, PoolSummary } from '../../types'
import { AddPoolEndpointModal } from '../add-pool-endpoint-modal/add-pool-endpoint-modal'
import './pool-collapse-item-body.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

type PoolCollapseItemBodyProps = {
  pool: PoolSummary
}

export const PoolCollapseItemBody = ({ pool }: PoolCollapseItemBodyProps) => {
  const dispatch = useDispatch()

  const isPoolValidated = pool.validation?.status === POOL_VALIDATION_STATUSES.TESTED

  const {
    modalOpen: addEndpointModalOpen,
    handleOpen: openAddEndpointModal,
    handleClose: closeAddEndpointModal,
    subject: endpointEditData,
  } = useContextualModal<{ endpoint: PoolEndpoint; index: number } | undefined>()

  const handleAddEndpoint = (values: PoolEndpointFormValues) => {
    const { workerName, workerPassword } = pool

    const originalPoolUrls = pool.endpoints.map(({ host, port, pool: poolName }) => ({
      url: `stratum+tcp://${host}:${port}`,
      workerName,
      workerPassword,
      pool: poolName,
    }))

    const newPoolUrl = {
      url: `stratum+tcp://${values.host}:${values.port}`,
      workerName,
      workerPassword,
      pool: values.pool,
    }

    const poolUrls =
      endpointEditData == null
        ? [...originalPoolUrls, newPoolUrl]
        : originalPoolUrls.map((p, i) => (i === endpointEditData.index ? newPoolUrl : p))

    dispatch(
      setAddPendingSubmissionAction({
        action: ACTION_TYPES.UPDATE_POOL_CONFIG,
        params: [
          {
            type: SUBMIT_ACTION_TYPES.POOL,
            id: pool.id,
            data: {
              poolConfigName: pool.name,
              description: pool.description,
              poolUrls,
            },
          },
        ],
      }),
    )

    notifyInfo('Action added', 'Update Pool config')
    closeAddEndpointModal()
  }

  const showAddEndpointButton = pool.endpoints.length < MAX_POOL_ENDPOINTS

  return (
    <>
      <div className="mdk-pm-pool-body">
        <div className="mdk-pm-pool-body__section">
          <div className="mdk-pm-pool-body__section-header">
            <span className="mdk-pm-pool-body__section-title">Endpoints Configuration</span>
            {ADD_ENDPOINT_ENABLED && showAddEndpointButton && (
              <Button
                type="button"
                variant="tertiary"
                onClick={() => openAddEndpointModal(undefined)}
              >
                + Add Endpoint
              </Button>
            )}
          </div>

          <div className="mdk-pm-pool-body__endpoints-list">
            {pool.endpoints.length === 0 ? (
              <div className="mdk-pm-pool-body__empty">No Endpoints configured</div>
            ) : (
              pool.endpoints.map((endpoint, index) => {
                const roleKey =
                  POOL_ENDPOINT_INDEX_ROLES[index as keyof typeof POOL_ENDPOINT_INDEX_ROLES] ??
                  'FAILOVER'
                const roleLabel =
                  POOL_ENDPOINT_ROLES_LABELS[roleKey as keyof typeof POOL_ENDPOINT_ROLES_LABELS] ??
                  'Failover'

                return (
                  <div key={index} className="mdk-pm-pool-body__endpoint">
                    <div className="mdk-pm-pool-body__endpoint-role">
                      <span className="mdk-pm-pool-body__endpoint-role-name">{roleLabel}</span>
                      {POOL_STATUS_INDICATOR_ENABLED && (
                        <span className="mdk-pm-pool-body__endpoint-status-dot" />
                      )}
                    </div>

                    <div className="mdk-pm-pool-body__endpoint-field">
                      <span className="mdk-pm-pool-body__endpoint-field-title">Host</span>
                      <span className="mdk-pm-pool-body__endpoint-field-value">
                        {endpoint.host}
                      </span>
                    </div>

                    <div className="mdk-pm-pool-body__endpoint-field">
                      <span className="mdk-pm-pool-body__endpoint-field-title">Port</span>
                      <span className="mdk-pm-pool-body__endpoint-field-value">
                        {endpoint.port}
                      </span>
                    </div>

                    {EDIT_ENDPOINT_ENABLED && (
                      <div className="mdk-pm-pool-body__endpoint-action">
                        <Button
                          type="button"
                          variant="icon"
                          size="sm"
                          icon={<Pencil1Icon />}
                          onClick={() => openAddEndpointModal({ endpoint, index })}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Credentials ─────────────────────────────────────────── */}
        {pool.credentialsTemplate && (
          <div className="mdk-pm-pool-body__section">
            <div className="mdk-pm-pool-body__section-header">
              <span className="mdk-pm-pool-body__section-title">Credentials</span>
            </div>
            <div className="mdk-pm-pool-body__credentials">
              <div className="mdk-pm-pool-body__credential-field">
                <span className="mdk-pm-pool-body__credential-label">Worker Name</span>
                <span className="mdk-pm-pool-body__credential-value">
                  {pool.credentialsTemplate.workerName}
                </span>
              </div>
              <div className="mdk-pm-pool-body__credential-field">
                <span className="mdk-pm-pool-body__credential-label">Suffix Type</span>
                <span className="mdk-pm-pool-body__credential-value">
                  {POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_LABELS[
                    pool.credentialsTemplate
                      .suffixType as keyof typeof POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_LABELS
                  ] ?? pool.credentialsTemplate.suffixType}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Validation ──────────────────────────────────────────── */}
        {pool.validation && (
          <div className="mdk-pm-pool-body__section">
            <div className="mdk-pm-pool-body__section-header">
              <span className="mdk-pm-pool-body__section-title">Validation Status</span>
            </div>
            <div className="mdk-pm-pool-body__validation">
              <div className="mdk-pm-pool-body__validation-indicator">
                <span
                  className={cn(
                    'mdk-pm-pool-body__validation-status',
                    isPoolValidated
                      ? 'mdk-pm-pool-body__validation-status--valid'
                      : 'mdk-pm-pool-body__validation-status--invalid',
                  )}
                >
                  {isPoolValidated
                    ? 'Configuration validated successfully'
                    : 'Configuration not validated'}
                </span>
                <span className="mdk-pm-pool-body__validation-timestamp">
                  Last tested: 2025-01-15 14:30
                </span>
              </div>
              <Button type="button" variant="secondary">
                Test Configuration
              </Button>
            </div>
          </div>
        )}
      </div>

      {addEndpointModalOpen && (
        <AddPoolEndpointModal
          isOpen={addEndpointModalOpen}
          onClose={closeAddEndpointModal}
          onSubmit={handleAddEndpoint}
          endpoint={endpointEditData?.endpoint}
        />
      )}
    </>
  )
}
