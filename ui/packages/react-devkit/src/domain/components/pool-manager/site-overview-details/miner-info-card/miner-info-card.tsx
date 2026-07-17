import { cn, CoreAlert, FALLBACK, Loader } from '@primitives'
import type { MinerData } from '../use-site-overview-details-data'
import { MINER_INFO_CARD_STATUSES, SITE_OVERVIEW_STATUS_COLORS } from '../../pool-manager-constants'
import type { PoolSummary } from '../../types'
import { getMinerStatus } from '../site-overview-details-utils'
import './miner-info-card.scss'

export type MinerInfoCardProps = {
  selectedItems: Set<string>
  poolIdMap: Record<string, PoolSummary>
  minersHashmap: Record<string, MinerData>
  isLoading?: boolean
  error?: unknown
  minerName?: string
}

export const MinerInfoCard = ({
  selectedItems,
  poolIdMap,
  minersHashmap,
  isLoading,
  error,
  minerName,
}: MinerInfoCardProps) => {
  const firstSelected = Array.from(selectedItems)[0]
  const socket =
    selectedItems.size > 0 && firstSelected !== undefined ? JSON.parse(firstSelected) : undefined
  const { pduIndex, socketIndex } = socket ?? {}

  const miner = socket ? minersHashmap[`${pduIndex}_${socketIndex}`] : undefined
  const pool = miner?.info?.poolConfig ? poolIdMap[miner.info.poolConfig as string] : undefined
  const endpoint = pool?.endpoints?.[0]?.url
  const hashrate = miner?.hashrate?.value
    ? `${miner.hashrate.value} ${miner.hashrate.unit}`
    : undefined

  const isOverridden = (miner as Record<string, unknown> | undefined)?.overriddenConfig
  const statusKnown = isOverridden !== undefined && isOverridden !== null
  const status = statusKnown
    ? isOverridden
      ? MINER_INFO_CARD_STATUSES.OVERRIDE
      : MINER_INFO_CARD_STATUSES.NORMAL
    : FALLBACK

  const minerStatus = getMinerStatus(miner)
  const statusColor = SITE_OVERVIEW_STATUS_COLORS[minerStatus]

  return (
    <div className="mdk-miner-info-card">
      <div className="mdk-miner-info-card__header">
        <span className="mdk-miner-info-card__title">Miner Info</span>
        <div className="mdk-miner-info-card__subtitle">
          <span className="mdk-miner-info-card__pdu">
            {minerName} {pduIndex}
          </span>
          <div className="mdk-miner-info-card__socket">
            <span
              className={cn(
                'mdk-miner-info-card__socket-badge',
                `mdk-miner-info-card__socket-badge--${statusColor}`,
              )}
            />
            <span>Socket: {socketIndex}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <CoreAlert type="error" title="Failed to load data" />
      ) : (
        <div className="mdk-miner-info-card__pool-section">
          <span className="mdk-miner-info-card__pool-title">Pool Information</span>
          <div className="mdk-miner-info-card__fields">
            <div className="mdk-miner-info-card__field">
              <span className="mdk-miner-info-card__field-label">Pool</span>
              <span className="mdk-miner-info-card__field-value">{pool?.name ?? 'None'}</span>
            </div>
            <div className="mdk-miner-info-card__field">
              <span className="mdk-miner-info-card__field-label">Endpoint</span>
              <span className="mdk-miner-info-card__field-value">{endpoint ?? 'None'}</span>
            </div>
            <div className="mdk-miner-info-card__field">
              <span className="mdk-miner-info-card__field-label">Hashrate</span>
              <span className="mdk-miner-info-card__field-value">{hashrate ?? '-'}</span>
            </div>
            <div className="mdk-miner-info-card__field">
              <span className="mdk-miner-info-card__field-label">Status</span>
              <span className="mdk-miner-info-card__field-value">{status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
