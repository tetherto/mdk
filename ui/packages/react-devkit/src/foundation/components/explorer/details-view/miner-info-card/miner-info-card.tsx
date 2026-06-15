import type { InfoItem } from '../../../info-container/info-container'
import { DeviceInfo } from '../../../info-container/info-container'
import './miner-info-card.scss'

type MinerInfoCardProps = {
  data: InfoItem[]
  label: string
}

/**
 * Info card for one miner — serial, model, firmware, location, and recent activity summary.
 *
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const MinerInfoCard = ({ data, label = 'Miner info' }: Partial<MinerInfoCardProps>) => {
  return (
    <div className="mdk-miner-info-card">
      <span className="mdk-miner-info-card__label">{label}</span>
      <DeviceInfo data={data} />
    </div>
  )
}
