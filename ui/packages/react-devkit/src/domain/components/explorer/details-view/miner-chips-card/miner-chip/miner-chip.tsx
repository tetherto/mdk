import { formatNumber, UNITS } from '@primitives'
import './miner-chip.scss'

type MinerChipProps = {
  /** Chip slot index */
  index: number
  /** Current frequency in MHz */
  frequency: {
    current: number
  }
  /** Temperature readings in °C */
  temperature: {
    avg: number
    min: number
    max: number
  }
}

/**
 * Chip representing a single miner; surfaces slot index, temperature, and frequency.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
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
