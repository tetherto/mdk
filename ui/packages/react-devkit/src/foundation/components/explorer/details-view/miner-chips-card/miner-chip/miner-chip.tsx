import { formatNumber, UNITS } from '@core'
import './miner-chip.scss'

type MinerChipProps = {
  index: number
  frequency: {
    current: number
  }
  temperature: {
    avg: number
    min: number
    max: number
  }
}

/**
 * Selectable chip representing a single miner; surfaces id, slot, and current state with click handling.
 *
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const MinerChip = ({ index, frequency, temperature }: MinerChipProps) => (
  <div className="mdk-miner-chip">
    <p className="mdk-miner-chip__title">Chip {index}</p>
    <p className="mdk-miner-chip__property">Temperature</p>
    <div className="mdk-miner-chip__value">
      {formatNumber(temperature.avg)} {UNITS.TEMPERATURE_C}
    </div>
    <div className="mdk-miner-chip__minmax">
      <div className="mdk-miner-chip__value">
        {formatNumber(temperature.min)}
        <p className="mdk-miner-chip__value-type"> min ({UNITS.TEMPERATURE_C})</p>
      </div>
      <div className="mdk-miner-chip__value">
        {formatNumber(temperature.max)}
        <p className="mdk-miner-chip__value-type"> max ({UNITS.TEMPERATURE_C})</p>
      </div>
    </div>
    <p className="mdk-miner-chip__property">Frequency</p>
    <div className="mdk-miner-chip__value">
      {formatNumber(frequency.current)} {UNITS.FREQUENCY_MHZ}
    </div>
  </div>
)
